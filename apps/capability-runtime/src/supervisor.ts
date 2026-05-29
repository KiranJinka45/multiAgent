import { spawn, execSync, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { serverConfig } from '@packages/config';
import { logger } from '@packages/observability';
import { GovernanceSdkClient, GovernanceEventType } from '@packages/governance-sdk';

import crypto from 'crypto';
import { ThresholdCrypto } from '@packages/ztan-crypto';
import { EnvironmentFingerprint, DependencyProvenance, MerkleTree } from '@packages/supply-chain';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let preloadPath = path.resolve(__dirname, 'preload-isolation.cjs');
if (!fs.existsSync(preloadPath)) {
  preloadPath = path.resolve(__dirname, '../dist/preload-isolation.cjs');
}

export interface ExecuteParams {
  executionId: string;
  script: string;
  capabilityToken: string;
}

export interface ExecuteResult {
  success: boolean;
  executionId: string;
  status: 'completed' | 'failed' | 'terminated' | 'running';
  output: string;
  error?: string;
  violations: string[];
  attestation?: any;
}

export interface ActiveExecution {
  executionId: string;
  process: ChildProcess;
  startTime: number;
  cpuLimit: number;
  memoryLimitMb: number;
  timeoutMs: number;
  status: 'running' | 'completed' | 'failed' | 'terminated';
  violations: string[];
  outputBuffer: string[];
  errorBuffer: string[];
}

class CapabilityRuntimeSupervisor {
  private activeExecutions = new Map<string, ActiveExecution>();
  private ledgerClient = new GovernanceSdkClient();

  /**
   * Verify signed JWT capability token and extract constraints.
   */
  public verifyCapabilityToken(token: string): {
    executionId: string;
    capabilities: string[];
    cpuLimit: number;
    memoryLimitMb: number;
    timeoutMs: number;
    sandboxTier: string;
  } {
    try {
      const decoded = jwt.verify(token, serverConfig.JWT_SECRET) as any;
      if (!decoded || !decoded.executionId || !Array.isArray(decoded.capabilities)) {
        throw new Error('Invalid token payload structure');
      }

      // Default limits if not specified in token
      let cpuLimit = 100; // max 100% CPU
      let memoryLimitMb = 512; // max 512MB
      let timeoutMs = 30000; // default 30s timeout
      let sandboxTier = 'tier0';

      for (const cap of decoded.capabilities) {
        if (cap.startsWith('sandbox.cpu:')) {
          cpuLimit = parseInt(cap.split(':')[1], 10) || 100;
        } else if (cap.startsWith('sandbox.memory:')) {
          memoryLimitMb = parseInt(cap.split(':')[1], 10) || 512;
        } else if (cap.startsWith('sandbox.timeout:')) {
          timeoutMs = parseInt(cap.split(':')[1], 10) || 30000;
        } else if (cap.startsWith('sandbox.tier:')) {
          sandboxTier = cap.split(':')[1] || 'tier0';
        }
      }

      // Enforce strict tier check
      if (sandboxTier !== 'tier0') {
        if (process.env.STRICT_TIER_ENFORCEMENT === 'true') {
          throw new Error(`Execution rejected: sandboxTier "${sandboxTier}" requested, but only "tier0" (preload-isolation) is available on this environment`);
        } else {
          logger.warn(`[Supervisor] Sandbox tier downgrade: requested "${sandboxTier}", falling back to "tier0" (preload-isolation)`);
        }
      }

      return {
        executionId: decoded.executionId,
        capabilities: decoded.capabilities,
        cpuLimit,
        memoryLimitMb,
        timeoutMs,
        sandboxTier
      };
    } catch (e: any) {
      logger.error({ err: e.message }, '[Supervisor] JWT capability token verification failed');
      throw new Error(`Token verification failed: ${e.message}`);
    }
  }

  /**
   * Scans sandbox directory and calculates SHA-256 for all files.
   */
  private gatherOutputArtifacts(sandboxDir: string): { path: string; sha256: string }[] {
    const list: { path: string; sha256: string }[] = [];
    if (!fs.existsSync(sandboxDir)) return list;

    const getFileSha256 = (filePath: string): string => {
      const data = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(data).digest('hex');
    };

    const scanDir = (dir: string, baseDir: string): void => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          scanDir(fullPath, baseDir);
        } else {
          if (item.name === 'script.cjs') continue;
          const relative = path.relative(baseDir, fullPath).replace(/\\/g, '/');
          list.push({
            path: relative,
            sha256: getFileSha256(fullPath)
          });
        }
      }
    };

    scanDir(sandboxDir, sandboxDir);
    return list;
  }

  /**
   * Safe execution entry point. Spawns isolated node process.
   */
  public async execute(params: ExecuteParams): Promise<ExecuteResult> {
    const { executionId, script, capabilityToken } = params;

    // 1. Verify capability token
    const tokenInfo = this.verifyCapabilityToken(capabilityToken);
    if (tokenInfo.executionId !== executionId) {
      throw new Error('Token executionId mismatch with request parameters');
    }

    // 2. Set up ephemeral sandbox workspace directory
    const sandboxDir = path.resolve(process.cwd(), 'temp', `sandbox-${executionId}`);
    if (!fs.existsSync(sandboxDir)) {
      fs.mkdirSync(sandboxDir, { recursive: true });
    }

    const scriptPath = path.join(sandboxDir, 'script.cjs');
    fs.writeFileSync(scriptPath, script);

    // 3. Emit capability.granted to the Governance Ledger
    await this.emitGovernanceEvent(executionId, GovernanceEventType.CAPABILITY_GRANTED, {
      capabilities: tokenInfo.capabilities,
      cpuLimit: tokenInfo.cpuLimit,
      memoryLimitMb: tokenInfo.memoryLimitMb,
      timeoutMs: tokenInfo.timeoutMs,
      sandboxDir
    });

    // 4. Spawn child process with preload containment
    const isTier1 = tokenInfo.sandboxTier === 'tier1';
    let spawnArgs = ['--require', preloadPath, scriptPath];
    let spawnEnv: Record<string, string> = {};

    if (isTier1) {
      // Whitelist only essential system variables to isolate process environment
      const whitelist = ['PATH', 'SystemRoot', 'TEMP', 'TMP', 'USERPROFILE', 'HOMEPATH', 'USERNAME'];
      for (const key of whitelist) {
        if (process.env[key]) {
          spawnEnv[key] = process.env[key]!;
        }
      }
      spawnEnv.CAPABILITY_MANIFEST_JSON = JSON.stringify({
        executionId,
        capabilities: tokenInfo.capabilities
      });
      spawnEnv.ZTAN_HARDENED_ISOLATION = 'true';
      spawnEnv.BLOCKED_NETWORK = 'true';

      // Drop dynamic code compilation & enforce runtime warnings suppression
      spawnArgs = ['--disallow-code-generation-from-strings', '--no-deprecation', '--require', preloadPath, scriptPath];
      
      logger.info({ executionId }, '[Supervisor] Enforcing Tier 1 Hardened Process Isolation constraints');
      await this.emitGovernanceEvent(executionId, 'sandbox.tier1.enforced' as any, {
        sandboxTier: 'tier1',
        restrictions: ['env_scrubbed', 'network_blocked', 'dynamic_eval_disabled', 'syscall_restricted']
      });
    } else {
      spawnEnv = {
        ...process.env,
        CAPABILITY_MANIFEST_JSON: JSON.stringify({
          executionId,
          capabilities: tokenInfo.capabilities
        })
      };
    }

    logger.info({ executionId, scriptPath, tier: tokenInfo.sandboxTier }, '[Supervisor] Spawning isolated runtime worker');

    const child = spawn('node', spawnArgs, {
      env: spawnEnv,
      cwd: sandboxDir,
      stdio: 'pipe'
    });

    const activeExec: ActiveExecution = {
      executionId,
      process: child,
      startTime: Date.now(),
      cpuLimit: tokenInfo.cpuLimit,
      memoryLimitMb: tokenInfo.memoryLimitMb,
      timeoutMs: tokenInfo.timeoutMs,
      status: 'running',
      violations: [],
      outputBuffer: [],
      errorBuffer: []
    };

    this.activeExecutions.set(executionId, activeExec);

    // Capture stdout/stderr streams
    child.stdout?.on('data', (data) => {
      activeExec.outputBuffer.push(data.toString());
    });

    child.stderr?.on('data', (data) => {
      const str = data.toString();
      activeExec.errorBuffer.push(str);

      // Inspect for capability violations
      if (str.includes('[CAPABILITY_VIOLATION]')) {
        const violation = str.split('[CAPABILITY_VIOLATION]')[1]?.trim() || 'Fs/Network/Subprocess violation';
        activeExec.violations.push(violation);
        
        // Log capability.denied immediately to ledger
        this.emitGovernanceEvent(executionId, GovernanceEventType.CAPABILITY_DENIED, {
          violation,
          rawError: str
        }).catch(err => logger.error({ err: err.message }, 'Failed to emit violation to ledger'));
      }
    });

    // Start watchdogs for resource budgets
    const watchdogInterval = setInterval(() => {
      this.runWatchdog(executionId, watchdogInterval);
    }, 500);

    return new Promise((resolve) => {
      child.on('close', async (code) => {
        clearInterval(watchdogInterval);

        // 1. Gather output artifacts before sandbox directory is deleted
        const outputArtifacts = this.gatherOutputArtifacts(sandboxDir);

        // Clean up sandbox directory (ephemeral workspace lifecycle)
        try {
          if (fs.existsSync(sandboxDir)) {
            fs.rmSync(sandboxDir, { recursive: true, force: true });
          }
        } catch (e: any) {
          logger.warn({ err: e.message }, '[Supervisor] Failed to clean up sandbox directory');
        }

        const success = code === 0 && activeExec.violations.length === 0;
        const finalStatus = activeExec.status === 'terminated' 
          ? 'terminated' 
          : (success ? 'completed' : 'failed');

        activeExec.status = finalStatus;

        // Build Attestation Receipt Record
        const rawManifest = JSON.stringify(tokenInfo.capabilities.sort());
        const capabilityManifestHash = crypto.createHash('sha256').update(rawManifest).digest('hex');
        const policyHash = crypto.createHash('sha256').update(rawManifest).digest('hex');

        let resourceOutcome: 'success' | 'timeout_exceeded' | 'memory_exceeded' | 'terminated_by_operator' | 'failed' = 'success';
        if (finalStatus === 'terminated') {
          if (activeExec.violations.some(v => v.includes('timeout'))) {
            resourceOutcome = 'timeout_exceeded';
          } else if (activeExec.violations.some(v => v.includes('memory') || v.includes('Memory'))) {
            resourceOutcome = 'memory_exceeded';
          } else {
            resourceOutcome = 'terminated_by_operator';
          }
        } else if (finalStatus === 'failed') {
          resourceOutcome = 'failed';
        }

        // ─── Stage 9 Upgrade: Merkle Tree of Output Artifacts ───
        const merkleResult = MerkleTree.buildMerkleTree(outputArtifacts);
        const artifactMerkleRoot = merkleResult.rootHash;
        const artifactMerkleManifest = merkleResult.manifest;

        // ─── Stage 9 Upgrade: Environment Fingerprint & Dependency Provenance ───
        const environmentFingerprint = EnvironmentFingerprint.gather(
          preloadPath,
          __filename,
          tokenInfo.capabilities
        );

        const depProv = await DependencyProvenance.generate(process.cwd());

        const attestation: any = {
          schemaVersion: 'ztan.attestation.v2',
          executionId,
          sandboxTier: tokenInfo.sandboxTier,
          capabilityManifestHash,
          runtimeVersion: '1.0.0',
          policyHash,
          resourceOutcome,
          terminationReason: activeExec.violations.join('; ') || 'completed',
          environmentFingerprint,
          dependencyProvenance: {
            packageLockFingerprint: depProv.sbom.packageLockFingerprint,
            packageJsonFingerprint: depProv.sbom.packageJsonFingerprint,
            sbomHash: depProv.sbomHash,
            sbomSignature: depProv.sbomSignature
          },
          artifactMerkleRoot,
          artifactMerkleManifest,
          lineageChain: {
            previousExecutionId: null,
            parentEventHash: null
          }
        };

        // Generate Canonical hash representation of fields for signing
        const canonicalString = `${attestation.schemaVersion}:${attestation.executionId}:${attestation.sandboxTier}:${attestation.capabilityManifestHash}:${attestation.policyHash}:${attestation.resourceOutcome}:${attestation.terminationReason}:${attestation.environmentFingerprint.fingerprintHash}:${attestation.dependencyProvenance.sbomHash}:${attestation.artifactMerkleRoot}`;
        const receiptHash = crypto.createHash('sha256').update(canonicalString).digest('hex');

        // Cryptographically sign the receipt with BLS using Identity 'RUNTIME-NODE-01'
        let signature = '';
        try {
          signature = await ThresholdCrypto.signAnchor(receiptHash, 'RUNTIME-NODE-01');
          
          // Request independent co-signing from Detached Witness Authority
          const witnessUrl = `${process.env.GOVERNANCE_LEDGER_URL || 'http://localhost:3105'}/api/v1/witness/co-sign`;
          attestation.signature = signature;
          
          const coSignRes = await globalThis.fetch(witnessUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ receipt: attestation })
          });
          
          if (coSignRes.ok) {
            const data = await coSignRes.json() as any;
            if (data.status === 'CO_SIGNED' && data.aggregateSignature) {
              signature = data.aggregateSignature;
              logger.info({ executionId }, '[Supervisor] Threshold aggregated signature co-signed by Detached Witness');
            }
          } else {
            logger.warn({ executionId }, '[Supervisor] Detached Witness co-signature unavailable, falling back to single-node signature');
          }
        } catch (e: any) {
          logger.error({ err: e.message }, 'Failed to sign execution attestation receipt');
        }
        attestation.signature = signature;

        // ─── Stage 10 Upgrade: Hermetic Replay Package ───
        const envSnapshot: Record<string, string> = {};
        const envWhitelist = ['PATH', 'SystemRoot', 'TEMP', 'TMP', 'USERPROFILE', 'HOMEPATH', 'USERNAME'];
        for (const key of envWhitelist) {
          if (process.env[key]) {
            envSnapshot[key] = process.env[key]!;
          }
        }

        const replayPackage = {
          executionId,
          inputIntent: { script },
          capabilityManifest: tokenInfo.capabilities,
          policySnapshot: {
            cpuLimit: tokenInfo.cpuLimit,
            memoryLimitMb: tokenInfo.memoryLimitMb,
            timeoutMs: tokenInfo.timeoutMs,
            sandboxTier: tokenInfo.sandboxTier
          },
          environmentFingerprint,
          dependencyProvenance: depProv.sbom,
          runtimeImageHash: environmentFingerprint.runtimeImageHash,
          envSnapshot,
          syscallPolicy: tokenInfo.sandboxTier === 'tier1' 
            ? ['network_disabled', 'dynamic_eval_blocked', 'env_scrubbed', 'filesystem_confined']
            : ['filesystem_confined'],
          clockSnapshot: {
            timestamp: Date.now(),
            timezoneOffset: new Date().getTimezoneOffset()
          },
          runtimeConfig: {
            strictTierEnforcement: process.env.STRICT_TIER_ENFORCEMENT === 'true'
          }
        };

        // Emit execution.replay.stored to ledger
        await this.emitGovernanceEvent(executionId, 'execution.replay.stored', replayPackage);

        // Emit execution.attestation.created to ledger
        await this.emitGovernanceEvent(executionId, GovernanceEventType.EXECUTION_ATTESTATION_CREATED, attestation);

        // Emit final execution outcome to ledger
        await this.emitGovernanceEvent(executionId, GovernanceEventType.EXECUTION_FINALIZED, {
          status: finalStatus,
          exitCode: code,
          violations: activeExec.violations,
          elapsedMs: Date.now() - activeExec.startTime
        });

        resolve({
          success,
          executionId,
          status: finalStatus,
          output: activeExec.outputBuffer.join(''),
          error: activeExec.errorBuffer.join(''),
          violations: activeExec.violations,
          attestation
        });

        this.activeExecutions.delete(executionId);
      });
    });
  }

  /**
   * Terminate active execution by ID.
   */
  public async terminate(executionId: string): Promise<boolean> {
    const active = this.activeExecutions.get(executionId);
    if (!active) return false;

    logger.warn({ executionId }, '[Supervisor] Forcefully terminating execution runtime sandbox');
    active.status = 'terminated';
    active.process.kill('SIGKILL');

    await this.emitGovernanceEvent(executionId, GovernanceEventType.SANDBOX_TERMINATED, {
      reason: 'Operator termination requested'
    });

    return true;
  }

  /**
   * Retrieve active status and metrics of execution ID.
   */
  public getStatus(executionId: string) {
    const active = this.activeExecutions.get(executionId);
    if (!active) return null;

    const metrics = this.getProcessMetrics(active.process.pid || 0);

    return {
      executionId,
      status: active.status,
      elapsedMs: Date.now() - active.startTime,
      cpuPercent: metrics.cpu,
      memoryMb: metrics.memoryMb,
      violations: active.violations
    };
  }

  /**
   * Resource budgets and timeout watchdogs.
   */
  private async runWatchdog(executionId: string, intervalId: NodeJS.Timeout) {
    const active = this.activeExecutions.get(executionId);
    if (!active || active.status !== 'running') {
      clearInterval(intervalId);
      return;
    }

    const elapsed = Date.now() - active.startTime;

    // 1. Timeout Check
    if (elapsed > active.timeoutMs) {
      clearInterval(intervalId);
      logger.warn({ executionId }, '[Supervisor] Watchdog triggered: Execution timeout exceeded budget limit');
      active.violations.push(`Execution timeout exceeded limit of ${active.timeoutMs}ms`);
      
      await this.emitGovernanceEvent(executionId, GovernanceEventType.RESOURCE_EXCEEDED, {
        limitType: 'timeout',
        limitValue: active.timeoutMs,
        actualValue: elapsed
      });

      this.terminate(executionId).catch(err => logger.error({ err: err.message }, 'Failed to terminate sandbox'));
      return;
    }

    // 2. Memory & Process Metrics Check
    if (active.process.pid) {
      const metrics = this.getProcessMetrics(active.process.pid);
      if (metrics.memoryMb > active.memoryLimitMb) {
        clearInterval(intervalId);
        logger.warn({ executionId, memoryMb: metrics.memoryMb }, '[Supervisor] Watchdog triggered: Memory budget ceiling exceeded');
        active.violations.push(`Memory limit exceeded: ${metrics.memoryMb}MB (limit: ${active.memoryLimitMb}MB)`);

        await this.emitGovernanceEvent(executionId, GovernanceEventType.RESOURCE_EXCEEDED, {
          limitType: 'memory',
          limitValue: active.memoryLimitMb,
          actualValue: metrics.memoryMb
        });

        this.terminate(executionId).catch(err => logger.error({ err: err.message }, 'Failed to terminate sandbox'));
      }
    }
  }

  /**
   * Poll metrics using system commands (Windows tasklist, Linux ps).
   */
  private getProcessMetrics(pid: number): { cpu: number; memoryMb: number } {
    if (!pid) return { cpu: 0, memoryMb: 0 };
    try {
      if (process.platform === 'win32') {
        const output = execSync(`tasklist /FO CSV /NH /FI "PID eq ${pid}"`).toString();
        const parts = output.split(',');
        if (parts.length >= 5) {
          const memStr = parts[4].replace(/"/g, '').replace(/ K/g, '').replace(/,/g, '').trim();
          const memKb = parseInt(memStr, 10);
          return { cpu: 0, memoryMb: isNaN(memKb) ? 0 : memKb / 1024 };
        }
      } else {
        const output = execSync(`ps -p ${pid} -o %cpu,rss --no-headers`).toString();
        const parts = output.trim().split(/\s+/);
        if (parts.length >= 2) {
          const cpu = parseFloat(parts[0]);
          const rssKb = parseInt(parts[1], 10);
          return { cpu, memoryMb: isNaN(rssKb) ? 0 : rssKb / 1024 };
        }
      }
    } catch (e) {
      // Process might have terminated
    }
    return { cpu: 0, memoryMb: 0 };
  }

  /**
   * Send audit events to the Governance Ledger.
   */
  private async emitGovernanceEvent(correlationId: string, eventType: GovernanceEventType, payload: any) {
    try {
      await this.ledgerClient.emitEvent({
        eventType,
        correlationId,
        service: 'capability-runtime',
        payload
      });
      logger.info({ correlationId, eventType }, '[Supervisor] Governance audit record successfully emitted');
    } catch (err: any) {
      logger.warn({ correlationId, eventType, err: err.message }, '[Supervisor] Failed to record governance event');
    }
  }
}

export const supervisor = new CapabilityRuntimeSupervisor();

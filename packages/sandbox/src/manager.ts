import { 
  SandboxProfile, 
  SandboxExecutionResult, 
  SandboxRuntimeClass,
  ISandboxProvider,
  SandboxInstance,
  SandboxWorkload,
  SandboxLifecycleState
} from './types';
import { logger } from '../../observability/src';
import { CanonicalReplayLayer } from './canonical';
import { ExecutionFinalityEngine } from './finality';
import * as crypto from 'crypto';

/**
 * 🛡️ SandboxManager (Sovereign Orchestrator)
 * Manages the registration of ISandboxProviders and delegates the lifecycle 
 * of isolated environments.
 * 
 * Mandate:
 * 1. Maintain runtime-agnostic orchestration logic.
 * 2. Enforce unified replay telemetry across all providers.
 * 3. Act as the central registry for gVisor, Firecracker, etc.
 */
export class SandboxManager {
  private providers: Map<SandboxRuntimeClass, ISandboxProvider> = new Map();
  private activeSandboxes: Map<string, { profile: SandboxProfile; instance: SandboxInstance }> = new Map();

  /**
   * Register a runtime-specific provider.
   */
  registerProvider(provider: ISandboxProvider): void {
    logger.info({ runtime: provider.runtimeClass }, '[SandboxManager] Registering runtime provider');
    this.providers.set(provider.runtimeClass, provider);
  }

  /**
   * Provision a new sandbox using the appropriate provider.
   */
  async provision(profile: SandboxProfile): Promise<SandboxInstance> {
    const provider = this.getProvider(profile.runtime);
    
    logger.info({ 
      sandboxId: profile.id, 
      runtime: profile.runtime 
    }, '[SandboxManager] Delegating provision to provider');

    const instance = await provider.provision(profile);
    this.activeSandboxes.set(profile.id, { profile, instance });
    
    return instance;
  }

  /**
   * Execute a workload within the specified sandbox.
   * Replay hashes are calculated here (ABOVE the provider layer).
   */
  async execute(
    sandboxId: string, 
    workload: SandboxWorkload
  ): Promise<SandboxExecutionResult> {
    const entry = this.activeSandboxes.get(sandboxId);
    if (!entry) throw new Error(`[SandboxManager] Sandbox not found: ${sandboxId}`);

    const provider = this.getProvider(entry.profile.runtime);

    // 🛡️ REPLAY SEMANTICS: Calculate hashes ABOVE the provider using Canonical Layer
    const mountHash = CanonicalReplayLayer.hashMounts(entry.profile.mounts);
    const executionHash = CanonicalReplayLayer.hashWorkload(workload);
    
    logger.info({ sandboxId, executionHash }, '[SandboxManager] Executing workload with canonical lineage verification');

    const result = await provider.execute(sandboxId, workload);

    // 🛡️ REPLAY NORMALIZATION: Ensure provider noise doesn't bleed into the audit log
    const normalizedResult = {
      ...result,
      metadata: {
        ...result.metadata,
        mountHash,
        executionHash,
        canonicalLineage: CanonicalReplayLayer.canonicalize({
          mountHash,
          executionHash,
          exitCode: result.exitCode,
          securityEvent: result.metadata.securityEvent
        })
      }
    };

    if (entry) {
      entry.instance.state = "COMPLETED";
    }

    return normalizedResult;
  }

  /**
   * Finalizes an execution and prepares the immutable envelope for signing.
   * MUST be called after destroy() to ensure teardown was successful.
   */
  async finalizeExecution(missionId: string, sandboxId: string, result: SandboxExecutionResult): Promise<any> {
    const entry = this.activeSandboxes.get(sandboxId);
    
    // Note: In a real system, we would keep a historical log of COMPLETED/TERMINATED instances
    // for finalization even if they are removed from activeSandboxes.
    // For now, we assume destroy() hasn't purged it yet, or we use the result.

    const envelope = ExecutionFinalityEngine.finalize(missionId, result, true);
    
    if (entry) {
      entry.instance.state = "FINALIZED";
    }
    
    return envelope;
  }

  /**
   * Teardown and destroy the sandbox environment.
   */
  async destroy(sandboxId: string): Promise<void> {
    const entry = this.activeSandboxes.get(sandboxId);
    if (!entry) return;

    const provider = this.getProvider(entry.profile.runtime);
    logger.info({ sandboxId }, '[SandboxManager] Initiating cleanup via provider');
    
    await provider.destroy(sandboxId);
    this.activeSandboxes.delete(sandboxId);
  }

  private getProvider(runtime: SandboxRuntimeClass): ISandboxProvider {
    const provider = this.providers.get(runtime);
    if (!provider) {
      throw new Error(`[SandboxManager] No provider registered for runtime: ${runtime}`);
    }
    return provider;
  }

  private calculateMountHash(mounts: ReadonlyArray<any>): string {
    const sortedMounts = [...mounts].sort((a, b) => a.target.localeCompare(b.target));
    return crypto.createHash('sha256')
      .update(JSON.stringify(sortedMounts))
      .digest('hex');
  }
}

/**
 * 🛠️ MockProvider
 * Satisfies the ISandboxProvider interface for architectural validation.
 */
export class MockProvider implements ISandboxProvider {
  constructor(public readonly runtimeClass: SandboxRuntimeClass) {}

  async provision(profile: SandboxProfile): Promise<SandboxInstance> {
    return {
      id: profile.id,
      state: "READY",
      metadata: { createdAt: new Date().toISOString() }
    };
  }

  async execute(sandboxId: string, workload: SandboxWorkload): Promise<SandboxExecutionResult> {
    const adversarialPatterns = ['../', ':(){', '/etc/', '/proc/', '/sys/', 'google.com', '169.254.169.254'];
    const isAdversarial = workload.command === 'curl' || 
                          workload.command === 'nslookup' ||
                          workload.args?.some(a => adversarialPatterns.some(p => a.includes(p)));

    if (isAdversarial) {
      return {
        executionId: crypto.randomUUID(),
        exitCode: 1,
        stdout: "",
        stderr: `🛡️ [DETECTION] Isolation violation blocked: Access to ${workload.command} or forbidden paths is restricted.`,
        metadata: {
          sandboxId,
          runtimeClass: this.runtimeClass,
          mountHash: "",
          executionHash: "",
          timestamp: new Date().toISOString(),
          securityEvent: "POLICY_VIOLATION"
        }
      };
    }

    return {
      executionId: crypto.randomUUID(),
      exitCode: 0,
      stdout: "Mock execution successful",
      stderr: "",
      metadata: {
        sandboxId,
        runtimeClass: this.runtimeClass,
        mountHash: "",
        executionHash: "",
        timestamp: new Date().toISOString()
      }
    };
  }

  async destroy(sandboxId: string): Promise<void> {
    logger.debug({ sandboxId }, '[MockProvider] Mock destruction');
  }

  async *telemetry(sandboxId: string): AsyncIterable<SandboxTelemetry> {
    yield { timestamp: new Date().toISOString(), level: "info", message: "Mock telemetry stream started" };
  }
}

import { GVisorProvider } from './providers/gvisor';
import { FirecrackerProvider } from './providers/firecracker';

export const sandboxManager = new SandboxManager();

// Register production providers
sandboxManager.registerProvider(new GVisorProvider());
sandboxManager.registerProvider(new FirecrackerProvider());
// Keep docker as a mock for local dev if needed, or implement it too.
sandboxManager.registerProvider(new MockProvider("docker"));

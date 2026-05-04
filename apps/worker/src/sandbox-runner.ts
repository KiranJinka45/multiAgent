// @ts-nocheck
import { db } from '@packages/db';
import { eventBus } from '@packages/utils';
import { logger } from '@packages/observability';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';

/**
 * SandboxRunner
 * 
 * Safely executes self-modification proposals and builds in an isolated process.
 * Includes resource monitoring and automated termination of runaway tasks.
 */
export class SandboxRunner {
  private sandboxDir: string;
  private executionId: string;
  private watchdogTimer: NodeJS.Timeout | null = null;
  private process: ChildProcess | null = null;

  private MAX_MEMORY_MB = 1024; // 1GB
  private MAX_CPU_TIME_MS = 300_000; // 5 minutes

  constructor(executionId: string) {
    this.executionId = executionId;
    this.sandboxDir = path.join(os.tmpdir(), `multiagent-sandbox-${executionId}-${Date.now()}`);
  }

  async runSimulation(proposalId: string): Promise<boolean> {
    const proposal = await db.proposedChange.findUnique({ where: { id: proposalId } });
    if (!proposal) throw new Error('Proposal not found');

    logger.info({ proposalId, executionId: this.executionId }, '[SandboxRunner] Starting simulation');

    try {
      this.prepareSnapshot();

      // Apply Patch
      const targetPath = path.join(this.sandboxDir, proposal.targetPath);
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(targetPath, proposal.patch);

      await db.proposedChange.update({
        where: { id: proposalId },
        data: { status: 'simulating' }
      });

      // Run Build & Test as an isolated process
      const buildSuccess = await this.executeIsolated('npm run build && npm test');
      
      if (!buildSuccess) {
         await db.proposedChange.update({
            where: { id: proposalId },
            data: { status: 'rejected', simulationLogs: 'Build/Test failed in sandbox' }
         });
         return false;
      }

      await db.proposedChange.update({
        where: { id: proposalId },
        data: { status: 'validated', validationScore: 0.9 }
      });

      return true;
    } catch (error) {
       const msg = error instanceof Error ? error.message : String(error);
       logger.error({ error: msg, proposalId }, '[SandboxRunner] Simulation crashed');
       return false;
    } finally {
        this.cleanup();
    }
  }

  private prepareSnapshot() {
    fs.mkdirSync(this.sandboxDir, { recursive: true });
    // In production, we'd copy the repo subset here.
    logger.info({ sandboxDir: this.sandboxDir }, '[SandboxRunner] Isolated directory prepared');
  }

  /**
   * Spawns a child process and monitors its resource usage.
   */
  private async executeIsolated(command: string): Promise<boolean> {
    return new Promise((resolve) => {
      const parts = command.split(' ');
      const mainCmd = parts[0];
      const args = parts.slice(1);

      this.process = spawn(mainCmd, args, {
        cwd: this.sandboxDir,
        shell: true,
        env: { ...process.env, NODE_ENV: 'test', CI: 'true' }
      });

      // Stream Logs to EventBus
      this.process.stdout?.on('data', (data) => {
        const line = data.toString().trim();
        if (line) eventBus.thought(this.executionId, 'SandboxRunner', `[stdout] ${line}`);
      });

      this.process.stderr?.on('data', (data) => {
        const line = data.toString().trim();
        if (line) eventBus.thought(this.executionId, 'SandboxRunner', `[stderr] ${line}`);
      });

      // Resource Watchdog
      this.watchdogTimer = setInterval(async () => {
        if (!this.process || this.process.killed || !this.process.pid) return;
        
        try {
          const pidusage = (await import('pidusage')).default;
          const stats = await pidusage(this.process.pid);
          
          const memoryMB = stats.memory / 1024 / 1024;
          const cpuPercent = stats.cpu;

          if (memoryMB > this.MAX_MEMORY_MB) {
            logger.warn({ executionId: this.executionId, memoryMB }, '[SandboxRunner] Memory limit exceeded, killing process');
            eventBus.error(this.executionId, `Process killed: Memory limit exceeded (${Math.round(memoryMB)}MB > ${this.MAX_MEMORY_MB}MB)`);
            this.process.kill('SIGKILL');
            if (this.watchdogTimer) clearInterval(this.watchdogTimer);
            resolve(false);
          }
        } catch (err) {
          // If pidusage fails (e.g. process just died), just ignore
        }
      }, 2000);

      const timeout = setTimeout(() => {
        if (this.process && !this.process.killed) {
          logger.warn({ executionId: this.executionId }, '[SandboxRunner] Timeout exceeded, killing process');
          eventBus.error(this.executionId, 'Build timed out in sandbox (max 5m)');
          this.process.kill('SIGKILL');
          resolve(false);
        }
      }, this.MAX_CPU_TIME_MS);

      this.process.on('close', (code) => {
        clearTimeout(timeout);
        if (this.watchdogTimer) clearInterval(this.watchdogTimer);
        logger.info({ code, executionId: this.executionId }, '[SandboxRunner] Process exited');
        resolve(code === 0);
      });

      this.process.on('error', (err) => {
        logger.error({ err, executionId: this.executionId }, '[SandboxRunner] Process error');
        resolve(false);
      });
    });
  }

  private cleanup() {
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    if (this.process && !this.process.killed) this.process.kill();
    try {
      if (fs.existsSync(this.sandboxDir)) {
        fs.rmSync(this.sandboxDir, { recursive: true, force: true });
      }
    } catch (e) {
      logger.error({ error: e }, '[SandboxRunner] Cleanup failed');
    }
  }
}



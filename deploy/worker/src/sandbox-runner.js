"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SandboxRunner = void 0;
// @ts-nocheck
const db_1 = require("@packages/db");
const utils_1 = require("@packages/utils");
const observability_1 = require("@packages/observability");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
/**
 * SandboxRunner
 *
 * Safely executes self-modification proposals and builds in an isolated process.
 * Includes resource monitoring and automated termination of runaway tasks.
 */
class SandboxRunner {
    sandboxDir;
    executionId;
    watchdogTimer = null;
    process = null;
    MAX_MEMORY_MB = 1024; // 1GB
    MAX_CPU_TIME_MS = 300_000; // 5 minutes
    constructor(executionId) {
        this.executionId = executionId;
        this.sandboxDir = path.join(os.tmpdir(), `multiagent-sandbox-${executionId}-${Date.now()}`);
    }
    async runSimulation(proposalId) {
        const proposal = await db_1.db.proposedChange.findUnique({ where: { id: proposalId } });
        if (!proposal)
            throw new Error('Proposal not found');
        observability_1.logger.info({ proposalId, executionId: this.executionId }, '[SandboxRunner] Starting simulation');
        try {
            this.prepareSnapshot();
            // Apply Patch
            const targetPath = path.join(this.sandboxDir, proposal.targetPath);
            const targetDir = path.dirname(targetPath);
            if (!fs.existsSync(targetDir))
                fs.mkdirSync(targetDir, { recursive: true });
            fs.writeFileSync(targetPath, proposal.patch);
            await db_1.db.proposedChange.update({
                where: { id: proposalId },
                data: { status: 'simulating' }
            });
            // Run Build & Test as an isolated process
            const buildSuccess = await this.executeIsolated('npm run build && npm test');
            if (!buildSuccess) {
                await db_1.db.proposedChange.update({
                    where: { id: proposalId },
                    data: { status: 'rejected', simulationLogs: 'Build/Test failed in sandbox' }
                });
                return false;
            }
            await db_1.db.proposedChange.update({
                where: { id: proposalId },
                data: { status: 'validated', validationScore: 0.9 }
            });
            return true;
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            observability_1.logger.error({ error: msg, proposalId }, '[SandboxRunner] Simulation crashed');
            return false;
        }
        finally {
            this.cleanup();
        }
    }
    prepareSnapshot() {
        fs.mkdirSync(this.sandboxDir, { recursive: true });
        // In production, we'd copy the repo subset here.
        observability_1.logger.info({ sandboxDir: this.sandboxDir }, '[SandboxRunner] Isolated directory prepared');
    }
    /**
     * Spawns a child process and monitors its resource usage.
     */
    async executeIsolated(command) {
        return new Promise((resolve) => {
            const parts = command.split(' ');
            const mainCmd = parts[0];
            const args = parts.slice(1);
            this.process = (0, child_process_1.spawn)(mainCmd, args, {
                cwd: this.sandboxDir,
                shell: true,
                env: { ...process.env, NODE_ENV: 'test', CI: 'true' }
            });
            // Stream Logs to EventBus
            this.process.stdout?.on('data', (data) => {
                const line = data.toString().trim();
                if (line)
                    utils_1.eventBus.thought(this.executionId, 'SandboxRunner', `[stdout] ${line}`);
            });
            this.process.stderr?.on('data', (data) => {
                const line = data.toString().trim();
                if (line)
                    utils_1.eventBus.thought(this.executionId, 'SandboxRunner', `[stderr] ${line}`);
            });
            // Resource Watchdog
            this.watchdogTimer = setInterval(async () => {
                if (!this.process || this.process.killed || !this.process.pid)
                    return;
                try {
                    const pidusage = (await Promise.resolve().then(() => __importStar(require('pidusage')))).default;
                    const stats = await pidusage(this.process.pid);
                    const memoryMB = stats.memory / 1024 / 1024;
                    const cpuPercent = stats.cpu;
                    if (memoryMB > this.MAX_MEMORY_MB) {
                        observability_1.logger.warn({ executionId: this.executionId, memoryMB }, '[SandboxRunner] Memory limit exceeded, killing process');
                        utils_1.eventBus.error(this.executionId, `Process killed: Memory limit exceeded (${Math.round(memoryMB)}MB > ${this.MAX_MEMORY_MB}MB)`);
                        this.process.kill('SIGKILL');
                        if (this.watchdogTimer)
                            clearInterval(this.watchdogTimer);
                        resolve(false);
                    }
                }
                catch (err) {
                    // If pidusage fails (e.g. process just died), just ignore
                }
            }, 2000);
            const timeout = setTimeout(() => {
                if (this.process && !this.process.killed) {
                    observability_1.logger.warn({ executionId: this.executionId }, '[SandboxRunner] Timeout exceeded, killing process');
                    utils_1.eventBus.error(this.executionId, 'Build timed out in sandbox (max 5m)');
                    this.process.kill('SIGKILL');
                    resolve(false);
                }
            }, this.MAX_CPU_TIME_MS);
            this.process.on('close', (code) => {
                clearTimeout(timeout);
                if (this.watchdogTimer)
                    clearInterval(this.watchdogTimer);
                observability_1.logger.info({ code, executionId: this.executionId }, '[SandboxRunner] Process exited');
                resolve(code === 0);
            });
            this.process.on('error', (err) => {
                observability_1.logger.error({ err, executionId: this.executionId }, '[SandboxRunner] Process error');
                resolve(false);
            });
        });
    }
    cleanup() {
        if (this.watchdogTimer)
            clearInterval(this.watchdogTimer);
        if (this.process && !this.process.killed)
            this.process.kill();
        try {
            if (fs.existsSync(this.sandboxDir)) {
                fs.rmSync(this.sandboxDir, { recursive: true, force: true });
            }
        }
        catch (e) {
            observability_1.logger.error({ error: e }, '[SandboxRunner] Cleanup failed');
        }
    }
}
exports.SandboxRunner = SandboxRunner;
//# sourceMappingURL=sandbox-runner.js.map
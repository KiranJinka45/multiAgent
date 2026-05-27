import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

export interface LongHorizonRunnerConfig {
    durationMs: number;
    operationsPerSec: number;
    workspaceRoot: string;
}

/**
 * ─── ZTAN Long-Horizon Workload Runner ────────────────────────────────────────
 * Drives stable transactional outbox mutations over extended duration horizons
 * (24h/72h/7d) under Nominals, capturing continuous performance metrics.
 * ────────────────────────────────────────────────────────────────────────────
 */
export class LongHorizonRunner {
    private config: LongHorizonRunnerConfig;
    private prisma: PrismaClient;
    private running = false;
    private workloadTimer: NodeJS.Timeout | null = null;
    private transactionsCommitted = 0;
    private errorsLogged: string[] = [];
    private startTime: number | null = null;

    constructor(config: LongHorizonRunnerConfig) {
        this.config = config;
        this.prisma = new PrismaClient();
    }

    /**
     * Start the long-horizon workload generation
     */
    public async start(): Promise<void> {
        if (this.running) return;
        this.running = true;
        this.startTime = Date.now();
        this.transactionsCommitted = 0;
        this.errorsLogged = [];

        console.log(`[Long-Horizon Runner] Starting workload loop: Target ${this.config.operationsPerSec} ops/sec, Duration: ${this.config.durationMs}ms`);

        const intervalMs = Math.floor(1000 / this.config.operationsPerSec);
        let prevHash = 'sha256:0000000000000000000000000000000000000000000000000000000000000000';

        // Retrieve last hash to ensure cryptographic continuity
        try {
            const latestBlock = await this.prisma.ztanLedgerBlock.findFirst({
                orderBy: { id: 'desc' }
            });
            if (latestBlock) {
                prevHash = latestBlock.hash;
            }
        } catch (e: any) {
            this.errorsLogged.push(`[Bootstrap Error] Failed to resolve tail hash: ${e.message}`);
        }

        this.workloadTimer = setInterval(async () => {
            if (!this.running) return;

            const blockId = `long-block-${crypto.randomUUID()}`;
            const payload = JSON.stringify({
                timestamp: new Date().toISOString(),
                type: 'LONG_SOAK_HEARTBEAT',
                seq: this.transactionsCommitted
            });
            const operator = 'steward_omega';
            const signature = `sig:${crypto.createHash('sha256').update(payload).digest('hex')}`;
            const hash = crypto.createHash('sha256').update(blockId + prevHash + payload + operator).digest('hex');

            try {
                await this.prisma.ztanLedgerBlock.create({
                    data: {
                        blockId,
                        prevHash,
                        hash,
                        type: 'LONG_SOAK_MUTATION',
                        payload,
                        operator,
                        signature,
                        status: 'VERIFIED',
                        epoch: '0'
                    }
                });
                prevHash = hash;
                this.transactionsCommitted++;
            } catch (err: any) {
                this.errorsLogged.push(`[Workload Error] Write transaction failed: ${err.message}`);
            }
        }, intervalMs);
    }

    /**
     * Stop the long-horizon runner and disconnect DB clients
     */
    public async stop(): Promise<void> {
        this.running = false;
        if (this.workloadTimer) {
            clearInterval(this.workloadTimer);
            this.workloadTimer = null;
        }
        await this.prisma.$disconnect();
        console.log(`[Long-Horizon Runner] Workload loop stopped. Total transactions: ${this.transactionsCommitted}`);
    }

    /**
     * Retrieves runner execution stats
     */
    public getStats() {
        const elapsed = this.startTime ? Date.now() - this.startTime : 0;
        return {
            running: this.running,
            elapsedMs: elapsed,
            transactionsCommitted: this.transactionsCommitted,
            errorCount: this.errorsLogged.length,
            errors: this.errorsLogged.slice(-10) // tail 10 errors
        };
    }
}

import { PrismaClient } from '@prisma/client';

/**
 * ─── ZTAN Database Lock Contention Recorder ──────────────────────────────────
 * Samples storage transaction latencies and monitors database execution times
 * to record queue blockages and lock bottlenecks under load.
 * ────────────────────────────────────────────────────────────────────────────
 */

export class LockContentionRecorder {
    private prisma: PrismaClient;
    private lockWaitTimes: number[] = [];
    private blockInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.prisma = new PrismaClient();
    }

    public start() {
        // Sample database transaction execution times every 500ms
        this.blockInterval = setInterval(async () => {
            const start = Date.now();
            try {
                // Execute a lightweight query to sample database lock round-trips
                await this.prisma.$executeRawUnsafe('SELECT 1;');
                const duration = Date.now() - start;
                this.lockWaitTimes.push(duration);
            } catch (_e) {
                // Ignore temporary failures during injected chaos dropouts
            }
        }, 500);
    }

    public stop() {
        if (this.blockInterval) {
            clearInterval(this.blockInterval);
        }
        this.prisma.$disconnect();
    }

    public getStats() {
        const avgWait = this.lockWaitTimes.length > 0 
            ? this.lockWaitTimes.reduce((a, b) => a + b, 0) / this.lockWaitTimes.length 
            : 0;
        const maxWait = this.lockWaitTimes.length > 0 
            ? Math.max(...this.lockWaitTimes) 
            : 0;

        return {
            averageDbLatencyMs: parseFloat(avgWait.toFixed(2)),
            maxDbLatencyMs: maxWait,
            sampledTxCount: this.lockWaitTimes.length
        };
    }
}

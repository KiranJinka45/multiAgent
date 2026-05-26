import { PrismaClient } from '@prisma/client';
import { GcTelemetryRecorder } from './gc-telemetry-recorder.js';
import { LockContentionRecorder } from './lock-contention-recorder.js';
import { ParitySnapshotWorker } from './parity-snapshot-worker.js';
import { generateSoakReport } from './soak-report-generator.js';
import crypto from 'crypto';

/**
 * ─── ZTAN Continuous Soak Workload Runner ────────────────────────────────────
 * Drives stable transactional mutations through database proxies while actively
 * capturing memory slopes, GC pauses, lock contention, and Merkle integrity.
 * ────────────────────────────────────────────────────────────────────────────
 */

export class ContinuousSoakRunner {
    private durationMs: number;
    private workspaceRoot: string;
    private prisma: PrismaClient;
    private gcRecorder: GcTelemetryRecorder;
    private lockRecorder: LockContentionRecorder;
    private parityWorker: ParitySnapshotWorker;
    
    private running = false;
    private mutationTimer: NodeJS.Timeout | null = null;
    private errors: string[] = [];
    private quarantineCount = 0;

    constructor(workspaceRoot: string, durationMs = 5000) {
        this.workspaceRoot = workspaceRoot;
        this.durationMs = durationMs;
        
        this.prisma = new PrismaClient();
        this.gcRecorder = new GcTelemetryRecorder();
        this.lockRecorder = new LockContentionRecorder();
        this.parityWorker = new ParitySnapshotWorker();
    }

    /**
     * Start the continuous soak workload and telemetry trackers
     */
    public async run(): Promise<string> {
        console.log(`[Soak Runner] Starting continuous transactional soak (Duration: ${this.durationMs}ms)...`);
        this.running = true;

        // 1. Start background recording daemons
        this.gcRecorder.start();
        this.lockRecorder.start();
        this.parityWorker.start();

        const startTime = Date.now();
        let prevHash = 'sha256:0000000000000000000000000000000000000000000000000000000000000000';

        // Initialize prevHash with the latest block hash
        try {
            const latest = await this.prisma.ztanLedgerBlock.findFirst({
                orderBy: { id: 'desc' }
            });
            if (latest) {
                prevHash = latest.hash;
            }
        } catch (e) {}

        // 2. Continuous write loop (5 mutations per second = every 200ms)
        this.mutationTimer = setInterval(async () => {
            if (!this.running) return;

            const blockId = `soak-block-${crypto.randomUUID()}`;
            const payload = JSON.stringify({ timestamp: new Date().toISOString(), type: 'SOAK_HEARTBEAT' });
            const signature = `sig:${crypto.createHash('sha256').update(payload).digest('hex')}`;
            const operator = 'steward_omega';
            const hash = crypto.createHash('sha256').update(blockId + prevHash + payload + operator).digest('hex');

            try {
                await this.prisma.ztanLedgerBlock.create({
                    data: {
                        blockId,
                        prevHash,
                        hash,
                        type: 'SOAK_MUTATION',
                        payload,
                        operator,
                        signature,
                        status: 'VERIFIED',
                        epoch: '0'
                    }
                });
                prevHash = hash;
            } catch (err: any) {
                this.errors.push(`[SOAK_MUTATION_ERROR] Write failed: ${err.message}`);
                if (err.message.includes('Quarantine') || err.message.includes('quarantined')) {
                    this.quarantineCount++;
                }
            }
        }, 200);

        // 3. Keep running for the designated duration
        await new Promise(resolve => setTimeout(resolve, this.durationMs));

        // 4. Terminate and cleanup
        await this.stop();

        // 5. Generate and export the telemetry report
        const reportPath = generateSoakReport(this.workspaceRoot, {
            durationMs: this.durationMs,
            memoryStats: this.gcRecorder.getStats(),
            dbLatencyStats: this.lockRecorder.getStats(),
            parityHistory: this.parityWorker.getHistory(),
            errors: this.errors,
            quarantineCount: this.quarantineCount
        });

        return reportPath;
    }

    private async stop() {
        this.running = false;
        if (this.mutationTimer) {
            clearInterval(this.mutationTimer);
        }
        this.gcRecorder.stop();
        this.lockRecorder.stop();
        this.parityWorker.stop();
        await this.prisma.$disconnect();
        console.log('[Soak Runner] Workloads completed. Connections disconnected.');
    }
}

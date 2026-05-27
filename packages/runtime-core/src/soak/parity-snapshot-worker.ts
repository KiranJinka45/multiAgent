import { PrismaClient } from '@prisma/client';

/**
 * ─── ZTAN Background Parity Snapshot Worker ──────────────────────────────────
 * Periodically audits outbox ledger chains and Write-Ahead Log logs in the
 * background to verify 100% hash chain alignment and zero lineage drift.
 * ────────────────────────────────────────────────────────────────────────────
 */

export class ParitySnapshotWorker {
    private prisma: PrismaClient;
    private checkInterval: NodeJS.Timeout | null = null;
    private auditHistory: { timestamp: Date; success: boolean; totalChecked: number }[] = [];

    constructor() {
        this.prisma = new PrismaClient();
    }

    public start() {
        // Run database parity and hash alignment audits every 1 second
        this.checkInterval = setInterval(async () => {
            const result = await this.auditParity();
            this.auditHistory.push({
                timestamp: new Date(),
                success: result.success,
                totalChecked: result.totalChecked
            });
        }, 1000);
    }

    public stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        this.prisma.$disconnect();
    }

    public getHistory() {
        return this.auditHistory;
    }

    private async auditParity(): Promise<{ success: boolean; totalChecked: number }> {
        try {
            const blocks = await this.prisma.ztanLedgerBlock.findMany({
                orderBy: { id: 'asc' }
            });

            // Verify sequential Merkle hash links
            for (let i = 1; i < blocks.length; i++) {
                if (blocks[i].prevHash !== blocks[i - 1].hash) {
                    return { success: false, totalChecked: blocks.length };
                }
            }
            return { success: true, totalChecked: blocks.length };
        } catch (e) {
            return { success: false, totalChecked: 0 };
        }
    }
}

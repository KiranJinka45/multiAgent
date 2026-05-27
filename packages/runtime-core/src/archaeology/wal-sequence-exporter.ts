import { PrismaClient } from '@prisma/client';

/**
 * ─── ZTAN Database Outbox & WAL Sequence Exporter ───────────────────────────
 * Dumps and structures recent transaction records from database logs to support
 * chronological parity verifications during failure archaeology.
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface StorageSequenceExport {
    timestamp: string;
    walLogs: any[];
    ledgerBlocks: any[];
}

export async function exportRecentSequences(prisma: PrismaClient, limit = 10): Promise<StorageSequenceExport> {
    try {
        const walLogs = await prisma.ztanWalLog.findMany({
            orderBy: { seq: 'desc' },
            take: limit
        });

        const ledgerBlocks = await prisma.ztanLedgerBlock.findMany({
            orderBy: { id: 'desc' },
            take: limit
        });

        return {
            timestamp: new Date().toISOString(),
            walLogs,
            ledgerBlocks
        };
    } catch (e: any) {
        return {
            timestamp: new Date().toISOString(),
            walLogs: [],
            ledgerBlocks: []
        };
    }
}

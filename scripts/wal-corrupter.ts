import { PrismaClient } from '@prisma/client';

/**
 * ─── ZTAN WAL & Ledger Corrupter Sandboxing ─────────────────────────────────
 * Simulates raw physical storage bit-rot or local administrative tampering
 * by directly mutating committed outbox payload entries and hash chains.
 * ────────────────────────────────────────────────────────────────────────────
 */

async function corruptStorage() {
    console.log('⚡ Starting Storage WAL & Ledger Corrupter...');
    const prisma = new PrismaClient();

    try {
        // 1. Mutate latest committed ledger block's payload to simulate rot
        const latestBlock = await prisma.ztanLedgerBlock.findFirst({
            orderBy: { id: 'desc' }
        });

        if (latestBlock) {
            console.log(`[Corrupter] Identified latest block: ID ${latestBlock.id} (BlockId: ${latestBlock.blockId})`);
            
            // Bypass app triggers by executing raw update if we want to simulate direct disk manipulation
            await prisma.$executeRawUnsafe(`
                UPDATE "ZtanLedgerBlock"
                SET "payload" = '{"compromised_key": "rot_corrupted_value"}'
                WHERE "id" = ${latestBlock.id};
            `);
            console.log(`✅ Successfully mutated block ID ${latestBlock.id} payload directly in storage.`);
        } else {
            console.log('[Corrupter] No ledger blocks found to corrupt.');
        }

        // 2. Mutate WAL log payloads
        const latestWal = await prisma.ztanWalLog.findFirst({
            orderBy: { id: 'desc' }
        });

        if (latestWal) {
            console.log(`[Corrupter] Identified latest WAL entry: Seq ${latestWal.seq}`);
            await prisma.$executeRawUnsafe(`
                UPDATE "ZtanWalLog"
                SET "payload" = '{"broken": true'
                WHERE "id" = ${latestWal.id};
            `);
            console.log(`✅ Successfully mutated WAL entry Seq ${latestWal.seq} payload directly in storage.`);
        } else {
            console.log('[Corrupter] No WAL records found to corrupt.');
        }

    } catch (e: any) {
        console.error(`[Corrupter] Failed to inject storage corruption: ${e.message}`);
    } finally {
        await prisma.$disconnect();
    }
}

corruptStorage();

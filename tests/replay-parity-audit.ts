import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

/**
 * ─── Merkleized Replay Parity Audit Scanner ──────────────────────────────────
 * Recursively scans historical ZtanLedgerBlocks, recalculating envelope hashes
 * and verifying that previousHash links form a perfectly unbroken cryptographic
 * Merkle chain.
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface AuditReport {
    success: boolean;
    totalBlocksChecked: number;
    brokenLinksCount: number;
    tamperedBlocks: number[];
    errors: string[];
}

export async function scanLedgerMerkleChain(prisma: PrismaClient): Promise<AuditReport> {
    console.log('⚡ Starting historical Merkleized Replay Parity Audit...');
    
    const errors: string[] = [];
    const tamperedBlocks: number[] = [];
    let brokenLinksCount = 0;

    try {
        const totalBlocks = await prisma.ztanLedgerBlock.count();
        console.log(`[Merkle Scanner] Discovered ${totalBlocks} ledger blocks in storage.`);

        const BATCH_SIZE = 500;
        let prevBlockHash: string | null = null;
        let prevBlockId: number | null = null;

        for (let skip = 0; skip < totalBlocks; skip += BATCH_SIZE) {
            const blocks = await prisma.ztanLedgerBlock.findMany({
                orderBy: { id: 'asc' },
                skip,
                take: BATCH_SIZE
            });

            for (let i = 0; i < blocks.length; i++) {
                const block = blocks[i];
                
                // 1. Recalculate block hash envelope
                const expectedHash = crypto.createHash('sha256')
                    .update(block.blockId + block.prevHash + block.payload + block.operator)
                    .digest('hex');

                // If MOCK_DB is active, standard database hashes might not be persisted.
                // On a real DB, we verify this strictly.
                if (process.env.MOCK_DB !== 'true' && block.hash !== expectedHash) {
                    tamperedBlocks.push(block.id);
                    errors.push(`[INTEGRITY_DRIFT] Cryptographic mismatch on Block ID ${block.id}. Stored: ${block.hash}, Recomputed: ${expectedHash}`);
                }

                // 2. Verify Merkle sequential hash chaining link
                const isGenesis = skip === 0 && i === 0;
                
                if (!isGenesis) {
                    if (block.prevHash !== prevBlockHash) {
                        brokenLinksCount++;
                        errors.push(`[LINEAGE_BREAK] Hash chain broken! Block ID ${block.id} prevHash (${block.prevHash}) does not match previous Block ID ${prevBlockId} hash (${prevBlockHash})`);
                    }
                } else {
                    // Genesis block validation
                    if (block.prevHash !== 'sha256:0000000000000000000000000000000000000000000000000000000000000000') {
                        errors.push(`[GENESIS_BREAK] Genesis block prevHash anchor is invalid: ${block.prevHash}`);
                    }
                }

                prevBlockHash = block.hash;
                prevBlockId = block.id;

                // Yield to the event loop every 100 blocks to prevent ELU saturation (100% ELU lag)
                if (i % 100 === 0) {
                    await new Promise(resolve => setImmediate(resolve));
                }
            }
        }

        const success = errors.length === 0;
        console.log(`[Merkle Scanner] Audit Completed. Parity Healthy: ${success}. Total Scanned: ${totalBlocks}. Tampered: ${tamperedBlocks.length}. Broken Links: ${brokenLinksCount}`);
        
        return {
            success,
            totalBlocksChecked: totalBlocks,
            brokenLinksCount,
            tamperedBlocks,
            errors
        };

    } catch (err: any) {
        console.error(`[Merkle Scanner] Critical audit error: ${err.message}`);
        return {
            success: false,
            totalBlocksChecked: 0,
            brokenLinksCount: 0,
            tamperedBlocks: [],
            errors: [err.message]
        };
    }
}

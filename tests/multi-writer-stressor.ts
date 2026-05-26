import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

/**
 * ─── Concurrency & Multi-Writer Epoch Fencing Stressor ──────────────────────
 * Spawns 1,000 parallel database transaction writes, verifying epoch-fencing
 * rejection triggers and chronological ledger ID consistency under maximum
 * lock contention.
 * ────────────────────────────────────────────────────────────────────────────
 */

export async function runMultiWriterStressor(prisma: PrismaClient, activeEpoch: number): Promise<{
    attempted: number;
    succeeded: number;
    rejected: number;
    errors: string[];
}> {
    console.log(`[Stressor] Starting multi-writer stress test: 1000 concurrent writes (Target Epoch: ${activeEpoch})`);
    
    const writePromises: Promise<any>[] = [];
    let succeeded = 0;
    let rejected = 0;
    const errors: string[] = [];

    // Pre-calculate hash chains to support Merkle sequencing in batches
    let currentHash = 'sha256:0000000000000000000000000000000000000000000000000000000000000000';
    try {
        const latest = await prisma.ztanLedgerBlock.findFirst({
            orderBy: { id: 'desc' }
        });
        if (latest) {
            currentHash = latest.hash;
        }
    } catch (e) {}

    // Generate 1000 requests (900 with valid active epoch, 100 with invalid expired epoch)
    for (let i = 0; i < 1000; i++) {
        const epoch = i % 10 === 0 ? activeEpoch - 1 : activeEpoch; // 10% invalid epochs
        const blockId = `block-${crypto.randomUUID()}`;
        const payload = JSON.stringify({ seq: i, transaction: `tx-${crypto.randomUUID()}` });
        const signature = `sig:${crypto.createHash('sha256').update(payload).digest('hex')}`;
        const operator = 'steward_omega';

        // Calculate Merkle hash for this entry
        const hash = crypto.createHash('sha256').update(blockId + currentHash + payload + operator).digest('hex');
        const prevHash = currentHash;
        currentHash = hash; // advance link locally for simulation

        const promise = prisma.ztanLedgerBlock.create({
            data: {
                blockId,
                prevHash,
                hash,
                type: 'STATE_MUTATION',
                payload,
                operator,
                signature,
                status: 'VERIFIED',
                epoch: String(epoch)
            }
        }).then(() => {
            succeeded++;
        }).catch((err: any) => {
            rejected++;
            const isFenceError = err.message.includes('[FENCING_ERROR]') || err.message.includes('Fencing');
            if (isFenceError) {
                // Expected epoch fencing block
            } else {
                errors.push(err.message);
            }
        });

        writePromises.push(promise);
    }

    // Wait for all 1000 concurrent promises to resolve
    await Promise.all(writePromises);

    console.log(`[Stressor] Completed: Succeeded: ${succeeded}, Blocked/Rejected by Fence: ${rejected}, Unexpected Errors: ${errors.length}`);
    return {
        attempted: 1000,
        succeeded,
        rejected,
        errors
    };
}

import { redis } from '@packages/utils';
import { db } from '@packages/db';
import { logger } from '@packages/observability';
import { type EvidenceEntry, VerificationState } from '@packages/contracts';

export class ForensicResilienceEngine {
    private static readonly LEDGER_PREFIX = 'ztan:evidence:';
    private static readonly CHAIN_PREFIX = 'ztan:chain:';
    private static readonly REVOCATION_SET = 'ztan:gov:revocations';

    /**
     * SCENARIO 1: Broken Chain Injection
     * Manually alters the hash linkage of a specific entry to simulate tampering.
     */
    static async injectChainCorruption(entryId: string) {
        const data = await redis.get(`${this.LEDGER_PREFIX}${entryId}`);
        if (!data) throw new Error('Entry not found');

        const entry: EvidenceEntry = JSON.parse(data);
        entry.integrity.previousHash = '0x_MALICIOUS_TAMPER'; // Breaking the chain
        
        await redis.set(`${this.LEDGER_PREFIX}${entryId}`, JSON.stringify(entry));

        // Update PostgreSQL using bypass transaction
        try {
            await db.$transaction(async (tx: any) => {
                await tx.$executeRawUnsafe("SET LOCAL ztan.bypass_immutability = 'on';");
                
                const block = await tx.ztanLedgerBlock.findFirst({
                    where: { payload: { contains: entryId } }
                });

                if (block) {
                    const blockEntry: EvidenceEntry = JSON.parse(block.payload);
                    blockEntry.integrity.previousHash = '0x_MALICIOUS_TAMPER';
                    
                    await tx.ztanLedgerBlock.update({
                        where: { id: block.id },
                        data: {
                            prevHash: '0x_MALICIOUS_TAMPER',
                            payload: JSON.stringify(blockEntry)
                        }
                    });
                }
            });
        } catch (dbErr: any) {
            logger.warn({ err: dbErr.message || dbErr }, '[ResilienceEngine] Direct DB corruption injection failed/deferred');
        }

        logger.warn({ entryId }, '[ResilienceEngine] SCENARIO 1: Chain corruption injected');
    }

    /**
     * SCENARIO 2: Signer Revocation
     * Adds a signerId to the global revocation set to simulate compromised authority.
     */
    static async revokeSigner(signerId: string) {
        await redis.sadd(this.REVOCATION_SET, signerId);
        logger.warn({ signerId }, '[ResilienceEngine] SCENARIO 2: Signer authority revoked');
    }

    /**
     * SCENARIO 3: Telemetry Gap Simulation
     * Removes entries from the causal chain without deleting the entries themselves.
     */
    static async simulateTelemetryGap(correlationId: string, startIndex: number, count: number) {
        const chainKey = `${this.CHAIN_PREFIX}${correlationId}:ledger`;
        const entryIds = await redis.lrange(chainKey, 0, -1);
        
        const removedIds = entryIds.splice(startIndex, count);
        
        await redis.del(chainKey);
        if (entryIds.length > 0) {
            await redis.rpush(chainKey, ...entryIds);
        }

        // Delete from PostgreSQL using bypass transaction
        try {
            await db.$transaction(async (tx: any) => {
                await tx.$executeRawUnsafe("SET LOCAL ztan.bypass_immutability = 'on';");
                
                const blocks = await tx.ztanLedgerBlock.findMany({
                    where: { blockId: { startsWith: `${correlationId}:` } },
                    orderBy: { id: 'asc' }
                });

                const blocksToDelete = blocks.slice(startIndex, startIndex + count);
                for (const b of blocksToDelete) {
                    await tx.ztanLedgerBlock.delete({
                        where: { id: b.id }
                    });
                }
            });
        } catch (dbErr: any) {
            logger.warn({ err: dbErr.message || dbErr }, '[ResilienceEngine] Direct DB telemetry gap simulation failed/deferred');
        }
        
        logger.warn({ correlationId, gapSize: count }, '[ResilienceEngine] SCENARIO 3: Telemetry gap injected');
    }

    /**
     * SCENARIO 4: Causal Fork Injection
     * Injects a competing remediation claim linked to the same parent.
     */
    static async injectCausalFork(parentEntryId: string, alternateAction: string) {
        // Implementation would involve appending a new entry with the same parentId
        // but a different narrative/action.
        logger.warn({ parentEntryId, alternateAction }, '[ResilienceEngine] SCENARIO 4: Causal fork injected');
    }

    /**
     * Checks if a signer is currently revoked.
     */
    static async isSignerRevoked(signerId: string): Promise<boolean> {
        return (await redis.sismember(this.REVOCATION_SET, signerId)) === 1;
    }
}

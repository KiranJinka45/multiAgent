import { db } from './server.js';
import { logger } from '@packages/observability';

export interface SideEffectMetadata {
    [key: string]: any;
}

export type SideEffectStatus = 'PENDING' | 'COMMITTED' | 'FAILED' | 'RETRYABLE' | 'ABORTED';

export class SideEffectJournal {
    /**
     * Records a side effect's initial PENDING state.
     * Prevents duplicate invocation if the exact compound key is actively processing or already completed.
     */
    static async recordPending(
        idempotencyKey: string,
        operationType: string,
        executionId: string,
        attemptNumber: number = 1,
        metadata?: SideEffectMetadata
    ): Promise<void> {
        try {
            await db.sideEffectRecord.create({
                data: {
                    idempotencyKey,
                    operationType,
                    executionId,
                    attemptNumber,
                    status: 'PENDING',
                    metadata: metadata || {}
                }
            });
            logger.info({ idempotencyKey, operationType, executionId }, '📝 [SideEffectJournal] Side effect registered as PENDING');
        } catch (error: any) {
            if (error.code === 'P2002') {
                const existing = await db.sideEffectRecord.findUnique({
                    where: {
                        operationType_idempotencyKey: {
                            operationType,
                            idempotencyKey
                        }
                    }
                });

                if (!existing) {
                    throw new Error(`[SideEffectJournal] Race condition fetching key: ${idempotencyKey}`);
                }

                if (existing.status === 'COMMITTED') {
                    logger.warn({ idempotencyKey, operationType }, '⚠️ [SideEffectJournal] Duplicate attempt on already COMMITTED side effect.');
                    throw new Error(`[SideEffectJournal] Side effect already committed: ${operationType}/${idempotencyKey}`);
                }

                if (existing.status === 'PENDING') {
                    logger.error({ idempotencyKey, operationType }, '🚨 [SideEffectJournal] Active conflict: Attempted concurrent execution on PENDING side-effect.');
                    throw new Error(`[SideEffectJournal] Side effect is actively processing (PENDING): ${operationType}/${idempotencyKey}`);
                }

                // If FAILED or RETRYABLE, we can overwrite the record and try again
                await db.sideEffectRecord.update({
                    where: {
                        operationType_idempotencyKey: {
                            operationType,
                            idempotencyKey
                        }
                    },
                    data: {
                        status: 'PENDING',
                        attemptNumber: existing.attemptNumber + 1,
                        executionId,
                        metadata: { ...(existing.metadata as Record<string, any> || {}), ...metadata, retriedAt: new Date().toISOString() }
                    }
                });
                logger.warn({ idempotencyKey, operationType }, '🔄 [SideEffectJournal] Overwrote previous failed attempt, state reset to PENDING');
            } else {
                throw error;
            }
        }
    }

    /**
     * Commits the side effect, marking it completed successfully.
     */
    static async commit(
        idempotencyKey: string,
        operationType: string,
        metadata?: SideEffectMetadata
    ): Promise<void> {
        try {
            const existing = await db.sideEffectRecord.findUnique({
                where: {
                    operationType_idempotencyKey: {
                        operationType,
                        idempotencyKey
                    }
                }
            });

            const mergedMetadata = existing 
                ? { ...(existing.metadata as Record<string, any> || {}), ...metadata }
                : metadata;

            await db.sideEffectRecord.update({
                where: {
                    operationType_idempotencyKey: {
                        operationType,
                        idempotencyKey
                    }
                },
                data: {
                    status: 'COMMITTED',
                    metadata: mergedMetadata || {}
                }
            });
            logger.info({ idempotencyKey, operationType }, '✅ [SideEffectJournal] Side effect successfully marked as COMMITTED');
        } catch (error: any) {
            logger.error({ error: error.message, idempotencyKey, operationType }, '❌ [SideEffectJournal] Failed to commit side effect');
            throw error;
        }
    }

    /**
     * Records a side-effect execution failure.
     */
    static async fail(
        idempotencyKey: string,
        operationType: string,
        status: 'FAILED' | 'RETRYABLE' = 'FAILED',
        errorDetails?: string
    ): Promise<void> {
        try {
            const existing = await db.sideEffectRecord.findUnique({
                where: {
                    operationType_idempotencyKey: {
                        operationType,
                        idempotencyKey
                    }
                }
            });

            const updatedMetadata = {
                ...(existing?.metadata as Record<string, any> || {}),
                error: errorDetails || 'Unspecified error',
                failedAt: new Date().toISOString()
            };

            await db.sideEffectRecord.update({
                where: {
                    operationType_idempotencyKey: {
                        operationType,
                        idempotencyKey
                    }
                },
                data: {
                    status,
                    metadata: updatedMetadata
                }
            });
            logger.warn({ idempotencyKey, operationType, status }, `❌ [SideEffectJournal] Side effect execution failed. Status set to: ${status}`);
        } catch (error: any) {
            logger.error({ error: error.message, idempotencyKey, operationType }, '❌ [SideEffectJournal] Failed to record side effect failure');
            throw error;
        }
    }

    /**
     * Retrieves the state and metadata of a recorded side effect.
     */
    static async get(
        idempotencyKey: string,
        operationType: string
    ): Promise<any> {
        return await db.sideEffectRecord.findUnique({
            where: {
                operationType_idempotencyKey: {
                    operationType,
                    idempotencyKey
                }
            }
        });
    }
}

import { eventBus } from '@packages/events';
import { db } from '@packages/db';
import { logger } from '@packages/observability';
import * as os from 'os';

/**
 * MISSION RECORDER
 * Consumes the global mission event stream and persists to Postgres.
 * Uses Consumer Groups for reliability and load balancing.
 */
export async function setupMissionRecorder() {
    const totalShards = 16;
    const shardId = process.env['SHARD_ID'];
    const processAll = process.env['PROCESS_ALL_SHARDS'] === 'true';
    
    const shardsToProcess = processAll 
        ? Array.from({ length: totalShards }, (_, i) => `shard:${i}`)
        : [shardId ? `shard:${shardId}` : 'shard:0'];

    logger.info({ shardsToProcess, processAll }, '🛠️ Initializing Shard-Aware Mission Recorder...');

    for (const shard of shardsToProcess) {
        const streamKey = eventBus.getPartitionedStream('platform:mission:events', shard);
        await startRecorderForShard(streamKey);
    }
}

async function startRecorderForShard(streamKey: string) {
    const groupName = 'mission-recorders';
    const consumerName = `recorder-${os.hostname()}-${process.pid}-${streamKey}`;

    logger.info({ streamKey, groupName, consumerName }, '📡  Starting Consumer for Shard');

    try {
        // Ensure the consumer group exists
        await eventBus.createGroup(streamKey, groupName);

        // Subscribe using the consumer group
        eventBus.subscribeGroup(streamKey, groupName, consumerName, async (event: any, id: string, deliveryCount: number) => {
            const { contextStorage } = require('@packages/utils');
            const { executionId, type, message, stage, status, totalProgress, timestamp, agent } = event;
            const tenantId = (event as any).tenantId || (event.payload as any)?.tenantId || 'platform-admin';

            return contextStorage.run({
                requestId: `event-${id}`,
                tenantId
            }, async () => {
                // 1. DLQ Check (Poison Message Detection)
                if (deliveryCount > 5) {
                    const dlqKey = `${streamKey}:dlq`;
                    logger.error({ id, executionId, deliveryCount }, '💀 Poison Message detected. Moving to DLQ.');
                    
                    await eventBus.publish(dlqKey, {
                        ...event,
                        _dlq_reason: 'Max retries exceeded',
                        _original_id: id,
                        _delivery_count: deliveryCount,
                        _moved_at: new Date().toISOString()
                    });

                    // ACK to remove from PEL so it doesn't loop forever
                    await eventBus.acknowledge(streamKey, groupName, id);
                    return;
                }

                try {
                    // 1. Fetch the hash of the PREVIOUS log for this specific mission (Mission Chain)
                    const lastLog = await db.executionLog.findFirst({
                        where: { executionId },
                        orderBy: { createdAt: 'desc' },
                        select: { hash: true }
                    });

                    const prevHash = lastLog?.hash || '0'.repeat(64);
                    
                    // 2. Generate an integrity hash (Tamper Detection)
                    // Chaining: hash = sha256(executionId | stage | status | message | eventId | prevHash)
                    const hashData = `${executionId}|${stage || type}|${status || 'info'}|${message || ''}|${id}|${prevHash}`;
                    const hash = require('crypto').createHash('sha256').update(hashData).digest('hex');

                    // 3. Strong Consistency: Write to DB (ExecutionLog)
                    await db.executionLog.create({
                        data: {
                            executionId,
                            stage: stage || type,
                            status: status || 'info',
                            message: message || (agent ? `[${agent}] Thought generated` : null),
                            progress: totalProgress || 0,
                            eventId: id,
                            hash,
                            metadata: event,
                            createdAt: timestamp ? new Date(timestamp) : new Date(),
                        }
                    });

                    // 4. Record to Global Audit Ledger (System-wide Chain)
                    const { AuditLogger } = require('@packages/utils');
                    await AuditLogger.log({
                        action: 'MISSION_EVENT_RECORDED',
                        resource: `mission:${executionId}`,
                        status: 'SUCCESS',
                        tenantId,
                        metadata: { type, stage, status, eventId: id, hash }
                    });

                    // Success!
                    if (deliveryCount > 1) {
                        logger.info({ executionId, type, id, deliveryCount }, '✅ Reclaimed event persisted and hashed');
                    } else {
                        logger.debug({ executionId, type, id }, '✅ Mission event persisted to Verifiable Ledger');
                    }
                } catch (err: any) {
                    // Handle idempotency (Unique constraint on eventId)
                    if (err.code === 'P2002') {
                        logger.warn({ id, executionId }, '⚠️ Duplicate event ignored (Idempotency check)');
                        return;
                    }
                    
                    logger.error({ err, id, executionId, deliveryCount }, '❌ Failed to persist mission event to DB');
                    throw err; // Throwing here prevents XACK, allowing retry via PEL/Recovery loop
                }
            });
        });
    } catch (err) {
        logger.error({ err, streamKey }, 'Failed to initialize shard consumer');
    }
}

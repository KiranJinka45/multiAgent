/**
 * @packages/ztan-witness
 * 
 * The Evidence Ledger and Replay Engine implementation.
 * This service ensures that every operational event is signed, chained, 
 * and causally indexed for forensic reconstruction.
 */

import { 
    type EvidenceEntry, 
    EventCategory, 
    type EvidenceChain, 
    type CausalLink,
    VerificationState,
    type EvidenceSignature,
    type TrustEpoch,
    type LedgerCheckpoint,
    type RollbackInvariants,
    type RollbackImpactAssessment
} from '@packages/contracts';
import { 
    logger,
    ztanWitnessAppendDuration,
    ztanWitnessReplayDuration,
    ztanWitnessQueueBacklog,
    ztanWitnessSignatureFailures,
    ztanWitnessIngestionRejections
} from '@packages/observability';
import { redis } from '@packages/utils';
import { db } from '@packages/db';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export class EvidenceLedgerService {
    private static readonly LEDGER_PREFIX = 'ztan:evidence:';
    private static readonly CHAIN_PREFIX = 'ztan:chain:';
    private static readonly EPOCH_KEY = 'ztan:gov:active_epoch';
    private static readonly CHECKPOINT_PREFIX = 'ztan:checkpoint:';

    private static readonly batchQueues = new Map<string, Array<{
        params: {
            category: EventCategory;
            source: { service: string; node: string; version: string };
            payload: Record<string, any>;
            correlationId: string;
            parentEventId?: string;
            signerId: string;
        };
        resolve: (value: EvidenceEntry) => void;
        reject: (reason: any) => void;
        queueStart: number;
    }>>();
    private static readonly batchTimeouts = new Map<string, NodeJS.Timeout>();
    private static readonly activeBatches = new Set<string>();

    /**
     * Ingests a new operational event with cryptographic attestation.
     * Uses high-throughput Group Commit (Batching) to group concurrent appends
     * and minimize PG transaction overhead and WAL lock serialization delays.
     */
    static async append(params: {
        category: EventCategory;
        source: { service: string; node: string; version: string };
        payload: Record<string, any>;
        correlationId: string;
        parentEventId?: string;
        signerId: string;
    }): Promise<EvidenceEntry> {
        const { correlationId } = params;

        return new Promise<EvidenceEntry>((resolve, reject) => {
            let queue = this.batchQueues.get(correlationId);
            if (!queue) {
                queue = [];
                this.batchQueues.set(correlationId, queue);
            }
            queue.push({ params, resolve, reject, queueStart: performance.now() });

            // If queue length reaches optimal block size (e.g. 50), trigger immediately
            if (queue.length >= 50) {
                const timeout = this.batchTimeouts.get(correlationId);
                if (timeout) {
                    clearTimeout(timeout);
                    this.batchTimeouts.delete(correlationId);
                }
                this.processBatch(correlationId).catch((err) => {
                    logger.error({ err: err.message || err, correlationId }, '[EvidenceLedger] Group Commit batch processing failed');
                });
            } else if (!this.activeBatches.has(correlationId) && !this.batchTimeouts.has(correlationId)) {
                // Otherwise wait for a tiny 5ms window to accumulate other concurrent client requests
                const timeout = setTimeout(() => {
                    this.batchTimeouts.delete(correlationId);
                    this.processBatch(correlationId).catch((err) => {
                        logger.error({ err: err.message || err, correlationId }, '[EvidenceLedger] Group Commit batch processing failed');
                    });
                }, 5);
                this.batchTimeouts.set(correlationId, timeout);
            }
        });
    }

    private static async processBatch(correlationId: string): Promise<void> {
        if (this.activeBatches.has(correlationId)) {
            return;
        }
        this.activeBatches.add(correlationId);

        const batch = this.batchQueues.get(correlationId) || [];
        this.batchQueues.delete(correlationId);

        if (batch.length === 0) {
            this.activeBatches.delete(correlationId);
            return;
        }

        try {
            if (batch.length === 1) {
                const { params, resolve, reject, queueStart } = batch[0];
                const queueWaitTimeMs = performance.now() - queueStart;
                try {
                    const result = await this.appendInternal(params, { queueWaitTimeMs, queueDepth: 0 });
                    resolve(result);
                } catch (err) {
                    reject(err);
                }
            } else {
                await this.appendBatchInternal(correlationId, batch);
            }
        } finally {
            this.activeBatches.delete(correlationId);
            const remaining = this.batchQueues.get(correlationId);
            if (remaining && remaining.length > 0 && !this.batchTimeouts.has(correlationId)) {
                const timeout = setTimeout(() => {
                    this.batchTimeouts.delete(correlationId);
                    this.processBatch(correlationId).catch((err) => {
                        logger.error({ err: err.message || err, correlationId }, '[EvidenceLedger] Group Commit batch processing failed');
                    });
                }, 5);
                this.batchTimeouts.set(correlationId, timeout);
            }
        }
    }

    private static async appendBatchInternal(
        correlationId: string,
        batch: Array<{
            params: {
                category: EventCategory;
                source: { service: string; node: string; version: string };
                payload: Record<string, any>;
                correlationId: string;
                parentEventId?: string;
                signerId: string;
            };
            resolve: (value: EvidenceEntry) => void;
            reject: (reason: any) => void;
            queueStart: number;
        }>
    ): Promise<void> {
        const start = Date.now();
        
        // 1. Acquire Redis Distributed Lock with Monotonic Epoch Fencing Token
        const lockKey = `ztan:lock:${correlationId}`;
        const lockEpochKey = `ztan:lock:epoch:${correlationId}`;
        let lockValue = '';
        let acquired = false;
        const maxRetries = 150;
        let retryCount = 0;

        const lockStart = performance.now();
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            retryCount = attempt;
            const activeEpoch = await redis.incr(lockEpochKey);
            const result = await redis.set(lockKey, activeEpoch.toString(), 'NX', 'PX', 10000);
            if (result === 'OK') {
                acquired = true;
                lockValue = activeEpoch.toString();
                break;
            }
            const jitterDelay = Math.min(250, Math.floor(Math.pow(1.5, attempt) * 15 + Math.random() * 20));
            await new Promise(resolve => setTimeout(resolve, jitterDelay));
        }
        const lockAcquireTimeMs = performance.now() - lockStart;

        if (!acquired) {
            const err = new Error(`[EvidenceLedger] Distributed Lock Timeout: Failed to acquire sequence lock for batch correlationId ${correlationId}`);
            for (const item of batch) {
                item.reject(err);
            }
            return;
        }

        let dbTransactionTimeMs = 0;
        let redisCacheTimeMs = 0;
        const timestamp = Date.now();

        try {
            // 2. Fetch Active Trust Epoch
            const activeEpoch = await this.getActiveEpoch();

            // 3. Execute bulk DB transaction
            const dbStart = performance.now();
            const results = await db.$transaction(async (tx: any) => {
                const activeToken = await redis.get(lockKey);
                if (activeToken !== lockValue) {
                    throw new Error(`[EvidenceLedger] Fenced Write: Lock lease expired or preempted during batch transaction execution.`);
                }

                const lastBlock = await tx.ztanLedgerBlock.findFirst({
                    where: { blockId: { startsWith: `${correlationId}:` } },
                    orderBy: { id: 'desc' }
                });
                
                const currentSequence = lastBlock ? (parseInt(lastBlock.blockId.split(':')[1], 10) + 1) : 1;
                const currentPreviousHash = lastBlock ? lastBlock.hash : '0x0';

                const preparedEntries: Array<{
                    id: string;
                    sequence: number;
                    previousHash: string;
                    hash: string;
                    signature: EvidenceSignature;
                    entryObj: EvidenceEntry;
                    category: EventCategory;
                    signerId: string;
                }> = [];

                for (let i = 0; i < batch.length; i++) {
                    const item = batch[i];
                    const id = uuidv4();
                    const seq = currentSequence + i;
                    const prevHash = i === 0 ? currentPreviousHash : preparedEntries[i - 1].hash;

                    let causality: CausalLink | undefined;
                    if (item.params.parentEventId) {
                        causality = { parentEventId: item.params.parentEventId, linkType: 'trigger', confidence: 1.0 };
                    }

                    const hash = this.calculateHash({
                        payload: item.params.payload,
                        timestamp,
                        sequence: seq,
                        previousHash: prevHash,
                        causality
                    });

                    const signature: EvidenceSignature = {
                        signerId: item.params.signerId,
                        algorithm: 'ed25519',
                        signature: this.signHash(hash, item.params.signerId),
                        signedAt: timestamp,
                        trustEpochId: activeEpoch.id,
                        scope: 'entry'
                    };

                    const entryObj: EvidenceEntry = {
                        id,
                        timestamp,
                        sequence: seq,
                        correlationId,
                        category: item.params.category,
                        source: item.params.source,
                        payload: item.params.payload,
                        causality,
                        integrity: {
                            hash,
                            previousHash: prevHash,
                            signature,
                            verificationState: VerificationState.VERIFIED
                        }
                    };

                    preparedEntries.push({
                        id,
                        sequence: seq,
                        previousHash: prevHash,
                        hash,
                        signature,
                        entryObj,
                        category: item.params.category,
                        signerId: item.params.signerId
                    });
                }

                // 1. Bulk insert all WAL entries as PENDING
                await tx.ztanWalLog.createMany({
                    data: preparedEntries.map(item => ({
                        seq: item.sequence,
                        type: item.category,
                        payload: JSON.stringify(item.entryObj),
                        status: 'PENDING'
                    }))
                });

                // 2. Bulk insert all Ledger Blocks
                await tx.ztanLedgerBlock.createMany({
                    data: preparedEntries.map(item => ({
                        blockId: `${correlationId}:${item.sequence}`,
                        prevHash: item.previousHash,
                        hash: item.hash,
                        type: item.category,
                        payload: JSON.stringify(item.entryObj),
                        operator: item.signerId,
                        signature: item.signature.signature,
                        status: VerificationState.VERIFIED,
                        epoch: activeEpoch.id,
                        createdAt: new Date(timestamp)
                    }))
                });

                // 3. Bulk update WAL status to COMMITTED
                await tx.ztanWalLog.updateMany({
                    where: {
                        seq: { in: preparedEntries.map(item => item.sequence) },
                        status: 'PENDING'
                    },
                    data: { status: 'COMMITTED' }
                });

                return preparedEntries;
            });
            dbTransactionTimeMs = performance.now() - dbStart;

            // 4. Pipelined cache updates to Redis
            const cacheStart = performance.now();
            const pipeline = redis.pipeline();
            for (const item of results) {
                pipeline.set(`${this.LEDGER_PREFIX}${item.id}`, JSON.stringify(item.entryObj));
                pipeline.rpush(`${this.CHAIN_PREFIX}${correlationId}:ledger`, item.id);
            }
            const lastItem = results[results.length - 1];
            pipeline.set(`${this.CHAIN_PREFIX}${correlationId}:last_hash`, lastItem.hash);
            pipeline.set(`${this.CHAIN_PREFIX}${correlationId}:seq`, lastItem.sequence);
            await pipeline.exec();
            redisCacheTimeMs = performance.now() - cacheStart;

            // 5. Complete requests and record metrics
            const totalDurationSeconds = (Date.now() - start) / 1000;
            for (let i = 0; i < batch.length; i++) {
                const item = batch[i];
                const res = results[i];

                (res.entryObj as any)._sreTelemetry = {
                    queueWaitTimeMs: performance.now() - item.queueStart,
                    queueDepth: batch.length - 1,
                    lockAcquireTimeMs: lockAcquireTimeMs || 0,
                    dbTransactionTimeMs: dbTransactionTimeMs || 0,
                    redisCacheTimeMs: redisCacheTimeMs || 0,
                    lockReleaseTimeMs: 0,
                    retryCount: retryCount || 0
                };

                ztanWitnessAppendDuration.observe({ category: res.category, service: res.entryObj.source.service }, totalDurationSeconds / batch.length);
                item.resolve(res.entryObj);
            }

            ztanWitnessQueueBacklog.set(lastItem.sequence);

            // 6. Checkpoint boundary
            if (lastItem.sequence % 100 === 0 || Math.floor(lastItem.sequence / 100) > Math.floor(results[0].sequence / 100)) {
                await this.checkpoint(correlationId);
            }

        } catch (err: any) {
            logger.error({ err: err.message || err }, '❌ [EvidenceLedger] Group Commit batch transaction failed. Attempting graceful individual fallback recovery.');
            for (const item of batch) {
                const queueWaitTimeMs = performance.now() - item.queueStart;
                try {
                    const result = await this.appendInternal(item.params, { queueWaitTimeMs, queueDepth: 0 });
                    item.resolve(result);
                } catch (fallbackErr) {
                    item.reject(fallbackErr);
                }
            }
        } finally {
            const currentValue = await redis.get(lockKey);
            if (currentValue === lockValue) {
                await redis.del(lockKey);
            }
        }
    }

    /**
     * Inner append logic, executed sequentially per correlationId.
     */
    private static async appendInternal(
        params: {
            category: EventCategory;
            source: { service: string; node: string; version: string };
            payload: Record<string, any>;
            correlationId: string;
            parentEventId?: string;
            signerId: string;
        },
        sreParams?: { queueWaitTimeMs: number; queueDepth: number }
    ): Promise<EvidenceEntry> {
        const start = Date.now();
        const { category, source, payload, correlationId, parentEventId, signerId } = params;
        
        // 1. Acquire Redis Distributed Lock with Monotonic Epoch Fencing Token & Jitter Backoff
        const lockKey = `ztan:lock:${correlationId}`;
        const lockEpochKey = `ztan:lock:epoch:${correlationId}`;
        let lockValue = '';
        let acquired = false;
        const maxRetries = 150;
        let retryCount = 0;

        const lockStart = performance.now();
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            retryCount = attempt;
            // Increment the monotonic lock epoch to generate a unique fencing token
            const activeEpoch = await redis.incr(lockEpochKey);
            const result = await redis.set(lockKey, activeEpoch.toString(), 'NX', 'PX', 10000);
            if (result === 'OK') {
                acquired = true;
                lockValue = activeEpoch.toString();
                break;
            }
            // Exponential backoff with randomized jitter to smooth out tail latency (P99) convoys
            const jitterDelay = Math.min(250, Math.floor(Math.pow(1.5, attempt) * 15 + Math.random() * 20));
            await new Promise(resolve => setTimeout(resolve, jitterDelay));
        }
        const lockAcquireTimeMs = performance.now() - lockStart;

        if (!acquired) {
            throw new Error(`[EvidenceLedger] Distributed Lock Timeout: Failed to acquire sequence lock for correlationId ${correlationId}`);
        }

        let entry: EvidenceEntry | undefined;
        let dbTransactionTimeMs = 0;
        let redisCacheTimeMs = 0;

        try {
            const id = uuidv4();
            const timestamp = Date.now();
            
            // 2. Fetch Active Trust Epoch
            const activeEpoch = await this.getActiveEpoch();
            
            // 3. Sequence & Chaining (using PostgreSQL transaction for absolute safety)
            let sequence = 1;
            let previousHash = '0x0';

            try {
                const dbStart = performance.now();
                entry = await db.$transaction(async (tx: any) => {
                    // Check active fencing token before committing transaction to guard against GC pauses
                    const activeToken = await redis.get(lockKey);
                    if (activeToken !== lockValue) {
                        throw new Error(`[EvidenceLedger] Fenced Write: Lock lease expired or preempted during transaction execution. Active Token: ${activeToken}, Owned Token: ${lockValue}`);
                    }

                    const lastBlock = await tx.ztanLedgerBlock.findFirst({
                        where: { blockId: { startsWith: `${correlationId}:` } },
                        orderBy: { id: 'desc' }
                    });
                    
                    sequence = lastBlock ? (parseInt(lastBlock.blockId.split(':')[1], 10) + 1) : 1;
                    previousHash = lastBlock ? lastBlock.hash : '0x0';

                    const blockId = `${correlationId}:${sequence}`;

                    let causality: CausalLink | undefined;
                    if (parentEventId) {
                        causality = { parentEventId, linkType: 'trigger', confidence: 1.0 };
                    }

                    const hash = this.calculateHash({ payload, timestamp, sequence, previousHash, causality });

                    const signature: EvidenceSignature = {
                        signerId,
                        algorithm: 'ed25519',
                        signature: this.signHash(hash, signerId),
                        signedAt: timestamp,
                        trustEpochId: activeEpoch.id,
                        scope: 'entry'
                    };

                    const entryObj: EvidenceEntry = {
                        id,
                        timestamp,
                        sequence,
                        correlationId,
                        category,
                        source,
                        payload,
                        causality,
                        integrity: {
                            hash,
                            previousHash,
                            signature,
                            verificationState: VerificationState.VERIFIED
                        }
                    };

                    // 1. Write proposed WAL log entry in PENDING status
                    const wal = await tx.ztanWalLog.create({
                        data: {
                            seq: sequence,
                            type: category,
                            payload: JSON.stringify(entryObj),
                            status: 'PENDING'
                        }
                    });

                    // 2. Create authoritative Ledger Block
                    await tx.ztanLedgerBlock.create({
                        data: {
                            blockId,
                            prevHash: previousHash,
                            hash,
                            type: category,
                            payload: JSON.stringify(entryObj),
                            operator: signerId,
                            signature: signature.signature,
                            status: VerificationState.VERIFIED,
                            epoch: activeEpoch.id,
                            createdAt: new Date(timestamp)
                        }
                    });

                    // 3. Complete WAL log entry transaction to COMMITTED status
                    await tx.ztanWalLog.update({
                        where: { id: wal.id },
                        data: { status: 'COMMITTED' }
                    });

                    return entryObj;
                });
                dbTransactionTimeMs = performance.now() - dbStart;
            } catch (dbErr: any) {
                logger.warn({ err: dbErr.message || dbErr }, '[EvidenceLedger] Direct PostgreSQL transactional append failed, falling back to local sequence checks');
                
                // Fallback: check fencing token
                const activeToken = await redis.get(lockKey);
                if (activeToken !== lockValue) {
                    throw new Error(`[EvidenceLedger] Fenced Write: Lock lease expired or preempted during fallback execution. Active Token: ${activeToken}, Owned Token: ${lockValue}`);
                }

                // Fallback sequence increment
                sequence = await redis.incr(`${this.CHAIN_PREFIX}${correlationId}:seq`);
                previousHash = (await redis.get(`${this.CHAIN_PREFIX}${correlationId}:last_hash`)) || '0x0';
                
                let causality: CausalLink | undefined;
                if (parentEventId) {
                    causality = { parentEventId, linkType: 'trigger', confidence: 1.0 };
                }

                const hash = this.calculateHash({ payload, timestamp, sequence, previousHash, causality });

                const signature: EvidenceSignature = {
                    signerId,
                    algorithm: 'ed25519',
                    signature: this.signHash(hash, signerId),
                    signedAt: timestamp,
                    trustEpochId: activeEpoch.id,
                    scope: 'entry'
                };

                entry = {
                    id,
                    timestamp,
                    sequence,
                    correlationId,
                    category,
                    source,
                    payload,
                    causality,
                    integrity: {
                        hash,
                        previousHash,
                        signature,
                        verificationState: VerificationState.VERIFIED
                    }
                };
            }

            if (!entry) {
                throw new Error('[EvidenceLedger] Append failed: No entry generated during execution');
            }

            // 5. Commit to Redis as high-performance sequence cache
            const cacheStart = performance.now();
            const pipeline = redis.pipeline();
            pipeline.set(`${this.LEDGER_PREFIX}${id}`, JSON.stringify(entry));
            pipeline.rpush(`${this.CHAIN_PREFIX}${correlationId}:ledger`, id);
            pipeline.set(`${this.CHAIN_PREFIX}${correlationId}:last_hash`, entry.integrity.hash);
            pipeline.set(`${this.CHAIN_PREFIX}${correlationId}:seq`, entry.sequence);
            await pipeline.exec();
            redisCacheTimeMs = performance.now() - cacheStart;

            // 6. Record Metrics
            const durationSeconds = (Date.now() - start) / 1000;
            ztanWitnessAppendDuration.observe({ category, service: source.service }, durationSeconds);
            ztanWitnessQueueBacklog.set(sequence);

            // 7. Check for Checkpoint Boundary (Every 100 entries per correlation)
            if (sequence % 100 === 0) {
                await this.checkpoint(correlationId);
            }

            return entry;
        } finally {
            const releaseStart = performance.now();
            // Release Redis Distributed Lock safely
            const currentValue = await redis.get(lockKey);
            if (currentValue === lockValue) {
                await redis.del(lockKey);
            }
            const lockReleaseTimeMs = performance.now() - releaseStart;

            if (entry) {
                (entry as any)._sreTelemetry = {
                    queueWaitTimeMs: sreParams?.queueWaitTimeMs || 0,
                    queueDepth: sreParams?.queueDepth || 0,
                    lockAcquireTimeMs: lockAcquireTimeMs || 0,
                    dbTransactionTimeMs: dbTransactionTimeMs || 0,
                    redisCacheTimeMs: redisCacheTimeMs || 0,
                    lockReleaseTimeMs: lockReleaseTimeMs || 0,
                    retryCount: retryCount || 0
                };
            }
        }
    }

    /**
     * Reconstructs and verifies an Evidence Chain for forensic replay.
     * Uses Snapshot-Assisted Replay with strict Cache Coherency Verification.
     */
    static async getChain(incidentId: string): Promise<EvidenceChain> {
        const start = Date.now();
        const entries: EvidenceEntry[] = [];

        // Automatically run WAL recovery before replaying the chain to ensure absolute operational consistency!
        try {
            await this.recoverPendingWAL(incidentId);
        } catch (err: any) {
            logger.warn({ err: err.message }, '[EvidenceLedger] Inline WAL recovery check failed, proceeding with standard replay');
        }

        try {
            let minSeq = 0;
            // 1. Fetch latest snapshot
            const snapshot = await db.ztanSnapshot.findFirst({
                orderBy: { epoch: 'desc' }
            });

            if (snapshot) {
                minSeq = snapshot.lastSeq;
                // Hydrate pre-checkpointed entries from high-performance Redis cache list
                const cachedIds = await redis.lrange(`${this.CHAIN_PREFIX}${incidentId}:ledger`, 0, minSeq - 1);
                const cachedData = await Promise.all(cachedIds.map((id: string) => redis.get(`${this.LEDGER_PREFIX}${id}`)));
                for (const d of cachedData) {
                    if (d) entries.push(JSON.parse(d));
                }
            }

            // 2. Fetch blocks from database and filter new updates
            const dbBlocks = await db.ztanLedgerBlock.findMany({
                where: { blockId: { startsWith: `${incidentId}:` } },
                orderBy: { id: 'asc' }
            });
            
            // 3. Cache Coherency Verification:
            // Verify that the cached Redis snapshot seamlessly links to the PostgreSQL delta delta-chain
            if (minSeq > 0 && entries.length > 0) {
                const lastSnapshotEntry = entries[minSeq - 1];
                const firstDeltaBlock = dbBlocks.find((b: any) => {
                    const seq = parseInt(b.blockId.split(':')[1], 10);
                    return seq === minSeq + 1;
                });

                if (firstDeltaBlock && lastSnapshotEntry) {
                    const deltaPayload = JSON.parse(firstDeltaBlock.payload);
                    if (deltaPayload.integrity.previousHash !== lastSnapshotEntry.integrity.hash) {
                        logger.error({
                            minSeq,
                            snapshotLastHash: lastSnapshotEntry.integrity.hash,
                            deltaFirstPrevHash: deltaPayload.integrity.previousHash
                        }, '[EvidenceLedger] Cache Coherency Gap Detected! Snapshot hash linkage is broken. Triggering invalidation.');
                        
                        // Invalidate stale cache to allow self-healing on next run
                        await redis.del(`${this.CHAIN_PREFIX}${incidentId}:ledger`);
                        throw new Error('Cache Incoherency: Snapshot hash linkage broken');
                    }
                }
            }

            for (const block of dbBlocks) {
                const seq = parseInt(block.blockId.split(':')[1], 10);
                if (seq > minSeq) {
                    entries.push(JSON.parse(block.payload));
                }
            }
        } catch (dbErr: any) {
            logger.warn({ err: dbErr.message || dbErr }, '[EvidenceLedger] Failed to read from PostgreSQL or Cache Incoherency detected, falling back to clean Redis cache');
            entries.length = 0; // Reset partial reads
            const entryIds = await redis.lrange(`${this.CHAIN_PREFIX}${incidentId}:ledger`, 0, -1);
            for (const id of entryIds) {
                const data = await redis.get(`${this.LEDGER_PREFIX}${id}`);
                if (data) entries.push(JSON.parse(data));
            }
        }

        // Perform Multi-Pillar Verification
        const verificationState = await this.verifyChainIntegrity(entries);
        const metrics = this.calculateResilienceMetrics(entries, verificationState);
        
        // Fetch Institutional Context
        const epochData = await redis.get('ztan:gov:active_epoch');
        const governanceContext = epochData ? JSON.parse(epochData) : null;

        const durationSeconds = (Date.now() - start) / 1000;
        ztanWitnessReplayDuration.observe({ incident_id: incidentId, state: verificationState }, durationSeconds);

        return {
            incidentId,
            entries,
            verificationState,
            verificationEpoch: Date.now(),
            metrics,
            governanceContext
        };
    }

    /**
     * Replays and recovers any uncommitted WAL log entries in PENDING status.
     * Reconstructs the authoritative Ledger Block if it is missing, or
     * updates the WAL status to COMMITTED if the block already exists.
     */
    static async recoverPendingWAL(incidentId: string): Promise<{ recoveredCount: number; resolvedCount: number }> {
        logger.info({ incidentId }, '[EvidenceLedger] Initiating Write-Ahead Log (WAL) Replay & Crash Recovery');
        
        let recoveredCount = 0;
        let resolvedCount = 0;

        try {
            const pendingWalEntries = await db.ztanWalLog.findMany({
                where: { status: 'PENDING' },
                orderBy: { seq: 'asc' }
            });

            for (const wal of pendingWalEntries) {
                let entryObj: EvidenceEntry;
                try {
                    entryObj = JSON.parse(wal.payload);
                } catch (parseErr) {
                    logger.error({ walId: wal.id, err: parseErr }, '[EvidenceLedger] Corrupted WAL entry payload. Skipping.');
                    continue;
                }

                if (entryObj.correlationId !== incidentId) {
                    continue;
                }

                const blockId = `${incidentId}:${entryObj.sequence}`;

                const existingBlock = await db.ztanLedgerBlock.findFirst({
                    where: { blockId }
                });

                if (existingBlock) {
                    await db.ztanWalLog.update({
                        where: { id: wal.id },
                        data: { status: 'COMMITTED' }
                    });
                    logger.info({ blockId, walId: wal.id }, '⚙️ [WAL Recovery] Self-healed uncommitted WAL status to COMMITTED (Ledger Block was already present)');
                    resolvedCount++;
                } else {
                    await db.$transaction(async (tx: any) => {
                        const lastBlock = await tx.ztanLedgerBlock.findFirst({
                            where: { blockId: { startsWith: `${incidentId}:` } },
                            orderBy: { id: 'desc' }
                        });
                        
                        const expectedSeq = lastBlock ? (parseInt(lastBlock.blockId.split(':')[1], 10) + 1) : 1;
                        if (entryObj.sequence !== expectedSeq) {
                            throw new Error(`Chronological sequence mismatch during WAL replay. Expected: ${expectedSeq}, WAL: ${entryObj.sequence}`);
                        }

                        const activeEpoch = await this.getActiveEpoch();

                        await tx.ztanLedgerBlock.create({
                            data: {
                                blockId,
                                prevHash: lastBlock ? lastBlock.hash : '0x0',
                                hash: entryObj.integrity.hash,
                                type: entryObj.category,
                                payload: wal.payload,
                                operator: entryObj.integrity.signature?.signerId || '',
                                signature: entryObj.integrity.signature?.signature || '',
                                status: VerificationState.VERIFIED,
                                epoch: activeEpoch.id,
                                createdAt: new Date(entryObj.timestamp)
                            }
                        });

                        await tx.ztanWalLog.update({
                            where: { id: wal.id },
                            data: { status: 'COMMITTED' }
                        });
                    });

                    const pipeline = redis.pipeline();
                    pipeline.set(`${this.LEDGER_PREFIX}${entryObj.id}`, wal.payload);
                    pipeline.rpush(`${this.CHAIN_PREFIX}${incidentId}:ledger`, entryObj.id);
                    pipeline.set(`${this.CHAIN_PREFIX}${incidentId}:last_hash`, entryObj.integrity.hash);
                    pipeline.set(`${this.CHAIN_PREFIX}${incidentId}:seq`, entryObj.sequence);
                    await pipeline.exec();

                    logger.info({ blockId, walId: wal.id }, '🛡️ [WAL Recovery] Reconstructed and committed missing Ledger Block from PENDING WAL log');
                    recoveredCount++;
                }
            }
        } catch (recoveryErr: any) {
            logger.error({ err: recoveryErr.message || recoveryErr }, '❌ [WAL Recovery] Crash recovery failed');
            throw recoveryErr;
        }

        return { recoveredCount, resolvedCount };
    }

    /**
     * Quantifies the forensic trust and survivability of a chain.
     */
    private static calculateResilienceMetrics(entries: EvidenceEntry[], state: VerificationState) {
        const hasCausality = entries.some(e => !!e.causality);
        const hasMissingTelemetry = entries.some(e => e.payload?.dependency_health === 'MISSING');
        
        // Detect sequence gaps (Injection B)
        let hasTemporalGaps = false;
        for (let i = 1; i < entries.length; i++) {
            if (entries[i].sequence > entries[i-1].sequence + 1) {
                hasTemporalGaps = true;
            }
        }

        return {
            chainIntegrityRate: state === VerificationState.UNTRUSTED ? 0.5 : 1.0,
            epochTrustValidity: state === VerificationState.DEGRADED ? 0.3 : 1.0,
            replaySurvivability: entries.length > 0 ? 0.9 : 0,
            recoveryConfidence: (state === VerificationState.VERIFIED && !hasTemporalGaps) ? 1.0 : 0.6,
            evidenceCompleteness: hasMissingTelemetry || hasTemporalGaps ? 0.7 : 1.0,
            causalCertainty: hasCausality ? 0.9 : 0.4
        };
    }

    /**
     * Verifies the cryptographic and causal integrity of an entry sequence.
     */
    private static async verifyChainIntegrity(entries: EvidenceEntry[]): Promise<VerificationState> {
        if (entries.length === 0) return VerificationState.VERIFIED;

        let lastHash = entries[0].integrity.previousHash;
        let hasRevokedSigner = false;

        const { ForensicResilienceEngine } = await import('./resilience-engine.js');

        for (const entry of entries) {
            // 1. Hash Linkage Check (Structural Integrity)
            if (entry.integrity.previousHash !== lastHash) {
                logger.error({ entryId: entry.id }, '[EvidenceLedger] Chain broken: hash linkage failure');
                ztanWitnessIngestionRejections.inc({ service: entry.source.service, reason: 'hash_linkage_failure' });
                return VerificationState.UNTRUSTED;
            }

            // 2. Signature Validation (Origin Authenticity)
            if (!this.isValidSignature(entry.integrity.hash, entry.integrity.signature)) {
                logger.error({ entryId: entry.id }, '[EvidenceLedger] Signature invalid: authenticity failure');
                ztanWitnessSignatureFailures.inc({ signer_id: entry.integrity.signature?.signerId || 'unknown', algorithm: 'ed25519' });
                ztanWitnessIngestionRejections.inc({ service: entry.source.service, reason: 'signature_invalid' });
                return VerificationState.UNTRUSTED;
            }

            // 3. Signer Revocation Check (Current Authority)
            const signerId = entry.integrity.signature?.signerId;
            if (signerId && await ForensicResilienceEngine.isSignerRevoked(signerId)) {
                hasRevokedSigner = true;
            }

            lastHash = entry.integrity.hash;
        }

        // Return DEGRADED if chain is intact but signers are compromised
        return hasRevokedSigner ? VerificationState.DEGRADED : VerificationState.VERIFIED;
    }

    /**
     * Notarizes the current ledger state with a Merkle Root.
     */
    static async checkpoint(correlationId: string): Promise<LedgerCheckpoint> {
        const entryIds = await redis.lrange(`${this.CHAIN_PREFIX}${correlationId}:ledger`, 0, -1);
        const merkleRoot = this.calculateMerkleRoot(entryIds); // Simplified implementation
        
        const activeEpoch = await this.getActiveEpoch();
        const checkpoint: LedgerCheckpoint = {
            id: uuidv4(),
            timestamp: Date.now(),
            epochId: activeEpoch.id,
            merkleRoot,
            count: entryIds.length,
            signature: {
                signerId: 'system-notary-01',
                algorithm: 'ed25519',
                signature: 'signed-merkle-root',
                signedAt: Date.now(),
                trustEpochId: activeEpoch.id,
                scope: 'checkpoint'
            }
        };

        await redis.set(`${this.CHECKPOINT_PREFIX}${checkpoint.id}`, JSON.stringify(checkpoint));
        logger.info({ correlationId, checkpointId: checkpoint.id }, '[EvidenceLedger] Checkpoint notarized to Redis');
        
        // Write snapshot directly to PostgreSQL ZtanSnapshot table
        try {
            const epochVal = parseInt(activeEpoch.id.replace(/\D/g, ''), 10) || 100;
            const lastBlock = await db.ztanLedgerBlock.findFirst({
                where: { blockId: { startsWith: `${correlationId}:` } },
                orderBy: { id: 'desc' }
            });
            const lastSeq = lastBlock ? parseInt(lastBlock.blockId.split(':')[1], 10) : entryIds.length;
            const lastHash = lastBlock ? lastBlock.hash : merkleRoot;

            await db.ztanSnapshot.upsert({
                where: { epoch: epochVal },
                create: {
                    epoch: epochVal,
                    lastSeq,
                    lastHash,
                    stateData: JSON.stringify(checkpoint)
                },
                update: {
                    lastSeq,
                    lastHash,
                    stateData: JSON.stringify(checkpoint)
                }
            });
            logger.info({ correlationId, epoch: epochVal }, '[EvidenceLedger] PostgreSQL snapshot created/updated during checkpoint');
        } catch (snapErr: any) {
            logger.warn({ err: snapErr.message || snapErr }, '[EvidenceLedger] PostgreSQL snapshot creation deferred during checkpoint');
        }

        return checkpoint;
    }

    // --- Cryptographic Helpers ---

    private static calculateHash(data: any): string {
        return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    }

    private static signHash(hash: string, signerId: string): string {
        // Mock Ed25519 signing
        return `sig:${signerId}:${hash.substring(0, 8)}`;
    }

    private static isValidSignature(hash: string, signature?: EvidenceSignature): boolean {
        if (!signature) return false;
        // Mock verification
        return signature.signature.endsWith(hash.substring(0, 8));
    }

    private static calculateMerkleRoot(ids: string[]): string {
        // Rolling XOR hash for mock Merkle root
        return ids.reduce((acc, id) => crypto.createHash('sha256').update(acc + id).digest('hex'), 'genesis');
    }

    private static async getActiveEpoch(): Promise<TrustEpoch> {
        const data = await redis.get(this.EPOCH_KEY);
        if (data) return JSON.parse(data);
        
        // Genesis Epoch
        return {
            id: 'GENESIS-EPOCH-001',
            startTime: Date.now(),
            algorithm: 'ed25519',
            status: 'active',
        };
    }
    
    /**
     * Evaluates a specific evidence entry as a potential rollback target.
     */
    static async assessRollbackImpact(entryId: string): Promise<RollbackImpactAssessment> {
        let data = await redis.get(`${this.LEDGER_PREFIX}${entryId}`);
        if (!data) {
            try {
                const block = await db.ztanLedgerBlock.findFirst({
                    where: { payload: { contains: entryId } }
                });
                if (block) data = block.payload;
            } catch (dbErr) {
                // Ignore and fall through to error check
            }
        }
        if (!data) throw new Error('Evidence entry not found');
        const entry = JSON.parse(data);

        // Mock Invariants for Drill IFD-001
        const invariants: RollbackInvariants = {
            baselineSoftwareVersion: '2.4.0',
            prohibitedStates: ['vulnerable-kernel-01'],
            mandatoryDependencies: ['identity-service', 'audit-vault'],
            maxBlastRadiusNodes: 5
        };

        const violated: string[] = [];
        if (entry.payload?.version && entry.payload.version < invariants.baselineSoftwareVersion) {
            violated.push(`Unsafe software baseline: ${entry.payload.version} < ${invariants.baselineSoftwareVersion}`);
        }
        
        if (entry.payload?.dependency_health === 'MISSING') {
            violated.push('Mandatory dependency telemetry missing');
        }

        const isSafe = violated.length === 0;

        return {
            isSafe,
            blastRadiusNodes: ['ztan-edge-01', 'ztan-edge-02'], // Mocked for drill
            violatedInvariants: violated,
            dependencyHealth: {
                'identity-service': 'HEALTHY',
                'audit-vault': entry.payload?.dependency_health === 'MISSING' ? 'MISSING' : 'HEALTHY'
            },
            recommendation: violated.length > 0 ? 'PROHIBITED' : 'PROCEED'
        };
    }
}

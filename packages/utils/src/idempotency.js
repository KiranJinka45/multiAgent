"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdempotencyManager = void 0;
const server_1 = require("./server");
const events_1 = require("@packages/events");
const observability_1 = require("@packages/observability");
// Defensive metric imports — gracefully degrade if observability hasn't compiled new exports
let idempotencyCollisionsTotal = { inc: () => { } };
let staleLockRecoveriesTotal = { inc: () => { } };
try {
    const obs = require('@packages/observability');
    if (obs.idempotencyCollisionsTotal)
        idempotencyCollisionsTotal = obs.idempotencyCollisionsTotal;
    if (obs.staleLockRecoveriesTotal)
        staleLockRecoveriesTotal = obs.staleLockRecoveriesTotal;
}
catch { /* metrics unavailable — non-fatal */ }
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
class IdempotencyManager {
    /**
     * Executes an operation that includes external side effects (e.g. Stripe).
     * Passes the key down to the operation so the external system can deduplicate it.
     */
    static async executeExternal(key, executionId, region, operation) {
        try {
            await server_1.db.idempotencyRecord.create({
                data: {
                    key,
                    executionId,
                    status: 'started',
                    region, // 🔥 Global Tier-1: Region-aware lock
                    lockedAt: new Date()
                }
            });
        }
        catch (error) {
            if (error.code === 'P2002') {
                const existing = await server_1.db.idempotencyRecord.findUnique({ where: { key } });
                if (!existing)
                    throw new Error(`[Idempotency] Race condition fetching key: ${key}`);
                if (existing.status === 'completed') {
                    idempotencyCollisionsTotal.inc({ action: 'cache_hit', region });
                    await events_1.eventBus.publish('audit.idempotency', { executionId, key, action: 'cache_hit', region });
                    return existing.response;
                }
                if (existing.status === 'started') {
                    const isStale = Date.now() - existing.lockedAt.getTime() > LOCK_TIMEOUT_MS;
                    if (isStale) {
                        observability_1.logger.warn(`[Idempotency] Recovering stale lock for key: ${key} (previous region: ${existing.region}, current: ${region})`);
                        staleLockRecoveriesTotal.inc();
                        await events_1.eventBus.publish('audit.idempotency', { executionId, key, action: 'stale_lock_recovered', prevRegion: existing.region, currentRegion: region });
                        await server_1.db.idempotencyRecord.update({
                            where: { key },
                            data: {
                                lockedAt: new Date(),
                                executionId,
                                region // 🔥 Steal the lock to current region
                            }
                        });
                        // Proceed to execution below
                    }
                    else {
                        throw new Error(`[Idempotency] Operation '${key}' is actively processing by region: ${existing.region}.`);
                    }
                }
                if (existing.status === 'failed') {
                    await server_1.db.idempotencyRecord.update({
                        where: { key },
                        data: {
                            status: 'started',
                            lockedAt: new Date(),
                            executionId,
                            region
                        }
                    });
                }
            }
            else {
                throw error;
            }
        }
        try {
            // Pass the key to the downstream callback for external deduplication
            const result = await operation(key);
            await server_1.db.idempotencyRecord.update({
                where: { key },
                data: {
                    status: 'completed',
                    completedAt: new Date(),
                    response: result
                }
            });
            return result;
        }
        catch (opError) {
            await server_1.db.idempotencyRecord.update({
                where: { key },
                data: { status: 'failed' }
            });
            throw opError;
        }
    }
    /**
     * Executes an operation involving pure DB mutations atomically.
     * Uses Prisma $transaction to guarantee that the idempotency lock and the
     * side effects commit or rollback together.
     */
    static async executeDbAtomic(key, executionId, region, operation) {
        // First check if it's already completed (cache check outside tx to avoid lock overhead)
        const existing = await server_1.db.idempotencyRecord.findUnique({ where: { key } });
        if (existing?.status === 'completed') {
            idempotencyCollisionsTotal.inc({ action: 'atomic_cache_hit', region });
            await events_1.eventBus.publish('audit.idempotency', { executionId, key, action: 'atomic_cache_hit', region });
            return existing.response;
        }
        if (existing?.status === 'started') {
            const isStale = Date.now() - existing.lockedAt.getTime() > LOCK_TIMEOUT_MS;
            if (!isStale) {
                throw new Error(`[Idempotency] Operation '${key}' is actively processing by region: ${existing.region}.`);
            }
            observability_1.logger.warn(`[Idempotency] Overwriting stale lock for key: ${key} during atomic execute (Region: ${region})`);
        }
        try {
            // Transaction boundary guarantees atomicity
            return await server_1.db.$transaction(async (tx) => {
                // Upsert to take the lock atomically inside the transaction
                await tx.idempotencyRecord.upsert({
                    where: { key },
                    create: {
                        key,
                        executionId,
                        status: 'started',
                        region, // 🔥 Global Tier-1
                        lockedAt: new Date()
                    },
                    update: {
                        executionId,
                        status: 'started',
                        region,
                        lockedAt: new Date()
                    }
                });
                const result = await operation(tx);
                // Mark completed in the same transaction
                await tx.idempotencyRecord.update({
                    where: { key },
                    data: {
                        status: 'completed',
                        completedAt: new Date(),
                        response: result
                    }
                });
                return result;
            });
        }
        catch (error) {
            // Transaction rolled back. If it was our side-effect that failed,
            // we manually update the record to 'failed' outside the transaction
            // so retries know it failed (or it just stays 'started' and times out, 
            // but setting it to 'failed' allows immediate retries).
            try {
                await server_1.db.idempotencyRecord.upsert({
                    where: { key },
                    create: { key, executionId, status: 'failed', region },
                    update: { status: 'failed', region }
                });
            }
            catch (fallbackErr) {
                // Ignore rollback recording errors
            }
            throw error;
        }
    }
}
exports.IdempotencyManager = IdempotencyManager;
//# sourceMappingURL=idempotency.js.map
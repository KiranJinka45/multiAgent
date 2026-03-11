import redis from '@queue/redis-client';
import logger from '@config/logger';
import { v4 as uuidv4 } from 'uuid';

export class OrchestratorLock {
    private workerId: string;
    private executionId: string;
    private lockKey: string;
    private isOwned: boolean = false;
    private renewalTimer: NodeJS.Timeout | null = null;
    private ttlSeconds: number;
    private abortController: AbortController;

    constructor(executionId: string, ttlSeconds: number = 60) {
        this.workerId = `worker-${uuidv4()}`;
        this.executionId = executionId;
        this.lockKey = `lock:execution:${executionId}`;
        this.ttlSeconds = ttlSeconds;
        this.abortController = new AbortController();
    }

    public getWorkerId() {
        return this.workerId;
    }

    public getLockKey() {
        return this.lockKey;
    }

    public getAbortSignal() {
        return this.abortController.signal;
    }

    /**
     * Attempts to acquire the lock. Returns true if successful.
     */
    async acquire(): Promise<boolean> {
        const acquired = await redis.set(this.lockKey, this.workerId, 'EX', this.ttlSeconds, 'NX');
        if (acquired === 'OK') {
            this.isOwned = true;
            this.startRenewal();
            logger.info({ executionId: this.executionId, workerId: this.workerId }, 'Acquired exclusive execution lock');
            return true;
        }

        // Check if we somehow already own it
        const currentOwner = await redis.get(this.lockKey);
        if (currentOwner === this.workerId) {
            this.isOwned = true;
            this.startRenewal();
            return true;
        }

        return false;
    }

    /**
     * Re-acquires an existing lock if we know the workerId
     */
    async forceAcquire(): Promise<void> {
        await redis.set(this.lockKey, this.workerId, 'EX', this.ttlSeconds);
        this.isOwned = true;
        this.startRenewal();
        logger.info({ executionId: this.executionId, workerId: this.workerId }, 'Force-acquired execution lock');
    }

    /**
     * Starts the heartbeat renewal loop
     */
    private startRenewal() {
        if (this.renewalTimer) clearInterval(this.renewalTimer);

        // Renew every 3 seconds
        this.renewalTimer = setInterval(async () => {
            try {
                const script = `
                    if redis.call("get", KEYS[1]) == ARGV[1] then
                        return redis.call("expire", KEYS[1], ARGV[2])
                    else
                        return 0
                    end
                `;
                const result = await redis.eval(script, 1, this.lockKey, this.workerId, this.ttlSeconds);

                if (result === 0) {
                    logger.fatal({ executionId: this.executionId, workerId: this.workerId }, 'Lock stolen or expired! Aborting execution.');
                    this.isOwned = false;
                    this.abortController.abort();
                    this.stopRenewal();
                }
            } catch (err) {
                logger.error({ err, executionId: this.executionId }, 'Failed to renew lock');
            }
        }, 3000);
    }

    /**
     * Synchronously checks if lock is still owned.
     */
    async verify(): Promise<boolean> {
        if (!this.isOwned) return false;
        const current = await redis.get(this.lockKey);
        if (current !== this.workerId) {
            this.isOwned = false;
            this.abortController.abort();
            this.stopRenewal();
            return false;
        }
        return true;
    }

    /**
     * Ensure we own the lock, or throw an error.
     */
    async ensureOwnership(): Promise<void> {
        const valid = await this.verify();
        if (!valid) {
            throw new Error(`Execution aborted: Worker ${this.workerId} lost lock for execution ${this.executionId}`);
        }
    }

    /**
     * Stops the renewal timer but doesn't release the lock.
     */
    stopRenewal() {
        if (this.renewalTimer) {
            clearInterval(this.renewalTimer);
            this.renewalTimer = null;
        }
    }

    /**
     * Releases the lock safely.
     */
    async release(): Promise<void> {
        this.stopRenewal();
        if (!this.isOwned) return;

        const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        `;
        try {
            await redis.eval(script, 1, this.lockKey, this.workerId);
            this.isOwned = false;
            logger.info({ executionId: this.executionId, workerId: this.workerId }, 'Released execution lock');
        } catch (err) {
            logger.error({ err, executionId: this.executionId }, 'Failed to release lock');
        }
    }
}

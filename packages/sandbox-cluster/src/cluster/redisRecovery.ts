/**
 * redisRecovery.ts
 *
 * Redis Restart / Crash Recovery for the Fat Cluster.
 */

import { redis, logger } from '@packages/utils';
import { NodeRegistry } from './nodeRegistry';
import { ContainerManager } from '../runtime/containerManager';
import { PreviewRegistry } from '@packages/registry';

const RECOVERY_KEY = 'cluster:recovery:lastRun';
const MAX_RETRIES = 30;
const RETRY_INTERVAL_MS = 2000;

export const RedisRecovery = {
    async isRedisAlive(): Promise<boolean> {
        try {
            const pong = await redis.ping();
            return pong === 'PONG';
        } catch {
            return false;
        }
    },

    async waitForRedis(): Promise<boolean> {
        logger.warn('[RedisRecovery] Redis unreachable — waiting for recovery...');

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            const alive = await this.isRedisAlive();
            if (alive) {
                logger.info({ attempt }, '[RedisRecovery] Redis is back online');
                return true;
            }

            const delay = Math.min(RETRY_INTERVAL_MS * attempt, 30_000);
            logger.warn({ attempt, maxRetries: MAX_RETRIES, nextRetryMs: delay }, '[RedisRecovery] Still waiting...');
            await new Promise(r => setTimeout(r, delay));
        }

        logger.error('[RedisRecovery] Redis did not recover within retry limit');
        return false;
    },

    async performRecovery(): Promise<{ node: string; runtimesRecovered: number }> {
        logger.info('[RedisRecovery] Starting full state recovery');

        const nodeId = await NodeRegistry.register();
        logger.info({ nodeId }, '[RedisRecovery] Node re-registered');

        const survivingContainers = ContainerManager.listLocalContainers();
        logger.info({ count: survivingContainers.length }, '[RedisRecovery] Found surviving containers');

        let runtimesRecovered = 0;

        for (const container of survivingContainers) {
            try {
                if (container.status !== 'RUNNING') continue;

                // Re-init registry
                await PreviewRegistry.init(container.projectId, `recovery-${Date.now()}`);
                
                // Mark as RUNNING (using localhost for worker local access)
                const url = `http://localhost:${container.port}`;
                await PreviewRegistry.update(container.projectId, {
                    status: 'RUNNING',
                    url,
                    ports: [container.port]
                });

                NodeRegistry.incrementRunning();
                runtimesRecovered++;
                logger.info({ projectId: container.projectId }, '[RedisRecovery] Runtime recovered');

            } catch (err) {
                logger.error({ projectId: container.projectId, err }, '[RedisRecovery] Failed to recover runtime');
            }
        }

        await redis.set(RECOVERY_KEY, JSON.stringify({
            nodeId,
            recoveredAt: new Date().toISOString(),
            runtimesRecovered,
        }));

        logger.info({ nodeId, runtimesRecovered }, '[RedisRecovery] Recovery complete');

        return { node: nodeId, runtimesRecovered };
    },

    async handleRedisCrash(): Promise<void> {
        const recovered = await this.waitForRedis();
        if (!recovered) {
            logger.error('[RedisRecovery] Cannot recover — exiting process for supervisor restart');
            process.exit(1);
        }

        await this.performRecovery();
    }
};





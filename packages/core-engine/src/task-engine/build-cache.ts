import { redis, logger } from '@libs/utils/server';

/**
 * BuildCache - Redis-backed cache for granular build artifacts.
 * 
 * Stores implementation results indexed by a composite key of:
 * [taskType]:[promptHash]:[dependenciesHash]
 */
export class BuildCache {
    private static TTL = 24 * 60 * 60; // 24 Hours

    static async get(key: string): Promise<Record<string, unknown> | null> {
        try {
            const data = await redis.get(`build:cache:${key}`);
            if (!data) return null;
            return JSON.parse(data);
        } catch (err) {
            logger.warn({ key, err }, '[BuildCache] Cache retrieval failed');
            return null;
        }
    }

    static async set(key: string, data: Record<string, unknown>) {
        try {
            await redis.set(`build:cache:${key}`, JSON.stringify(data), 'EX', this.TTL);
            logger.info({ key }, '[BuildCache] Artifact cached successfully');
        } catch (err) {
            logger.error({ key, err }, '[BuildCache] Failed to store artifact');
        }
    }

    /**
     * Generate a deterministic cache key for a task.
     */
    static generateKey(taskType: string, payload: Record<string, unknown>, dependencyResults: Record<string, unknown>[]): string {
        const payloadStr = JSON.stringify(payload);
        const depStr = JSON.stringify(dependencyResults);
        
        // Simple hash simulation
        const combined = `${taskType}|${payloadStr}|${depStr}`;
        return Buffer.from(combined).toString('base64').substring(0, 32);
    }
}

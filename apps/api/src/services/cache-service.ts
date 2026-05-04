import { redis } from '@packages/utils';
import crypto from 'crypto';

export class CacheService {
    /**
     * Generates a deterministic hash for a prompt + context state.
     */
    static generateCacheKey(prompt: string, techStack: Record<string, unknown>): string {
        const raw = `${prompt}:${JSON.stringify(techStack)}`;
        return `codegen:${crypto.createHash('sha256').update(raw).digest('hex')}`;
    }

    /**
     * Saves code generation results (patches or full files) to Redis cache.
     * Caches expire after 7 days to prevent stale code drift.
     */
    static async setCachedResult(key: string, result: unknown, ttlSeconds: number = 7 * 24 * 60 * 60): Promise<void> {
        try {
            await redis.set(key, JSON.stringify(result), 'EX', ttlSeconds);
        } catch (error) {
            console.error('[CacheService] Failed to write cache', error);
        }
    }

    /**
     * Retrieves code generation results if they exist.
     */
    static async getCachedResult(key: string): Promise<unknown | null> {
        try {
            const cached = await redis.get(key);
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (error) {
            console.error('[CacheService] Failed to read cache', error);
        }
        return null;
    }
}


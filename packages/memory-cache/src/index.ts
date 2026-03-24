import { redis, logger } from '@libs/utils';
import crypto from 'crypto';

/**
 * Semantic Caching Layer
 * Reduces costs and latency by caching canonical prompt results in Redis.
 */
export class SemanticCacheService {
    private static PREFIX = 'cache:llm:';
    private static TTL = 60 * 60 * 24 * 7; // 7-day TTL for optimization

    /**
     * Normalizes and hashes the input to create a deterministic cache key.
     */
    private static generateKey(prompt: string, system?: string, model?: string): string {
        const payload = JSON.stringify({
            prompt: prompt.trim(),
            system: system?.trim() || '',
            model: model || 'default'
        });
        const hash = crypto.createHash('sha256').update(payload).digest('hex');
        return `${this.PREFIX}${hash}`;
    }

    /**
     * Attempt to retrieve a cached LLM response.
     */
    static async get<T>(prompt: string, system?: string, model?: string): Promise<T | null> {
        const key = this.generateKey(prompt, system, model);
        try {
            const cached = await redis.get(key);
            if (cached) {
                logger.info({ key }, '[SemanticCache] Hit - skipping LLM invocation');
                return JSON.parse(cached) as T;
            }
        } catch (error) {
            logger.error({ error, key }, '[SemanticCache] Get failed');
        }
        return null;
    }

    /**
     * Persists an LLM response to the semantic cache.
     */
    static async set(prompt: string, response: unknown, system?: string, model?: string): Promise<void> {
        const key = this.generateKey(prompt, system, model);
        try {
            await redis.set(key, JSON.stringify(response), 'EX', this.TTL);
            logger.info({ key }, '[SemanticCache] Response cached');
        } catch (error) {
            logger.error({ error, key }, '[SemanticCache] Set failed');
        }
    }

    static async invalidate(prompt: string, system?: string, model?: string): Promise<void> {
        const key = this.generateKey(prompt, system, model);
        await redis.del(key);
    }
}

export default SemanticCacheService;

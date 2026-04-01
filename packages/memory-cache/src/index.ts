import { redis, logger } from '@packages/utils';
import { LRUCache } from 'lru-cache';
import crypto from 'crypto';
import { cacheHitsTotal, cacheMissesTotal } from '@packages/observability';

/**
 * Semantic Caching Layer (Hybrid L1/L2)
 * Reduces costs and latency by caching canonical prompt results in memory (L1) and Redis (L2).
 * Includes "Single Flight" protection to prevent cache stampedes.
 */
export class SemanticCacheService {
    private static PREFIX = 'cache:llm:';
    private static TTL_REDIS = 60 * 60 * 24 * 7; // 7-day L2 TTL
    
    // L1: In-memory cache (LRU) - 50MB or 1000 items limit for efficiency
    private static l1 = new LRUCache<string, any>({
        max: 1000,
        ttl: 1000 * 60 * 15, // 15-minute L1 TTL
    });

    // Single Flight: Collapses identical concurrent requests into a single promise
    private static inflight = new Map<string, Promise<any>>();

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
     * Attempt to retrieve a cached LLM response using L1 -> L2 hierarchy.
     */
    static async get<T>(prompt: string, system?: string, model?: string): Promise<T | null> {
        const key = this.generateKey(prompt, system, model);

        // 1. Check L1 (Memory)
        const l1Hit = this.l1.get(key);
        if (l1Hit) {
            cacheHitsTotal.inc({ layer: 'l1' });
            aiCacheSavingsTotal.inc({ level: 'l1' }, 0.05);
            return l1Hit as T;
        }

        // 2. Check Single Flight (Prevent Stampede)
        const inflightPromise = this.inflight.get(key);
        if (inflightPromise) {
            logger.debug({ key }, '[SemanticCache] Single Flight Hit - awaiting result');
            return inflightPromise;
        }

        // 3. Check L2 (Redis)
        try {
            const cached = await redis.get(key);
            if (cached) {
                const parsed = JSON.parse(cached) as T;
                // Backfill L1
                this.l1.set(key, parsed);
                cacheHitsTotal.inc({ layer: 'l2' });
                aiCacheSavingsTotal.inc({ level: 'l2' }, 0.04);
                return parsed;
            }
        } catch (error) {
            logger.error({ error, key }, '[SemanticCache] L2 Get failed');
        }

        cacheMissesTotal.inc();
        return null;
    }

    /**
     * Persists an LLM response to both L1 and L2 layers.
     */
    static async set(prompt: string, response: unknown, system?: string, model?: string): Promise<void> {
        const key = this.generateKey(prompt, system, model);
        try {
            // Update LRU
            this.l1.set(key, response);
            // Update Redis
            await redis.set(key, JSON.stringify(response), 'EX', this.TTL_REDIS);
            logger.info({ key }, '[SemanticCache] L1/L2 Response cached');
        } catch (error) {
            logger.error({ error, key }, '[SemanticCache] Set failed');
        }
    }

    /**
     * Wrap a request with Single Flight protection
     */
    static async fetchWithProtection<T>(
        prompt: string, 
        system: string | undefined, 
        model: string | undefined,
        fetcher: () => Promise<T>
    ): Promise<T> {
        const key = this.generateKey(prompt, system, model);
        
        // 1. Try cache first
        const existing = await this.get<T>(prompt, system, model);
        if (existing) return existing;

        // 2. Not in cache? Use Single Flight for the heavy fetch
        if (this.inflight.has(key)) {
            return this.inflight.get(key);
        }

        const promise = fetcher().finally(() => {
            this.inflight.delete(key);
        });

        this.inflight.set(key, promise);
        
        const result = await promise;
        await this.set(prompt, result, system, model);
        return result;
    }

    static async invalidate(prompt: string, system?: string, model?: string): Promise<void> {
        const key = this.generateKey(prompt, system, model);
        this.l1.delete(key);
        await redis.del(key);
    }
}

export default SemanticCacheService;

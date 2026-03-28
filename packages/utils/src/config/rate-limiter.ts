import { redis } from '../server/redis';
import logger from './logger';

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    retryAfter?: number;
}

const LUA_TOKEN_BUCKET = `
local key = KEYS[1]
local rate = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4] or 1)

local state = redis.call("HMGET", key, "tokens", "last_refreshed")
local last_tokens = tonumber(state[1])
local last_refreshed = tonumber(state[2])

if not last_tokens then
    last_tokens = capacity
    last_refreshed = now
end

local delta = math.max(0, now - last_refreshed)
local new_tokens = math.min(capacity, last_tokens + (delta * rate))

if new_tokens >= requested then
    local remaining = new_tokens - requested
    redis.call("HMSET", key, "tokens", remaining, "last_refreshed", now)
    redis.call("PEXPIRE", key, math.ceil((capacity / rate) * 1000))
    return {1, math.floor(remaining)}
else
    local wait_ms = math.ceil(((requested - new_tokens) / rate) * 1000)
    return {0, math.floor(new_tokens), wait_ms}
end
`;

export class RateLimiter {
    /**
     * @param action unique identifier for the action (e.g., 'build', 'github-push')
     * @param userId user identifier
     * @param limit tokens per window (e.g., 3)
     * @param windowMs window in milliseconds (e.g., 3600000 for 1 hour)
     */
    static async checkLimit(
        action: string,
        userId: string,
        limit: number,
        windowMs: number
    ): Promise<RateLimitResult> {
        try {
            const key = `ratelimit:${action}:${userId}`;
            const rate = limit / (windowMs / 1000); // tokens per second
            const now = Date.now() / 1000;

            const result = await redis.eval(
                LUA_TOKEN_BUCKET,
                1,
                key,
                rate.toString(),
                limit.toString(),
                now.toString(),
                '1'
            ) as [number, number, number?];

            const [allowed, remaining, waitMs] = result;

            return {
                allowed: allowed === 1,
                remaining: remaining,
                retryAfter: waitMs ? Math.ceil(waitMs / 1000) : undefined
            };
        } catch (error) {
            logger.error({ error, action, userId }, 'Rate limiter failure. Failing open for safety.');
            return { allowed: true, remaining: 1 };
        }
    }

    // Convenience methods for specific SaaS rules
    static async checkBuildLimit(userId: string, isPro: boolean) {
        // Free: 3/hr, Pro: Unlimited (effectively very high)
        const limit = isPro ? 100 : 3;
        return this.checkLimit('build', userId, limit, 3600 * 1000);
    }

    static async checkGithubLimit(userId: string, isPro: boolean) {
        const limit = isPro ? 5 : 1;
        return this.checkLimit('github-push', userId, limit, 3600 * 1000);
    }

    static async checkExportLimit(userId: string) {
        return this.checkLimit('export', userId, 10, 3600 * 1000);
    }
}

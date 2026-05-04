"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = void 0;
const ioredis_1 = require("ioredis");
const observability_1 = require("@packages/observability");
const config_1 = require("@packages/config");
/**
 * GLOBAL CIRCUIT BREAKER
 * Synchronizes failure state across all cluster nodes via Redis.
 * Prevents cascading failures by halting non-critical ingestion during outages.
 */
class CircuitBreaker {
    static STATE_KEY = 'system:circuit_breaker:state';
    static REASON_KEY = 'system:circuit_breaker:reason';
    static PROBE_COUNT = 'system:circuit_breaker:probe_count';
    static redis;
    static setRedis(redis) {
        this.redis = redis;
    }
    static getRedis() {
        if (!this.redis) {
            this.redis = new ioredis_1.Redis(config_1.serverConfig.REDIS_URL || 'redis://localhost:6379');
        }
        return this.redis;
    }
    /**
     * Checks if the circuit is currently allowing traffic.
     */
    static async allowRequest() {
        const redis = this.getRedis();
        const state = await redis.get(this.STATE_KEY) || 'CLOSED';
        if (state === 'CLOSED')
            return true;
        if (state === 'OPEN') {
            const ttl = await redis.ttl(this.STATE_KEY);
            if (ttl <= 0) {
                await redis.set(this.STATE_KEY, 'HALF_OPEN');
                return true;
            }
            return false;
        }
        if (state === 'HALF_OPEN') {
            return Math.random() < 0.1;
        }
        return true;
    }
    /**
     * Trips the circuit breaker to OPEN state.
     */
    static async trip(reason, durationSeconds = 60) {
        const redis = this.getRedis();
        observability_1.logger.error({ reason, durationSeconds }, '🚨 CIRCUIT BREAKER: OPEN');
        await redis.set(this.STATE_KEY, 'OPEN', 'EX', durationSeconds);
        await redis.set(this.REASON_KEY, reason, 'EX', durationSeconds);
        await redis.del(this.PROBE_COUNT);
    }
    /**
     * Success signal from a probe request.
     */
    static async recordSuccess() {
        const redis = this.getRedis();
        const state = await redis.get(this.STATE_KEY);
        if (state === 'HALF_OPEN') {
            const count = await redis.incr(this.PROBE_COUNT);
            if (count >= 10) {
                await this.reset();
                observability_1.logger.info('✅ CIRCUIT BREAKER: CLOSED (Recovery Successful)');
            }
        }
    }
    /**
     * Manually resets the circuit breaker.
     */
    static async reset() {
        const redis = this.getRedis();
        await redis.del(this.STATE_KEY);
        await redis.del(this.REASON_KEY);
        await redis.del(this.PROBE_COUNT);
    }
    static async getReason() {
        return this.getRedis().get(this.REASON_KEY);
    }
}
exports.CircuitBreaker = CircuitBreaker;
//# sourceMappingURL=breaker.js.map
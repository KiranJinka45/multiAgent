import { redis } from '@queue';
import logger from '@config/logger';

export interface ReliabilityStats {
    totalBuilds: number;
    successfulBuilds: number;
    failedBuilds: number;
    successRate: number;
    avgGenerationTime: number;
}

export class ReliabilityMonitor {
    private static KEY_PREFIX = 'reliability:';

    /**
     * Records a new build initiation.
     */
    static async recordStart() {
        try {
            await redis.incr(`${this.KEY_PREFIX}total`);
            await this.recordDaily('total');
        } catch (err) {
            logger.error({ err }, '[ReliabilityMonitor] Failed to record start');
        }
    }

    /**
     * Records a successful build completion.
     */
    static async recordSuccess(durationMs?: number) {
        try {
            await redis.incr(`${this.KEY_PREFIX}success`);
            await this.recordDaily('success');
            if (durationMs) {
                await redis.lpush(`${this.KEY_PREFIX}durations`, durationMs.toString());
                await redis.ltrim(`${this.KEY_PREFIX}durations`, 0, 99); // Keep last 100
            }
        } catch (err) {
            logger.error({ err }, '[ReliabilityMonitor] Failed to record success');
        }
    }

    /**
     * Records a build failure.
     */
    static async recordFailure() {
        try {
            await redis.incr(`${this.KEY_PREFIX}failure`);
            await this.recordDaily('failure');
        } catch (err) {
            logger.error({ err }, '[ReliabilityMonitor] Failed to record failure');
        }
    }

    /**
     * Fetches current reliability statistics.
     */
    static async getStats(): Promise<ReliabilityStats> {
        try {
            const [total, success, failure, durations] = await Promise.all([
                redis.get(`${this.KEY_PREFIX}total`),
                redis.get(`${this.KEY_PREFIX}success`),
                redis.get(`${this.KEY_PREFIX}failure`),
                redis.lrange(`${this.KEY_PREFIX}durations`, 0, -1)
            ]);

            const totalNum = parseInt(total || '0');
            const successNum = parseInt(success || '0');
            const failureNum = parseInt(failure || '0');
            
            const successRate = totalNum > 0 ? (successNum / totalNum) * 100 : 0;
            
            const avgTime = durations.length > 0 
                ? durations.reduce((acc, d) => acc + parseInt(d), 0) / durations.length 
                : 0;

            return {
                totalBuilds: totalNum,
                successfulBuilds: successNum,
                failedBuilds: failureNum,
                successRate,
                avgGenerationTime: avgTime / 1000 // In seconds
            };
        } catch (err) {
            logger.error({ err }, '[ReliabilityMonitor] Failed to fetch stats');
            return { totalBuilds: 0, successfulBuilds: 0, failedBuilds: 0, successRate: 0, avgGenerationTime: 0 };
        }
    }

    private static async recordDaily(type: 'total' | 'success' | 'failure') {
        const date = new Date().toISOString().split('T')[0];
        await redis.hincrby(`${this.KEY_PREFIX}daily:${date}`, type, 1);
        await redis.expire(`${this.KEY_PREFIX}daily:${date}`, 86400 * 30); // 30 days retention
    }
}

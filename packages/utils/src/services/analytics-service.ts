import logger from '../logger';
import { redis } from './redis/index';

export class AnalyticsService {
    /**
     * Track a view on a shared preview.
     */
    static async trackShareView(previewId: string, referrer?: string) {
        try {
            const key = `stats:preview:${previewId}:views`;
            await redis.incr(key);
            
            // Daily aggregation
            const today = new Date().toISOString().split('T')[0];
            const dailyKey = `stats:daily:${today}:views`;
            await redis.incr(dailyKey);

            logger.info({ previewId, referrer }, '[AnalyticsService] Tracked share view');
        } catch (error) {
            logger.error({ error }, '[AnalyticsService] Failed to track view');
        }
    }

    /**
     * Get view counts for a project.
     */
    static async getViewCount(previewId: string): Promise<number> {
        const count = await redis.get(`stats:preview:${previewId}:views`);
        return count ? parseInt(count, 10) : 0;
    }
}

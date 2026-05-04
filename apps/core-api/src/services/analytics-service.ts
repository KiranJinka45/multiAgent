import logger from '@packages/utils';
import redis from '@packages/utils';

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
     * Track a remix event on a project.
     */
    static async trackRemix(previewId: string) {
        try {
            const key = `stats:preview:${previewId}:remixes`;
            await redis.incr(key);
            
            const today = new Date().toISOString().split('T')[0];
            const dailyKey = `stats:daily:${today}:remixes`;
            await redis.incr(dailyKey);

            logger.info({ previewId }, '[AnalyticsService] Tracked remix');
        } catch (error) {
            logger.error({ error }, '[AnalyticsService] Failed to track remix');
        }
    }

    /**
     * Get remix counts for a project.
     */
    static async getRemixCount(previewId: string): Promise<number> {
        const count = await redis.get(`stats:preview:${previewId}:remixes`);
        return count ? parseInt(count, 10) : 0;
    }
}


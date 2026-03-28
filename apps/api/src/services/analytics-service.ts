import { logger } from '@packages/observability';
import { redis } from '@packages/utils/server';

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
     * Track an edit event on a project.
     */
    static async trackEdit(previewId: string) {
        try {
            const key = `stats:preview:${previewId}:edits`;
            await redis.incr(key);
            
            const today = new Date().toISOString().split('T')[0];
            const dailyKey = `stats:daily:${today}:edits`;
            await redis.incr(dailyKey);

            logger.info({ previewId }, '[AnalyticsService] Tracked edit');
        } catch (error) {
            logger.error({ error }, '[AnalyticsService] Failed to track edit');
        }
    }

    /**
     * Track the "wow moment" when a preview first loads.
     */
    static async trackWowMoment(previewId: string) {
        try {
            const key = `stats:preview:${previewId}:wow`;
            const hasWowed = await redis.get(key);
            if (hasWowed) return;

            await redis.set(key, '1');
            
            const today = new Date().toISOString().split('T')[0];
            const dailyKey = `stats:daily:${today}:wow`;
            await redis.incr(dailyKey);

            logger.info({ previewId }, '[AnalyticsService] Tracked wow moment');
        } catch (error) {
            logger.error({ error }, '[AnalyticsService] Failed to track wow moment');
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

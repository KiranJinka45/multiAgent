import { redis } from "./server";
import { logger } from "@packages/observability";

/**
 * GLOBAL STATE SYNC SERVICE
 * Orchestrates cross-region state synchronization for unified platform visibility.
 */
export class GlobalStateSyncService {
    private static readonly GLOBAL_PREFIX = 'platform:global:';
    private static readonly REGION_ID = process.env.AWS_REGION || 'us-east-1';

    /**
     * Synchronizes regional health and certification state to the global backbone.
     */
    static async syncRegionalState() {
        try {
            const localCert = await redis.get('system:certification:live');
            if (!localCert) return;

            const state = JSON.parse(localCert);
            
            // Push regional state to global map
            await redis.hset(
                `${this.GLOBAL_PREFIX}certification`,
                this.REGION_ID,
                JSON.stringify({
                    ...state,
                    syncedAt: new Date().toISOString()
                })
            );

            logger.debug({ region: this.REGION_ID }, '[GlobalSync] Regional state synced successfully');
        } catch (err) {
            logger.error({ err }, '[GlobalSync] Sync failed');
        }
    }

    /**
     * Retrieves the health state of all registered regions.
     */
    static async getGlobalHealth(): Promise<Record<string, any>> {
        const raw = await redis.hgetall(`${this.GLOBAL_PREFIX}certification`);
        const health: Record<string, any> = {};
        
        for (const [region, data] of Object.entries(raw)) {
            health[region] = JSON.parse(data as string);
        }
        
        return health;
    }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalStateSyncService = void 0;
const server_1 = require("./server");
const observability_1 = require("@packages/observability");
/**
 * GLOBAL STATE SYNC SERVICE
 * Orchestrates cross-region state synchronization for unified platform visibility.
 */
class GlobalStateSyncService {
    static GLOBAL_PREFIX = 'platform:global:';
    static REGION_ID = process.env.AWS_REGION || 'us-east-1';
    /**
     * Synchronizes regional health and certification state to the global backbone.
     */
    static async syncRegionalState() {
        try {
            const localCert = await server_1.redis.get('system:certification:live');
            if (!localCert)
                return;
            const state = JSON.parse(localCert);
            // Push regional state to global map
            await server_1.redis.hset(`${this.GLOBAL_PREFIX}certification`, this.REGION_ID, JSON.stringify({
                ...state,
                syncedAt: new Date().toISOString()
            }));
            observability_1.logger.debug({ region: this.REGION_ID }, '[GlobalSync] Regional state synced successfully');
        }
        catch (err) {
            observability_1.logger.error({ err }, '[GlobalSync] Sync failed');
        }
    }
    /**
     * Retrieves the health state of all registered regions.
     */
    static async getGlobalHealth() {
        const raw = await server_1.redis.hgetall(`${this.GLOBAL_PREFIX}certification`);
        const health = {};
        for (const [region, data] of Object.entries(raw)) {
            health[region] = JSON.parse(data);
        }
        return health;
    }
}
exports.GlobalStateSyncService = GlobalStateSyncService;
//# sourceMappingURL=global-sync.js.map
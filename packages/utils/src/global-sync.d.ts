/**
 * GLOBAL STATE SYNC SERVICE
 * Orchestrates cross-region state synchronization for unified platform visibility.
 */
export declare class GlobalStateSyncService {
    private static readonly GLOBAL_PREFIX;
    private static readonly REGION_ID;
    /**
     * Synchronizes regional health and certification state to the global backbone.
     */
    static syncRegionalState(): Promise<void>;
    /**
     * Retrieves the health state of all registered regions.
     */
    static getGlobalHealth(): Promise<Record<string, any>>;
}
//# sourceMappingURL=global-sync.d.ts.map
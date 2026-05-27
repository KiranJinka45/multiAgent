import { PathologyCoordinator, StoragePathologyConfig } from './pathology-coordinator.js';

export class StoragePathology {
    private coordinator: PathologyCoordinator;

    constructor(workspaceRoot: string) {
        this.coordinator = new PathologyCoordinator(workspaceRoot);
    }

    /**
     * Injects storage layer failures, fsync delays, or write throttling.
     */
    public async inject(config: StoragePathologyConfig): Promise<void> {
        console.log(`[Storage Pathology] Injected: fsync delay=${config.fsyncDelayMs}ms, Max IO ops/sec=${config.ioThrottleOpsPerSec}`);

        const active = this.coordinator.getActiveConfig();
        active.storage = config;
        this.coordinator.saveConfig(active);
    }

    /**
     * Clears all simulated storage degradation.
     */
    public async clear(): Promise<void> {
        console.log('[Storage Pathology] Clearing all storage pathologies...');
        const active = this.coordinator.getActiveConfig();
        active.storage = { fsyncDelayMs: 0, ioThrottleOpsPerSec: 0 };
        this.coordinator.saveConfig(active);
    }
}

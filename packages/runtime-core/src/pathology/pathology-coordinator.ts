import fs from 'fs';
import path from 'path';

export interface NetworkPathologyConfig {
    latencyMs: number;
    jitterMs: number;
    packetLossProb: number; // 0 to 1
}

export interface PartitionPathologyConfig {
    type: 'asymmetric' | 'watcher-drop' | null;
    durationMs: number;
}

export interface ResourcePressureConfig {
    cpuStarvationMs: number;
    memoryPressureMb: number;
}

export interface StoragePathologyConfig {
    fsyncDelayMs: number;
    ioThrottleOpsPerSec: number;
}

export interface TimeWarpConfig {
    offsetMs: number;
    monotonicOffsetNs: string;
    timeAcceleration: number;
    isLeapSmearing: boolean;
    leapSmearDurationMs: number;
    leapSmearOffsetMs: number;
    frozenTimeMs: number | null;
    injectedAtRealMs?: number;
    injectedAtMonoNs?: string;
}

export interface PathologyConfig {
    network: NetworkPathologyConfig;
    partition: PartitionPathologyConfig;
    resource: ResourcePressureConfig;
    storage: StoragePathologyConfig;
    timeWarp?: TimeWarpConfig;
    injectedAt?: number;
}

const DEFAULT_CONFIG: PathologyConfig = {
    network: { latencyMs: 0, jitterMs: 0, packetLossProb: 0 },
    partition: { type: null, durationMs: 0 },
    resource: { cpuStarvationMs: 0, memoryPressureMb: 0 },
    storage: { fsyncDelayMs: 0, ioThrottleOpsPerSec: 0 },
    timeWarp: {
        offsetMs: 0,
        monotonicOffsetNs: '0',
        timeAcceleration: 1.0,
        isLeapSmearing: false,
        leapSmearDurationMs: 0,
        leapSmearOffsetMs: 0,
        frozenTimeMs: null
    }
};

export class PathologyCoordinator {
    private workspaceRoot: string;
    private stateFilePath: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.stateFilePath = path.join(workspaceRoot, '.ztan', 'active_pathology.json');
    }

    /**
     * Retrieves the current active pathology configuration from shared state file.
     */
    public getActiveConfig(): PathologyConfig {
        try {
            if (fs.existsSync(this.stateFilePath)) {
                const raw = fs.readFileSync(this.stateFilePath, 'utf8');
                const parsed = JSON.parse(raw) as PathologyConfig;
                
                // Validate expiry on partitions
                if (parsed.partition && parsed.partition.type && parsed.injectedAt) {
                    if (Date.now() - parsed.injectedAt > parsed.partition.durationMs) {
                        // Automatically clear partition when it expires
                        parsed.partition.type = null;
                        this.saveConfig(parsed);
                    }
                }
                return parsed;
            }
        } catch (_e) {
            // Fallback under storage exhaustion or file lock contention
        }
        return { ...DEFAULT_CONFIG };
    }

    /**
     * Commits a new pathology configuration to the shared state file.
     */
    public saveConfig(config: PathologyConfig): void {
        try {
            const dir = path.dirname(this.stateFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            config.injectedAt = Date.now();
            fs.writeFileSync(this.stateFilePath, JSON.stringify(config, null, 2), 'utf8');
        } catch (e) {
            console.error(`[Pathology Coordinator] Failed to write state: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    /**
     * Resets all active pathologies to a clean state.
     */
    public clearAll(): void {
        this.saveConfig({ ...DEFAULT_CONFIG });
        try {
            if (fs.existsSync(this.stateFilePath)) {
                fs.unlinkSync(this.stateFilePath);
            }
        } catch (_e) {}
    }
}

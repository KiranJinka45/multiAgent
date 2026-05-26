import { PathologyCoordinator, ResourcePressureConfig } from './pathology-coordinator.js';

export class ResourcePressurePathology {
    private coordinator: PathologyCoordinator;
    private memoryHogs: any[] = [];
    private cpuSpinInterval: NodeJS.Timeout | null = null;

    constructor(workspaceRoot: string) {
        this.coordinator = new PathologyCoordinator(workspaceRoot);
    }

    /**
     * Injects resource limits and process starvation pressure.
     */
    public async inject(config: ResourcePressureConfig): Promise<void> {
        console.log(`[Resource Pressure] Starvation Triggered: CPU Starvation Time=${config.cpuStarvationMs}ms, Heap Buffer Limit=${config.memoryPressureMb}MB`);

        const active = this.coordinator.getActiveConfig();
        active.resource = config;
        this.coordinator.saveConfig(active);

        // 1. Simulate Memory Pressure by allocating actual memory chunks (to force high GC)
        if (config.memoryPressureMb > 0) {
            this.hogMemory(config.memoryPressureMb);
        }

        // 2. Simulate CPU Event-Loop Starvation via periodic synchronous spin blocking
        if (config.cpuStarvationMs > 0) {
            this.spinCpu(config.cpuStarvationMs);
        }
    }

    /**
     * Clears all simulated resource pressure limits.
     */
    public async clear(): Promise<void> {
        console.log('[Resource Pressure] Clearing resource pressure limits...');
        const active = this.coordinator.getActiveConfig();
        active.resource = { cpuStarvationMs: 0, memoryPressureMb: 0 };
        this.coordinator.saveConfig(active);

        // Release allocated memory buffers
        this.memoryHogs = [];
        if (global.gc) {
            try { global.gc(); } catch (e) {}
        }

        // Terminate CPU spinning interval
        if (this.cpuSpinInterval) {
            clearInterval(this.cpuSpinInterval);
            this.cpuSpinInterval = null;
        }
    }

    /**
     * Allocates memory buffers to induce garbage collection pauses.
     */
    private hogMemory(mb: number): void {
        this.memoryHogs = [];
        try {
            console.log(`[Resource Pressure] Allocating ${mb}MB heap buffers to simulate container limits...`);
            // Create byte array allocations
            for (let i = 0; i < mb; i++) {
                // 1MB byte buffer
                this.memoryHogs.push(Buffer.alloc(1024 * 1024));
            }
        } catch (e) {
            console.warn(`[Resource Pressure] Memory allocation bounded due to heap exhaustion: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    /**
     * Blocks the main single-threaded event loop synchronously to simulate severe CPU starvation.
     */
    private spinCpu(ms: number): void {
        if (this.cpuSpinInterval) {
            clearInterval(this.cpuSpinInterval);
        }

        console.log(`[Resource Pressure] Scheduling event-loop synchronous locks of ${ms}ms...`);
        
        // Block the loop every 500ms for simulated time period
        this.cpuSpinInterval = setInterval(() => {
            const start = Date.now();
            console.log(`[Resource Pressure] Event-loop LOCKED synchronously for simulated CPU starvation...`);
            while (Date.now() - start < ms) {
                // Synchronous spin block to simulate absolute scheduling starvation
            }
            console.log(`[Resource Pressure] Event-loop RELEASED.`);
        }, 1500);
    }
}

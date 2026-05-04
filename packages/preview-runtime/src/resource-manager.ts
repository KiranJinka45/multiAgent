import os from 'os';
import { logger } from '@packages/utils';

export interface ResourceSnapshot {
    totalMem: number;
    freeMem: number;
    cpuCount: number;
    loadAvg: number[];
}

export class ResourceManager {
    private static MAX_MEMORY_USAGE = 0.85; // 85% of total RAM
    private static MAX_LOAD_AVG = 0.80;   // 80% per CPU core
    private static memOverrideMb: number | null = null;

    static setTestMemoryLimit(mb: number | null) {
        this.memOverrideMb = mb;
    }

    static getSnapshot(): ResourceSnapshot {
        return {
            totalMem: os.totalmem(),
            freeMem: os.freemem(),
            cpuCount: os.cpus().length,
            loadAvg: os.loadavg()
        };
    }

    static canAllocate(requiredMemMb: number): boolean {
        const snapshot = this.getSnapshot();
        const memLimit = this.memOverrideMb ? this.memOverrideMb * 1024 * 1024 : snapshot.totalMem * this.MAX_MEMORY_USAGE;
        const currentUsage = snapshot.totalMem - snapshot.freeMem;
        
        const projectedUsage = currentUsage + (requiredMemMb * 1024 * 1024);
        const cpuWait = snapshot.loadAvg[0] / snapshot.cpuCount;

        const hasMem = projectedUsage < memLimit;
        const hasCpu = cpuWait < this.MAX_LOAD_AVG;

        logger.info({ 
            hasMem, 
            hasCpu, 
            currentUsageMb: Math.round(currentUsage / 1024 / 1024), 
            projectedUsageMb: Math.round(projectedUsage / 1024 / 1024),
            memLimitMb: Math.round(memLimit / 1024 / 1024),
            cpuLoad: cpuWait.toFixed(2)
        }, '[ResourceManager] Capacity check');

        return hasMem && hasCpu;
    }

    static getHostCapacity() {
        const snapshot = this.getSnapshot();
        return {
            totalMemMb: Math.round(snapshot.totalMem / 1024 / 1024),
            freeMemMb: Math.round(snapshot.freeMem / 1024 / 1024),
            cpuCount: snapshot.cpuCount,
            load: snapshot.loadAvg[0]
        };
    }
}




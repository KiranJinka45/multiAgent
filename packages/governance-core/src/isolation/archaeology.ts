import * as fs from 'fs';
import * as os from 'os';

export interface ResourceSnapshot {
    freeMemoryBytes: number;
    totalMemoryBytes: number;
    memoryPressure: number; // 0.0 to 1.0
    diskSpaceFreeBytes?: number;
    degraded: boolean;
    reason?: string;
}

export class ResourceArchaeologist {
    private static CRITICAL_MEM_THRESHOLD = 0.95; // 95% used

    static takeSnapshot(rootfsDir: string = '/var/lib/ztan'): ResourceSnapshot {
        // Read memory from env overrides if set for testing
        const totalMem = process.env.ZTAN_TEST_TOTAL_MEM 
            ? parseInt(process.env.ZTAN_TEST_TOTAL_MEM, 10) 
            : os.totalmem();
        const freeMem = process.env.ZTAN_TEST_FREE_MEM 
            ? parseInt(process.env.ZTAN_TEST_FREE_MEM, 10) 
            : os.freemem();
        
        const memoryPressure = (totalMem - freeMem) / totalMem;
        
        let degraded = memoryPressure > this.CRITICAL_MEM_THRESHOLD;
        let reason = degraded ? 'CRITICAL_MEMORY_EXHAUSTION' : undefined;

        let diskSpaceFreeBytes: number | undefined;
        
        // Read disk from env override if set for testing
        if (process.env.ZTAN_TEST_DISK_FREE) {
            diskSpaceFreeBytes = parseInt(process.env.ZTAN_TEST_DISK_FREE, 10);
            if (diskSpaceFreeBytes < 52428800) {
                degraded = true;
                reason = reason ? `${reason}_AND_DISK_EXHAUSTION` : 'CRITICAL_DISK_EXHAUSTION';
            }
        } else {
            try {
                if (fs.existsSync(rootfsDir)) {
                    if (typeof fs.statfsSync === 'function') {
                        const stats = fs.statfsSync(rootfsDir);
                        diskSpaceFreeBytes = stats.bfree * stats.bsize;
                        
                        if (diskSpaceFreeBytes < 52428800) {
                            degraded = true;
                            reason = reason ? `${reason}_AND_DISK_EXHAUSTION` : 'CRITICAL_DISK_EXHAUSTION';
                        }
                    }
                }
            } catch {
                // ignore
            }
        }

        return {
            freeMemoryBytes: freeMem,
            totalMemoryBytes: totalMem,
            memoryPressure,
            diskSpaceFreeBytes,
            degraded,
            reason
        };
    }
}

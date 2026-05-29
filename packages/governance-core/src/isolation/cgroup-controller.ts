import * as fs from 'fs';
import * as path from 'path';

export class CgroupController {
    static CGROUP_ROOT = '/sys/fs/cgroup';

    static applyMemoryLimit(vmId: string, limitBytes: number): void {
        const isWindows = process.platform === 'win32';
        if (isWindows || !fs.existsSync(this.CGROUP_ROOT)) {
            console.warn(`[CGROUP] Cgroups not supported on this platform. Skipping memory limit write.`);
            return;
        }

        const pathMax = path.join(this.CGROUP_ROOT, `ztan-sandbox/${vmId}/memory.max`);
        try {
            fs.mkdirSync(path.dirname(pathMax), { recursive: true });
            fs.writeFileSync(pathMax, limitBytes.toString());
        } catch (e: any) {
            console.error(`[CGROUP] Failed to apply memory limit: ${e.message}`);
        }
    }

    static applyCpuLimit(vmId: string, percent: number): void {
        const isWindows = process.platform === 'win32';
        if (isWindows || !fs.existsSync(this.CGROUP_ROOT)) {
            console.warn(`[CGROUP] Cgroups not supported on this platform. Skipping CPU limit write.`);
            return;
        }

        const pathMax = path.join(this.CGROUP_ROOT, `ztan-sandbox/${vmId}/cpu.max`);
        try {
            fs.mkdirSync(path.dirname(pathMax), { recursive: true });
            const quota = Math.round(percent * 1000);
            fs.writeFileSync(pathMax, `${quota} 100000`);
        } catch (e: any) {
            console.error(`[CGROUP] Failed to apply CPU limit: ${e.message}`);
        }
    }

    static isSupported(): boolean {
        return process.platform !== 'win32' && fs.existsSync(this.CGROUP_ROOT);
    }
}

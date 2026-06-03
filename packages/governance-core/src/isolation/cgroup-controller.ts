import * as fs from 'fs';
import * as path from 'path';

export class CgroupController {
    static CGROUP_ROOT = '/sys/fs/cgroup';

    private static ensureControllers(): void {
        try {
            const sandboxDir = path.join(this.CGROUP_ROOT, 'ztan-sandbox');
            if (!fs.existsSync(sandboxDir)) {
                fs.mkdirSync(sandboxDir, { recursive: true });
            }

            const rootControl = path.join(this.CGROUP_ROOT, 'cgroup.subtree_control');
            const rootControllers = path.join(this.CGROUP_ROOT, 'cgroup.controllers');
            if (fs.existsSync(rootControllers)) {
                 console.log(`[CGROUP Adversarial] Root cgroup.controllers before: ${fs.readFileSync(rootControllers, 'utf8').trim()}`);
            }
            if (fs.existsSync(rootControl)) {
                console.log(`[CGROUP Adversarial] Root cgroup.subtree_control before: ${fs.readFileSync(rootControl, 'utf8').trim()}`);
                const content = fs.readFileSync(rootControl, 'utf8');
                const needed = ['cpu', 'cpuset', 'memory'];
                const toAdd = needed.filter(c => !content.includes(c)).map(c => `+${c}`).join(' ');
                if (toAdd) {
                    fs.writeFileSync(rootControl, toAdd);
                }
                console.log(`[CGROUP Adversarial] Root cgroup.subtree_control after: ${fs.readFileSync(rootControl, 'utf8').trim()}`);
            }

            const sandboxControl = path.join(sandboxDir, 'cgroup.subtree_control');
            const sandboxControllers = path.join(sandboxDir, 'cgroup.controllers');
            if (fs.existsSync(sandboxControllers)) {
                 console.log(`[CGROUP Adversarial] Sandbox cgroup.controllers before: ${fs.readFileSync(sandboxControllers, 'utf8').trim()}`);
            }
            if (fs.existsSync(sandboxControl)) {
                console.log(`[CGROUP Adversarial] Sandbox cgroup.subtree_control before: ${fs.readFileSync(sandboxControl, 'utf8').trim()}`);
                const content = fs.readFileSync(sandboxControl, 'utf8');
                const needed = ['cpu', 'cpuset', 'memory'];
                const toAdd = needed.filter(c => !content.includes(c)).map(c => `+${c}`).join(' ');
                if (toAdd) {
                    fs.writeFileSync(sandboxControl, toAdd);
                }
                console.log(`[CGROUP Adversarial] Sandbox cgroup.subtree_control after: ${fs.readFileSync(sandboxControl, 'utf8').trim()}`);
            }
        } catch (e: any) {
            console.warn(`[CGROUP] Failed to delegate subtree control: ${e.message}`);
        }
    }

    static applyMemoryLimit(vmId: string, limitBytes: number): void {
        const isWindows = process.platform === 'win32';
        if (isWindows || !fs.existsSync(this.CGROUP_ROOT)) {
            console.warn(`[CGROUP] Cgroups not supported on this platform. Skipping memory limit write.`);
            return;
        }

        this.ensureControllers();

        const pathMax = path.join(this.CGROUP_ROOT, `ztan-sandbox/${vmId}/memory.max`);
        try {
            fs.mkdirSync(path.dirname(pathMax), { recursive: true });
            fs.writeFileSync(pathMax, limitBytes.toString());
            console.log(`[CGROUP Adversarial] Successfully wrote to memory.max at ${pathMax} without EACCES`);
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

        this.ensureControllers();

        const pathMax = path.join(this.CGROUP_ROOT, `ztan-sandbox/${vmId}/cpu.max`);
        try {
            fs.mkdirSync(path.dirname(pathMax), { recursive: true });
            const quota = Math.round(percent * 100000);
            fs.writeFileSync(pathMax, `${quota} 100000`);
            console.log(`[CGROUP Adversarial] Successfully wrote to cpu.max at ${pathMax} without EACCES`);
        } catch (e: any) {
            console.error(`[CGROUP] Failed to apply CPU limit: ${e.message}`);
        }
    }

    static applyCpuAffinity(vmId: string, cpuset: string): void {
        const isWindows = process.platform === 'win32';
        if (isWindows || !fs.existsSync(this.CGROUP_ROOT)) {
            console.warn(`[CGROUP] Cgroups not supported on this platform. Skipping CPU affinity write.`);
            return;
        }

        this.ensureControllers();

        const pathMax = path.join(this.CGROUP_ROOT, `ztan-sandbox/${vmId}/cpuset.cpus`);
        try {
            fs.mkdirSync(path.dirname(pathMax), { recursive: true });
            fs.writeFileSync(pathMax, cpuset);
        } catch (e: any) {
            console.error(`[CGROUP] Failed to apply CPU affinity: ${e.message}`);
        }
    }

    static applyMemoryNodes(vmId: string, mems: string): void {
        const isWindows = process.platform === 'win32';
        if (isWindows || !fs.existsSync(this.CGROUP_ROOT)) {
            console.warn(`[CGROUP] Cgroups not supported on this platform. Skipping memory nodes write.`);
            return;
        }

        this.ensureControllers();

        const pathMems = path.join(this.CGROUP_ROOT, `ztan-sandbox/${vmId}/cpuset.mems`);
        try {
            fs.mkdirSync(path.dirname(pathMems), { recursive: true });
            fs.writeFileSync(pathMems, mems);
        } catch (e: any) {
            console.error(`[CGROUP] Failed to apply memory nodes: ${e.message}`);
        }
    }

    static isSupported(): boolean {
        return process.platform !== 'win32' && fs.existsSync(this.CGROUP_ROOT);
    }
}

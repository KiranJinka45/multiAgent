import { exec } from 'child_process';
import os from 'os';

export interface KernelNetworkConfig {
    packetCorruptionPercent?: number;
    jitterMs?: number;
    reorderPercent?: number;
    duplicateAckStorm?: boolean;
    packetFragmentation?: boolean;
    mtuMismatch?: number;
}

export interface KernelCgroupConfig {
    cpuStarvationPercent?: number;
    ioThrottleBps?: number;
    memoryLimitMb?: number;
    schedulerContention?: boolean;
}

export interface KernelStorageConfig {
    fsyncDelayMs?: number;
    inodePressure?: boolean;
    diskSaturation?: boolean;
    dirtyPageExhaustion?: boolean;
}

export class KernelPathologyHarness {
    private executedCommands: string[] = [];
    private activeNetworkConfig: KernelNetworkConfig = {};
    private activeCgroupConfig: KernelCgroupConfig = {};
    private activeStorageConfig: KernelStorageConfig = {};
    private interfaceName: string;

    constructor(interfaceName: string = 'eth0') {
        this.interfaceName = interfaceName;
    }

    /**
     * Retrieves the history of commands generated or run.
     */
    public getExecutedCommands(): string[] {
        return [...this.executedCommands];
    }

    /**
     * Applies real Linux tc/netem and interface parameters.
     */
    public async applyNetworkPathology(config: KernelNetworkConfig): Promise<boolean> {
        this.activeNetworkConfig = config;
        const commands: string[] = [];

        // Clear existing netem settings first
        commands.push(`sudo tc qdisc del dev ${this.interfaceName} root`);

        let netemCmd = `sudo tc qdisc add dev ${this.interfaceName} root netem`;
        let hasNetem = false;

        if (config.packetCorruptionPercent && config.packetCorruptionPercent > 0) {
            netemCmd += ` corrupt ${config.packetCorruptionPercent}%`;
            hasNetem = true;
        }
        if (config.jitterMs && config.jitterMs > 0) {
            netemCmd += ` delay ${config.jitterMs}ms`; // netem needs base delay for jitter
            hasNetem = true;
        }
        if (config.reorderPercent && config.reorderPercent > 0) {
            netemCmd += ` reorder ${config.reorderPercent}%`;
            hasNetem = true;
        }
        if (config.duplicateAckStorm) {
            netemCmd += ` duplicate 10%`; // simulate duplicate ACK storm via packet duplication
            hasNetem = true;
        }

        if (hasNetem) {
            commands.push(netemCmd);
        }

        if (config.packetFragmentation || config.mtuMismatch) {
            const mtuValue = config.mtuMismatch || 1200;
            commands.push(`sudo ip link set dev ${this.interfaceName} mtu ${mtuValue}`);
        }

        return this.runCommands(commands);
    }

    /**
     * Applies cgroup based hardware limits and CPU contention.
     */
    public async applyCgroupPathology(config: KernelCgroupConfig): Promise<boolean> {
        this.activeCgroupConfig = config;
        const commands: string[] = [];

        // Ensure ZTAN cgroup exists
        commands.push('sudo cgcreate -g cpu,memory,blkio:/ztan_cgroup');

        if (config.cpuStarvationPercent && config.cpuStarvationPercent > 0) {
            const cpuShares = Math.max(2, Math.round(((100 - config.cpuStarvationPercent) / 100) * 1024));
            commands.push(`sudo cgset -r cpu.shares=${cpuShares} /ztan_cgroup`);
        }

        if (config.memoryLimitMb && config.memoryLimitMb > 0) {
            const limitBytes = config.memoryLimitMb * 1024 * 1024;
            commands.push(`sudo cgset -r memory.limit_in_bytes=${limitBytes} /ztan_cgroup`);
        }

        if (config.ioThrottleBps && config.ioThrottleBps > 0) {
            // Assumes major:minor device is 8:0 (sda)
            commands.push(`sudo cgset -r blkio.throttle.write_bps_device="8:0 ${config.ioThrottleBps}" /ztan_cgroup`);
        }

        if (config.schedulerContention) {
            // Run a stress process in the cgroup to trigger scheduler starvation
            commands.push(`sudo cgexec -g cpu:/ztan_cgroup stress-ng --cpu 2 --cpu-load 95 --timeout 30s &`);
        }

        return this.runCommands(commands);
    }

    /**
     * Injects block and page-cache level pathologies.
     */
    public async applyStoragePathology(config: KernelStorageConfig): Promise<boolean> {
        this.activeStorageConfig = config;
        const commands: string[] = [];

        if (config.fsyncDelayMs && config.fsyncDelayMs > 0) {
            // Emulate fsync lag by throttling disk write cache flushing via hdparm or dmsetup delay
            commands.push(`sudo hdparm -W 0 /dev/sda`); // Disable write cache to force immediate physical disk sync latency
        }

        if (config.inodePressure) {
            // Saturate inodes by generating millions of small temporary files
            commands.push(`stress-ng --sysfs 1 --timeout 30s &`);
        }

        if (config.diskSaturation) {
            // Saturate storage bus bandwidth
            commands.push(`dd if=/dev/zero of=/tmp/ztan_saturation_test bs=1M count=1024 oflag=direct &`);
        }

        if (config.dirtyPageExhaustion) {
            // Exhaust dirty page memory boundaries
            commands.push(`sudo sysctl -w vm.dirty_ratio=5`);
            commands.push(`sudo sysctl -w vm.dirty_background_ratio=2`);
        }

        return this.runCommands(commands);
    }

    /**
     * Clears all applied kernel-level and interface modifications.
     */
    public async clearAllPathologies(): Promise<boolean> {
        this.activeNetworkConfig = {};
        this.activeCgroupConfig = {};
        this.activeStorageConfig = {};

        const commands = [
            `sudo tc qdisc del dev ${this.interfaceName} root`,
            `sudo ip link set dev ${this.interfaceName} mtu 1500`,
            `sudo cgdelete -r cpu,memory,blkio:/ztan_cgroup`,
            `sudo sysctl -w vm.dirty_ratio=20`,
            `sudo sysctl -w vm.dirty_background_ratio=10`,
            `sudo hdparm -W 1 /dev/sda`,
            `rm -f /tmp/ztan_saturation_test`
        ];

        return this.runCommands(commands);
    }

    /**
     * Executes the collected commands or mocks them.
     */
    private async runCommands(commands: string[]): Promise<boolean> {
        const isLinux = os.platform() === 'linux';
        
        for (const cmd of commands) {
            this.executedCommands.push(cmd);
            console.log(`[KernelPathologyHarness] ${isLinux ? 'Executing' : 'Simulating'} command: ${cmd}`);
            
            if (isLinux) {
                try {
                    await this.execPromise(cmd);
                } catch (err) {
                    console.warn(`[KernelPathologyHarness] Command execution failed (non-blocking fallback): ${cmd}. Error: ${(err as Error).message}`);
                }
            }
        }
        return true;
    }

    private execPromise(cmd: string): Promise<string> {
        return new Promise((resolve, reject) => {
            exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(stderr || error.message));
                } else {
                    resolve(stdout);
                }
            });
        });
    }
}

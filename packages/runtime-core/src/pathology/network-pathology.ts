import { exec } from 'child_process';
import os from 'os';
import { PathologyCoordinator, NetworkPathologyConfig } from './pathology-coordinator.js';

export class NetworkPathology {
    private coordinator: PathologyCoordinator;

    constructor(workspaceRoot: string) {
        this.coordinator = new PathologyCoordinator(workspaceRoot);
    }

    /**
     * Dynamically injects packet shaping metrics (latency, jitter, drop chance).
     */
    public async inject(config: NetworkPathologyConfig): Promise<void> {
        console.log(`[Network Pathology] Injecting: Latency=${config.latencyMs}ms, Jitter=${config.jitterMs}ms, PacketLoss=${config.packetLossProb * 100}%`);
        
        // Write to coordinator config for application-level interceptors
        const active = this.coordinator.getActiveConfig();
        active.network = config;
        this.coordinator.saveConfig(active);

        // Attempt Linux-native tc/netem injection if running as root on Linux
        if (os.platform() === 'linux') {
            await this.applyLinuxNetem(config);
        } else {
            console.log('[Network Pathology] Non-Linux OS or mock mode detected. Gracefully falling back to application-level proxies.');
        }
    }

    /**
     * Clears all network pathologies.
     */
    public async clear(): Promise<void> {
        console.log('[Network Pathology] Clearing all network degradation...');
        const active = this.coordinator.getActiveConfig();
        active.network = { latencyMs: 0, jitterMs: 0, packetLossProb: 0 };
        this.coordinator.saveConfig(active);

        if (os.platform() === 'linux') {
            await this.clearLinuxNetem();
        }
    }

    /**
     * Runs OS-native Linux traffic control qdisc to shape real network interfaces.
     */
    private applyLinuxNetem(config: NetworkPathologyConfig): Promise<void> {
        return new Promise((resolve) => {
            const dev = process.env.ZTAN_IFACE || 'eth0';
            this.clearLinuxNetem().then(() => {
                let cmd = `sudo tc qdisc add dev ${dev} root netem`;
                if (config.latencyMs > 0) {
                    cmd += ` delay ${config.latencyMs}ms`;
                    if (config.jitterMs > 0) {
                        cmd += ` ${config.jitterMs}ms`;
                    }
                }
                if (config.packetLossProb > 0) {
                    cmd += ` loss ${config.packetLossProb * 100}%`;
                }

                exec(cmd, (error, stdout, stderr) => {
                    if (error) {
                        console.warn(`[Network Pathology] Native tc/netem execution failed: ${stderr.trim()}. Fallback active.`);
                    } else {
                        console.log(`[Network Pathology] Native Linux tc/netem successfully applied to ${dev}.`);
                    }
                    resolve();
                });
            });
        });
    }

    /**
     * Clears OS-native qdisc adjustments.
     */
    private clearLinuxNetem(): Promise<void> {
        return new Promise((resolve) => {
            const dev = process.env.ZTAN_IFACE || 'eth0';
            exec(`sudo tc qdisc del dev ${dev} root`, () => {
                // Ignore errors as it may not exist
                resolve();
            });
        });
    }
}

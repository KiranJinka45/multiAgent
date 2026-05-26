import { exec } from 'child_process';
import os from 'os';
import { PathologyCoordinator, PartitionPathologyConfig } from './pathology-coordinator.js';

export class PartitionPathology {
    private coordinator: PathologyCoordinator;

    constructor(workspaceRoot: string) {
        this.coordinator = new PathologyCoordinator(workspaceRoot);
    }

    /**
     * Injects an active network partition of a specified duration.
     */
    public async inject(config: PartitionPathologyConfig): Promise<void> {
        console.log(`[Partition Pathology] Injecting partition drill: Type=${config.type}, Duration=${config.durationMs}ms`);

        const active = this.coordinator.getActiveConfig();
        active.partition = config;
        this.coordinator.saveConfig(active);

        if (os.platform() === 'linux') {
            await this.applyLinuxIptables(config);
        } else {
            console.log('[Partition Pathology] Non-Linux environment. Utilizing runtime application proxy overrides.');
        }
    }

    /**
     * Clears all network partitions.
     */
    public async clear(): Promise<void> {
        console.log('[Partition Pathology] Clearing partition drill...');
        const active = this.coordinator.getActiveConfig();
        active.partition = { type: null, durationMs: 0 };
        this.coordinator.saveConfig(active);

        if (os.platform() === 'linux') {
            await this.clearLinuxIptables();
        }
    }

    /**
     * Applies native Linux iptables rules to drop postgres or etcd TCP port ranges.
     */
    private applyLinuxIptables(config: PartitionPathologyConfig): Promise<void> {
        return new Promise((resolve) => {
            this.clearLinuxIptables().then(() => {
                if (config.type === 'asymmetric') {
                    // Block incoming TCP queries to database port 54399/5432 and etcd 2379
                    const pgPort = process.env.DB_PORT || '54399';
                    const etcdPort = process.env.ETCD_PORT || '2379';
                    
                    const cmd1 = `sudo iptables -A INPUT -p tcp --dport ${pgPort} -j DROP`;
                    const cmd2 = `sudo iptables -A INPUT -p tcp --dport ${etcdPort} -j DROP`;
                    
                    exec(`${cmd1} && ${cmd2}`, (error, stdout, stderr) => {
                        if (error) {
                            console.warn(`[Partition Pathology] Native iptables execution failed: ${stderr.trim()}. Proxy mode active.`);
                        } else {
                            console.log(`[Partition Pathology] Native iptables rules successfully applied (blocked incoming DB/etcd).`);
                        }
                        resolve();
                    });
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Clears OS-native iptables rules.
     */
    private clearLinuxIptables(): Promise<void> {
        return new Promise((resolve) => {
            // Flush rule changes safely
            const pgPort = process.env.DB_PORT || '54399';
            const etcdPort = process.env.ETCD_PORT || '2379';
            const cmd1 = `sudo iptables -D INPUT -p tcp --dport ${pgPort} -j DROP`;
            const cmd2 = `sudo iptables -D INPUT -p tcp --dport ${etcdPort} -j DROP`;
            exec(`${cmd1} ; ${cmd2}`, () => {
                resolve();
            });
        });
    }
}

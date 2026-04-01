import redis from './redis';
import logger from '@packages/observability';

export interface WorkerNode {
    workerId: string;
    hostname: string;
    load: number; // 0-100
    status: 'IDLE' | 'BUSY' | 'ERROR';
    lastHeartbeat: number;
}

export class WorkerClusterManager {
    private static WORKER_REGISTRY_KEY = 'multiagent:cluster:workers';
    private static HEARTBEAT_TIMEOUT = 30000; // 30s grace period for pruning

    /**
     * Get all healthy worker nodes.
     */
    static async getHealthyNodes(): Promise<WorkerNode[]> {
        const data = await redis.hgetall(this.WORKER_REGISTRY_KEY);
        const now = Date.now();
        
        return Object.values(data)
            .map(v => {
                try {
                    return JSON.parse(v) as WorkerNode;
                } catch (e) {
                    return null;
                }
            })
            .filter((w): w is WorkerNode => 
                w !== null && 
                (now - w.lastHeartbeat) < this.HEARTBEAT_TIMEOUT && 
                w.status !== 'ERROR'
            );
    }

    /**
     * Steer a job to the best available worker.
     */
    static async steerJob(projectId: string): Promise<string | null> {
        if (!projectId) return null;
        const nodes = await this.getHealthyNodes();
        const idleNodes = nodes.filter(n => n.status === 'IDLE').sort((a, b) => a.load - b.load);

        if (idleNodes.length === 0) {
            logger.warn('[WorkerClusterManager] No idle nodes available in cluster');
            return null;
        }

        const selectedNode = idleNodes[0];
        if (!selectedNode) return null;
        
        // Use Redis Pub/Sub to trigger direct assignment
        await redis.publish(`worker:trigger:${selectedNode.workerId}`, JSON.stringify({
            projectId,
            assignedAt: Date.now()
        }));

        logger.info({ workerId: selectedNode.workerId, projectId }, '[WorkerClusterManager] Job steered successfully');
        return selectedNode.workerId;
    }

    /**
     * Register or update a worker node's heartbeat.
     */
    static async heartbeat(node: Omit<WorkerNode, 'lastHeartbeat'>) {
        if (!node || !node.workerId) {
            logger.warn('[WorkerClusterManager] Heartbeat received for invalid node');
            return;
        }
        const updatedNode: WorkerNode = {
            ...node,
            lastHeartbeat: Date.now()
        };
        await redis.hset(this.WORKER_REGISTRY_KEY, node.workerId, JSON.stringify(updatedNode));
    }

    /**
     * Gracefully remove a node from the cluster.
     */
    static async deregister(workerId: string) {
        if (!workerId) return;
        await redis.hdel(this.WORKER_REGISTRY_KEY, workerId);
        logger.info({ workerId }, '[WorkerClusterManager] Node deregistered gracefully');
    }

    /**
     * Prune nodes that haven't sent a heartbeat within the timeout.
     * To be called by the cluster primary (orchestrator).
     */
    static async pruneStaleNodes() {
        const data = await redis.hgetall(this.WORKER_REGISTRY_KEY);
        const now = Date.now();
        const toDelete: string[] = [];

        for (const [workerId, workerData] of Object.entries(data)) {
            try {
                const node = JSON.parse(workerData) as WorkerNode;
                if ((now - node.lastHeartbeat) > this.HEARTBEAT_TIMEOUT) {
                    toDelete.push(workerId);
                }
            } catch (e) {
                toDelete.push(workerId); // Prune corrupted entries
            }
        }

        if (toDelete.length > 0) {
            await redis.hdel(this.WORKER_REGISTRY_KEY, ...toDelete);
            logger.info({ prunedCount: toDelete.length, workers: toDelete }, '[WorkerClusterManager] Pruned stale nodes');
        }
    }
}

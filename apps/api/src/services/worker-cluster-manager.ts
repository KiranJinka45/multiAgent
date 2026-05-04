import { redis } from '@packages/utils';
import { logger } from '@packages/observability';

export interface WorkerNode {
    workerId: string;
    hostname: string;
    load: number; // 0-100
    status: 'IDLE' | 'BUSY' | 'ERROR';
    lastHeartbeat: number;
}

export class WorkerClusterManager {
    private static WORKER_REGISTRY_KEY = 'multiagent:cluster:workers';
    private static HEARTBEAT_TIMEOUT = 5000;

    /**
     * Get all healthy worker nodes.
     */
    static async getHealthyNodes(): Promise<WorkerNode[]> {
        const data = await redis.hgetall(this.WORKER_REGISTRY_KEY);
        const now = Date.now();
        
        return Object.values(data)
            .map(v => JSON.parse(v as string) as WorkerNode)
            .filter(w => (now - w.lastHeartbeat) < this.HEARTBEAT_TIMEOUT && w.status !== 'ERROR');
    }

    /**
     * Steer a job to the best available worker.
     */
    static async steerJob(projectId: string): Promise<string | null> {
        const nodes = await this.getHealthyNodes();
        const idleNodes = nodes.filter(n => n.status === 'IDLE').sort((a, b) => a.load - b.load);

        if (idleNodes.length === 0) {
            logger.warn('[WorkerClusterManager] No idle nodes available in cluster');
            return null;
        }

        const selectedNode = idleNodes[0];
        
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
        const updatedNode: WorkerNode = {
            ...node,
            lastHeartbeat: Date.now()
        };
        await redis.hset(this.WORKER_REGISTRY_KEY, node.workerId, JSON.stringify(updatedNode));
    }
}

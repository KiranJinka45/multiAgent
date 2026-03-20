import { ResourceManager } from './resource-manager';
import logger from '@libs/utils';

interface PendingRequest {
    projectId: string;
    requiredMemMb: number;
    resolve: () => void;
    timestamp: number;
}

export class AdmissionController {
    private static queue: PendingRequest[] = [];
    private static DRAIN_INTERVAL = 3000; // 3 seconds
    private static isRunning = false;

    static async acquireAdmission(projectId: string, requiredMemMb = 1024): Promise<void> {
        logger.info({ projectId, requiredMemMb }, '[AdmissionController] Attempting admission...');
        return new Promise((resolve) => {
            const admitted = ResourceManager.canAllocate(requiredMemMb);
            if (admitted && this.queue.length === 0) {
                logger.info({ projectId }, '[AdmissionController] Admitted immediately.');
                resolve();
            } else {
                logger.warn({ projectId, queueSize: this.queue.length, admitted }, '[AdmissionController] Admittance delayed. Queuing...');
                this.queue.push({ 
                    projectId, 
                    requiredMemMb, 
                    resolve, 
                    timestamp: Date.now() 
                });
                this.startDrainer();
            }
        });
    }

    private static startDrainer() {
        if (this.isRunning) return;
        this.isRunning = true;

        const drain = async () => {
            if (this.queue.length === 0) {
                this.isRunning = false;
                return;
            }

            const next = this.queue[0];
            if (ResourceManager.canAllocate(next.requiredMemMb)) {
                this.queue.shift();
                logger.info({ projectId: next.projectId, waitTime: Date.now() - next.timestamp }, '[AdmissionController] Dequeued and admitted.');
                next.resolve();
                
                // Recursively check next in queue immediately
                setTimeout(drain, 100);
            } else {
                setTimeout(drain, this.DRAIN_INTERVAL);
            }
        };

        drain();
    }

    static getQueueStatus() {
        return {
            pending: this.queue.length,
            nextProject: this.queue[0]?.projectId
        };
    }
}

/**
 * Task Queue Interface mapping job types to asynchronous horizontal workers.
 * Ensures the API Gateway handles immediate Web/UI load, while Builders process the heavy lifting on isolated containers.
 */
export interface BuildJobPayload {
    tenantId: string;
    projectId: string;
    action: 'INITIAL_BUILD' | 'INCREMENTAL_EDIT';
    prompt?: string;
    patchData?: any;
}
export declare class TaskQueueManager {
    /**
     * Enqueues a heavy build workload outside of the main Next.js API process.
     */
    enqueueBuildJob(payload: BuildJobPayload): Promise<string>;
    /**
     * Called by a worker to pick up the next task.
     */
    popJob(): Promise<BuildJobPayload | null>;
    /**
     * Updates build telemetry allowing realtime Dashboard subscription over SSE/Websocket.
     */
    heartbeat(jobId: string, statusText: string, progress: number): Promise<void>;
}
export declare const queueManager: TaskQueueManager;

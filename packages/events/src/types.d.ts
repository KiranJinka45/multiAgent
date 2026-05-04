/**
 * Shared Core Types
 * These are defined here to avoid circular dependencies with @packages/utils.
 */
export interface Mission {
    id: string;
    status: string;
    projectId?: string;
    previewId?: string;
    runtimeVersion?: string;
    executionId?: string;
    userId?: string;
    previewUrl?: string;
    restartDisabled?: boolean;
    ports?: any;
    pids?: any;
    [key: string]: any;
}
export interface BaseTask {
    id: string;
    type: string;
    [key: string]: any;
}
export interface JobPayload {
    id: string;
    [key: string]: any;
}
export type EventType = 'mission.started' | 'mission.completed' | 'mission.failed' | 'task.waiting' | 'task.ready' | 'task.running' | 'task.completed' | 'task.failed' | 'job.steered' | 'system.heartbeat' | 'dlq_entry';
export interface KafkaEvent<T = unknown> {
    type: EventType | string;
    payload?: T;
    data?: T;
    timestamp: number | string;
    source?: string;
}
export type MissionEvent = KafkaEvent<Mission>;
export type TaskEvent = KafkaEvent<BaseTask>;
export type JobEvent = KafkaEvent<JobPayload>;
export type HeartbeatEvent = KafkaEvent<{
    workerId: string;
    hostname: string;
    status: string;
    load: number;
}>;
//# sourceMappingURL=types.d.ts.map
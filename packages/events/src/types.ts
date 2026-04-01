import { JobPayload, BaseTask, Mission } from '@packages/utils';

export type EventType = 
    | 'mission.started'
    | 'mission.completed'
    | 'mission.failed'
    | 'task.waiting'
    | 'task.ready'
    | 'task.running'
    | 'task.completed'
    | 'task.failed'
    | 'job.steered'
    | 'system.heartbeat'
    | 'dlq_entry';

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

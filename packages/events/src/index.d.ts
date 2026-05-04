import { Redis } from 'ioredis';
import { CircuitBreaker } from './breaker';
import { ChaosEngine } from './chaos';
/**
 * DISTRIBUTED EVENT BUS
 * Powered by Redis Pub/Sub for cross-service agentic coordination.
 */
export { ChaosEngine };
declare class EventBus {
    private pub;
    private sub;
    private handlers;
    constructor(existingPub?: Redis, existingSub?: Redis);
    /**
     * Internal access for system utilities (CircuitBreaker, etc.)
     */
    getRedis(): Redis;
    publish(topic: string, data: any): Promise<void>;
    subscribe(topic: string, handler: (data: any) => void): Promise<void>;
    /**
     * ADAPTIVE BACKPRESSURE CONTROLLER
     * Calculates a dynamic throttle delay based on stream lag and growth velocity.
     */
    private checkAdaptiveBackpressure;
    /**
     * STREAM-BASED EVENTS (Kafka-lite)
     * Provides monotonic sequencing and history replay with GLOBAL AUTONOMOUS BACKPRESSURE.
     */
    publishStream(streamKey: string, data: any, maxLen?: number, options?: {
        backpressureLimit?: number;
        priority?: 'high' | 'low';
    }): Promise<string | null>;
    /**
     * Read from a stream starting from a specific ID.
     * Use '$' for new events only, or '0-0' for from beginning.
     */
    subscribeStream(streamKey: string, lastId: string | undefined, handler: (data: any, id: string) => void): Promise<void>;
    /**
     * CONSUMER GROUPS (Enterprise Reliability)
     * Allows coordinated processing and message acknowledgments.
     */
    createGroup(streamKey: string, groupName: string): Promise<void>;
    private isShuttingDown;
    subscribeGroup(streamKey: string, groupName: string, consumerName: string, handler: (data: any, id: string, deliveryCount: number) => Promise<void> | void): Promise<void>;
    /**
     * Publish with standard envelope (Schema Versioning)
     */
    publishEnveloped<T>(streamKey: string, type: string, payload: T, source?: string): Promise<void>;
    /**
     * Explicitly acknowledge a message in a group.
     */
    acknowledge(streamKey: string, groupName: string, id: string): Promise<void>;
    /**
     * Replay historical events between two IDs.
     */
    replayStream(streamKey: string, startId?: string, endId?: string): Promise<{
        id: string;
        data: any;
    }[]>;
    getStreamMetrics(streamKey: string): Promise<{
        length: any;
        groupsCount: any;
        lastGeneratedId: any;
        dlqSize: any;
        groups: {
            name: any;
            consumers: any;
            pending: any;
            pelSize: {};
            latencyMs: number;
            lastDeliveredId: any;
        }[];
    } | null>;
    /**
     * Partitioning Strategy Helper
     * Supports horizontal scaling by sharding streams by tenant or shardId.
     * Uses deterministic hashing to map a tenant to a specific shard.
     */
    getShardForTenant(tenantId: string, totalShards?: number): string;
    getPartitionedStream(baseKey: string, shard: string): string;
    /**
     * Recover messages from DLQ by re-publishing them to the main stream.
     * Safe Replay: Implements batching and delays to prevent system overload.
     */
    replayFromDlq(streamKey: string, options?: {
        limit?: number;
        batchSize?: number;
        delayMs?: number;
        dryRun?: boolean;
    }): Promise<number>;
    shutdown(): Promise<void>;
}
export declare const eventBus: EventBus;
export { kafkaManager, kafkaConfig, KAFKA_TOPICS } from './kafka';
export * from './types';
export { CircuitBreaker };
export declare enum AgentEvents {
    TASK_STARTED = "agent.task.started",
    TASK_COMPLETED = "agent.task.completed",
    TASK_FAILED = "agent.task.failed",
    MISSION_UPDATED = "mission.updated"
}
export { EventBus };
//# sourceMappingURL=index.d.ts.map
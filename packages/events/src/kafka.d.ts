import { Kafka, Producer, Consumer } from 'kafkajs';
import { KafkaEvent } from './types.js';
export declare const kafkaConfig: Kafka;
/** Topic definitions with partition counts for horizontal scaling */
export declare const KAFKA_TOPICS: {
    readonly AGENT_TASKS: "agent-tasks";
    readonly MISSIONS: "missions";
    readonly RESULTS: "results";
    readonly EVENTS: "platform-events";
    readonly RETRY_1: "retry-1";
    readonly RETRY_2: "retry-2";
    readonly RETRY_3: "retry-3";
    readonly DLQ: "dead-letter-queue";
};
declare class KafkaManager {
    private producer;
    private consumers;
    private admin;
    private initialized;
    /** Ensure topics exist with correct partition counts */
    ensureTopics(): Promise<void>;
    private getAdmin;
    getProducer(): Promise<Producer>;
    /**
     * Create a consumer for a specific group.
     * Supports multiple consumers per manager (one per groupId).
     */
    getConsumer(groupId: string): Promise<Consumer>;
    /**
     * Publish a message to a topic with optional partition key.
     * Using missionId as the key guarantees message ordering per mission.
     */
    publish<T>(topic: string, message: KafkaEvent<T>, options?: {
        partitionKey?: string | undefined;
        headers?: Record<string, string>;
    }): Promise<void>;
    /**
     * Subscribe to a topic and process messages with concurrent partition handling.
     */
    subscribe<T>(groupId: string, topic: string, handler: (event: KafkaEvent<T>, key: string | null) => Promise<void>, options?: {
        concurrency?: number;
    }): Promise<void>;
    /** Graceful shutdown for all connections */
    shutdown(): Promise<void>;
    /**
     * Handle retries by routing to next retry topic or DLQ
     */
    private handleRetry;
}
export declare const kafkaManager: KafkaManager;
export {};
//# sourceMappingURL=kafka.d.ts.map
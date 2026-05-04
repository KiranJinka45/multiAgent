"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kafkaManager = exports.KAFKA_TOPICS = exports.kafkaConfig = void 0;
const kafkajs_1 = require("kafkajs");
const observability_1 = require("@packages/observability");
const BROKER_LIST = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
exports.kafkaConfig = new kafkajs_1.Kafka({
    clientId: 'multiagent-platform',
    brokers: BROKER_LIST,
    retry: {
        initialRetryTime: 300,
        retries: 10,
        maxRetryTime: 30000,
    },
});
/** Topic definitions with partition counts for horizontal scaling */
exports.KAFKA_TOPICS = {
    AGENT_TASKS: 'agent-tasks',
    MISSIONS: 'missions',
    RESULTS: 'results',
    EVENTS: 'platform-events',
    RETRY_1: 'retry-1',
    RETRY_2: 'retry-2',
    RETRY_3: 'retry-3',
    DLQ: 'dead-letter-queue',
};
const DEFAULT_PARTITIONS = 6;
const DEFAULT_REPLICATION_FACTOR = 3; // HA compliant
class KafkaManager {
    producer = null;
    consumers = new Map();
    admin = null;
    initialized = false;
    /** Ensure topics exist with correct partition counts */
    async ensureTopics() {
        if (this.initialized)
            return;
        try {
            const admin = await this.getAdmin();
            const existingTopics = await admin.listTopics();
            const topicsToCreate = Object.values(exports.KAFKA_TOPICS)
                .filter((topic) => !existingTopics.includes(topic))
                .map((topic) => ({
                topic,
                numPartitions: DEFAULT_PARTITIONS,
                replicationFactor: DEFAULT_REPLICATION_FACTOR,
            }));
            if (topicsToCreate.length > 0) {
                await admin.createTopics({ topics: topicsToCreate });
                observability_1.logger.info({ topics: topicsToCreate.map((t) => t.topic) }, 'Kafka topics created');
            }
            this.initialized = true;
        }
        catch (err) {
            observability_1.logger.error({ err }, 'Failed to ensure Kafka topics');
        }
    }
    async getAdmin() {
        if (!this.admin) {
            this.admin = exports.kafkaConfig.admin();
            await this.admin.connect();
        }
        return this.admin;
    }
    async getProducer() {
        if (!this.producer) {
            this.producer = exports.kafkaConfig.producer({
                allowAutoTopicCreation: false,
                idempotent: true,
                maxInFlightRequests: 5,
                transactionalId: `multiagent-prod-${process.env.HOSTNAME || 'local'}`,
            });
            await this.producer.connect();
            observability_1.logger.info('Kafka Producer connected (idempotent, acks: all)');
        }
        return this.producer;
    }
    /**
     * Create a consumer for a specific group.
     * Supports multiple consumers per manager (one per groupId).
     */
    async getConsumer(groupId) {
        const existing = this.consumers.get(groupId);
        if (existing)
            return existing;
        const consumer = exports.kafkaConfig.consumer({
            groupId,
            sessionTimeout: 30000,
            heartbeatInterval: 3000,
            maxWaitTimeInMs: 5000,
        });
        await consumer.connect();
        this.consumers.set(groupId, consumer);
        observability_1.logger.info({ groupId }, 'Kafka Consumer connected');
        return consumer;
    }
    /**
     * Publish a message to a topic with optional partition key.
     * Using missionId as the key guarantees message ordering per mission.
     */
    async publish(topic, message, options = {}) {
        try {
            await this.ensureTopics();
            const p = await this.getProducer();
            await p.send({
                topic,
                acks: -1, // Wait for all replicas
                compression: kafkajs_1.CompressionTypes.GZIP,
                messages: [
                    {
                        key: options.partitionKey ?? null,
                        value: JSON.stringify(message),
                        headers: {
                            'x-timestamp': Date.now().toString(),
                            'x-source': 'multiagent-platform',
                            ...(options.headers || {}),
                        },
                    },
                ],
            });
            observability_1.logger.debug({ topic, key: options.partitionKey }, 'Message published to Kafka');
        }
        catch (err) {
            observability_1.logger.error({ err, topic }, 'Failed to publish to Kafka');
            throw err;
        }
    }
    /**
     * Subscribe to a topic and process messages with concurrent partition handling.
     */
    async subscribe(groupId, topic, handler, options = {}) {
        const consumer = await this.getConsumer(groupId);
        await consumer.subscribe({ topic, fromBeginning: false });
        await consumer.run({
            partitionsConsumedConcurrently: options.concurrency ?? 3,
            eachMessage: async ({ message, partition, topic: currentTopic }) => {
                const retryCount = parseInt(message.headers?.['x-retry-count']?.toString() || '0');
                try {
                    const event = JSON.parse(message.value?.toString() || '{}');
                    const key = message.key?.toString() ?? null;
                    observability_1.logger.debug({ topic: currentTopic, partition, key, offset: message.offset, retryCount }, 'Processing Kafka message');
                    await handler(event, key);
                }
                catch (err) {
                    observability_1.logger.error({ err, topic: currentTopic, partition, offset: message.offset, retryCount }, 'Failed to process Kafka message');
                    await this.handleRetry(currentTopic, message, err, retryCount);
                }
            },
        });
        observability_1.logger.info({ groupId, topic, concurrency: options.concurrency ?? 3 }, 'Kafka subscription active');
    }
    /** Graceful shutdown for all connections */
    async shutdown() {
        const shutdowns = [];
        if (this.producer)
            shutdowns.push(this.producer.disconnect());
        if (this.admin)
            shutdowns.push(this.admin.disconnect());
        for (const [, consumer] of this.consumers) {
            shutdowns.push(consumer.disconnect());
        }
        await Promise.allSettled(shutdowns);
        observability_1.logger.info('Kafka connections closed');
    }
    /**
     * Handle retries by routing to next retry topic or DLQ
     */
    async handleRetry(topic, message, error, retryCount) {
        const nextRetryCount = retryCount + 1;
        let nextTopic;
        if (nextRetryCount === 1)
            nextTopic = exports.KAFKA_TOPICS.RETRY_1;
        else if (nextRetryCount === 2)
            nextTopic = exports.KAFKA_TOPICS.RETRY_2;
        else if (nextRetryCount === 3)
            nextTopic = exports.KAFKA_TOPICS.RETRY_3;
        else
            nextTopic = exports.KAFKA_TOPICS.DLQ;
        try {
            if (!message.value)
                return;
            const event = JSON.parse(message.value.toString());
            await this.publish(nextTopic, event, {
                partitionKey: message.key?.toString(),
                headers: {
                    'x-retry-count': nextRetryCount.toString(),
                    'x-original-topic': topic,
                    'x-error': error instanceof Error ? error.message : String(error),
                }
            });
            observability_1.logger.info({ nextTopic, retryCount: nextRetryCount, originalTopic: topic }, 'Message routed to retry/DLQ');
        }
        catch (publishErr) {
            observability_1.logger.error({ publishErr }, 'Critical failure routing to retry topic');
        }
    }
}
exports.kafkaManager = new KafkaManager();
//# sourceMappingURL=kafka.js.map
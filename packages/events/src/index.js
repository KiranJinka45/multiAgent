"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = exports.AgentEvents = exports.CircuitBreaker = exports.KAFKA_TOPICS = exports.kafkaConfig = exports.kafkaManager = exports.eventBus = exports.ChaosEngine = void 0;
const ioredis_1 = require("ioredis");
const observability_1 = require("@packages/observability");
const config_1 = require("@packages/config");
const api_1 = require("@opentelemetry/api");
const breaker_1 = require("./breaker");
Object.defineProperty(exports, "CircuitBreaker", { enumerable: true, get: function () { return breaker_1.CircuitBreaker; } });
const chaos_1 = require("./chaos");
Object.defineProperty(exports, "ChaosEngine", { enumerable: true, get: function () { return chaos_1.ChaosEngine; } });
class EventBus {
    pub;
    sub;
    handlers = new Map();
    constructor(existingPub, existingSub) {
        const finalUrl = config_1.serverConfig.REDIS_URL || 'redis://localhost:6379';
        this.pub = existingPub || new ioredis_1.Redis(finalUrl);
        this.sub = existingSub || new ioredis_1.Redis(finalUrl);
        breaker_1.CircuitBreaker.setRedis(this.pub);
        this.sub.on('message', (channel, message) => {
            const topicHandlers = this.handlers.get(channel);
            if (topicHandlers) {
                try {
                    const data = JSON.parse(message);
                    topicHandlers.forEach(handler => handler(data));
                }
                catch (err) {
                    observability_1.logger.error({ err, channel }, 'Failed to parse event message');
                }
            }
        });
    }
    /**
     * Internal access for system utilities (CircuitBreaker, etc.)
     */
    getRedis() {
        return this.pub;
    }
    async publish(topic, data) {
        const payload = JSON.stringify({
            ...data,
            _timestamp: new Date().toISOString(),
        });
        await this.pub.publish(topic, payload);
    }
    async subscribe(topic, handler) {
        if (!this.handlers.has(topic)) {
            this.handlers.set(topic, []);
            await this.sub.subscribe(topic);
        }
        this.handlers.get(topic)?.push(handler);
    }
    /**
     * ADAPTIVE BACKPRESSURE CONTROLLER
     * Calculates a dynamic throttle delay based on stream lag and growth velocity.
     */
    async checkAdaptiveBackpressure(streamKey, limit) {
        const metrics = await this.getStreamMetrics(streamKey);
        if (!metrics)
            return 0;
        const { length, groups } = metrics;
        // Calculate max consumer lag across all groups
        const maxLag = groups.reduce((acc, g) => {
            const lag = length - g.pending; // Simplification: length - pending is not accurate for lag, but metrics.length is the total backlog
            return Math.max(acc, length); // If length > limit, we are in backlog
        }, 0);
        if (length <= limit * 0.8)
            return 0; // Safe zone: 80% of limit
        // Congestion Zone: Apply dynamic delay
        // Delay (ms) = (current_length / limit) ^ 2 * base_delay
        const congestionRatio = length / limit;
        const baseDelay = 100; // 100ms base
        const adaptiveDelay = Math.min(2000, Math.floor(Math.pow(congestionRatio, 2) * baseDelay));
        if (adaptiveDelay > 200) {
            observability_1.logger.warn({ streamKey, length, limit, adaptiveDelay }, `🚦 Congestion Detected: Applying ${adaptiveDelay}ms producer throttle`);
        }
        return adaptiveDelay;
    }
    /**
     * STREAM-BASED EVENTS (Kafka-lite)
     * Provides monotonic sequencing and history replay with GLOBAL AUTONOMOUS BACKPRESSURE.
     */
    async publishStream(streamKey, data, maxLen = 5000, options = {}) {
        const priority = options.priority || data._priority || 'low';
        // 1. Admission Control (Circuit Breaker State Machine)
        if (!(await breaker_1.CircuitBreaker.allowRequest()) && priority !== 'high') {
            const reason = await breaker_1.CircuitBreaker.getReason() || 'Congestion Control';
            throw new Error(`[ADMISSION_CONTROL] Request rejected: ${reason}`);
        }
        // 2. Global Synchronized Throttle (Priority-Aware)
        const globalDelay = await this.pub.get('system:backpressure:global_delay');
        const throttleDelay = globalDelay ? parseInt(globalDelay, 10) : 0;
        // Critical Path: High-priority events ignore 50% of the throttle
        const effectiveDelay = priority === 'high' ? Math.floor(throttleDelay * 0.5) : throttleDelay;
        if (effectiveDelay > 1500 && priority !== 'high') {
            throw new Error(`[ADMISSION_CONTROL] System saturated. Global delay: ${effectiveDelay}ms`);
        }
        if (effectiveDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, effectiveDelay));
        }
        // 3. Inject Trace Context
        const traceContext = {};
        api_1.propagation.inject(api_1.context.active(), traceContext);
        const payload = JSON.stringify({
            ...data,
            _timestamp: new Date().toISOString(),
            _global_throttle: effectiveDelay > 0 ? effectiveDelay : undefined,
            _trace_context: traceContext,
            _priority: priority,
            _tenantId: data.tenantId || data._tenantId || 'system'
        });
        const tenantId = data.tenantId || data._tenantId || 'system';
        // If the stream is already partitioned or specific to a mission, keep it.
        // Otherwise, prefix with tenantId for isolation.
        let partitionedKey = streamKey;
        if (tenantId !== 'system' && !streamKey.includes(tenantId) && !streamKey.includes(':shard:')) {
            partitionedKey = `tenant:${tenantId}:${streamKey}`;
        }
        try {
            // 🛡️ Phase 25: Chaos Injection
            await chaos_1.ChaosEngine.maybeFailRedis('publishStream');
            const id = await this.pub.xadd(partitionedKey, 'MAXLEN', '~', maxLen, '*', 'data', payload);
            // Signal success for Circuit Breaker recovery probing
            await breaker_1.CircuitBreaker.recordSuccess();
            return id;
        }
        catch (err) {
            observability_1.logger.error({ err, streamKey }, 'Failed to publish to Redis Stream');
            throw err;
        }
    }
    /**
     * Read from a stream starting from a specific ID.
     * Use '$' for new events only, or '0-0' for from beginning.
     */
    async subscribeStream(streamKey, lastId = '$', handler) {
        const readLoop = async () => {
            let currentId = lastId;
            while (true) {
                try {
                    const results = await this.sub.xread('BLOCK', 0, 'STREAMS', streamKey, currentId);
                    if (results) {
                        const [, messages] = results[0];
                        for (const [id, [, payload]] of messages) {
                            try {
                                const data = JSON.parse(payload);
                                handler(data, id);
                                currentId = id; // Track last seen ID
                            }
                            catch (err) {
                                observability_1.logger.error({ err, id }, 'Failed to parse stream message');
                            }
                        }
                    }
                }
                catch (err) {
                    // Only log if not a standard timeout or connection issue
                    observability_1.logger.error({ err, streamKey }, 'Redis Stream read loop error');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        };
        readLoop();
    }
    /**
     * CONSUMER GROUPS (Enterprise Reliability)
     * Allows coordinated processing and message acknowledgments.
     */
    async createGroup(streamKey, groupName) {
        try {
            // MKSTREAM ensures the stream exists before creating the group
            await this.pub.xgroup('CREATE', streamKey, groupName, '$', 'MKSTREAM');
            observability_1.logger.info({ streamKey, groupName }, 'Redis Consumer Group created');
        }
        catch (err) {
            if (!err.message.includes('BUSYGROUP')) {
                observability_1.logger.error({ err, streamKey, groupName }, 'Failed to create Redis Consumer Group');
                throw err;
            }
            // BUSYGROUP means it already exists, which is fine
        }
    }
    isShuttingDown = false;
    async subscribeGroup(streamKey, groupName, consumerName, handler) {
        // 1. MAIN READ LOOP (New Messages)
        const readLoop = async () => {
            while (!this.isShuttingDown) {
                try {
                    // '>' means read only new messages that haven't been delivered to other consumers in the group
                    const results = await this.sub.xreadgroup('GROUP', groupName, consumerName, 'BLOCK', 2000, // Wait up to 2s to allow shutdown check
                    'STREAMS', streamKey, '>');
                    if (results) {
                        const [, messages] = results[0];
                        for (const [id, [, payload]] of messages) {
                            const data = JSON.parse(payload);
                            // Extract Trace Context
                            const parentContext = api_1.propagation.extract(api_1.context.active(), data._trace_context || {});
                            const tracer = api_1.trace.getTracer('event-bus');
                            await tracer.startActiveSpan(`consume:${streamKey}`, {
                                kind: api_1.SpanKind.CONSUMER,
                                attributes: { 'messaging.system': 'redis', 'messaging.destination': streamKey, 'messaging.message_id': id }
                            }, parentContext, async (span) => {
                                try {
                                    await handler(data, id, 1);
                                    await this.pub.xack(streamKey, groupName, id);
                                    span.setStatus({ code: api_1.SpanStatusCode.OK });
                                }
                                catch (err) {
                                    span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: err instanceof Error ? err.message : String(err) });
                                    span.recordException(err);
                                    observability_1.logger.error({ err, id, groupName }, 'Consumer Group message processing failed');
                                }
                                finally {
                                    span.end();
                                }
                            });
                        }
                    }
                }
                catch (err) {
                    if (this.isShuttingDown)
                        break;
                    observability_1.logger.error({ err, streamKey, groupName }, 'Redis Stream Group read loop error');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        };
        // 2. RECOVERY LOOP (Stale/Pending Messages via XAUTOCLAIM)
        const recoveryLoop = async () => {
            const minIdleTime = 30000; // 30s
            let startId = '0-0';
            while (!this.isShuttingDown) {
                try {
                    const [nextId, claimedMessages] = await this.pub.xautoclaim(streamKey, groupName, consumerName, minIdleTime, startId);
                    if (claimedMessages && claimedMessages.length > 0) {
                        observability_1.logger.info({ count: claimedMessages.length, groupName }, '🔄 Reclaiming stale messages from PEL');
                        for (const [id, [, payload]] of claimedMessages) {
                            const data = JSON.parse(payload);
                            // Extract Trace Context
                            const parentContext = api_1.propagation.extract(api_1.context.active(), data._trace_context || {});
                            const tracer = api_1.trace.getTracer('event-bus');
                            await tracer.startActiveSpan(`reclaim:${streamKey}`, {
                                kind: api_1.SpanKind.CONSUMER,
                                attributes: { 'messaging.system': 'redis', 'messaging.destination': streamKey, 'messaging.message_id': id, 'messaging.operation': 'receive' }
                            }, parentContext, async (span) => {
                                try {
                                    await handler(data, id, 2);
                                    await this.pub.xack(streamKey, groupName, id);
                                    span.setStatus({ code: api_1.SpanStatusCode.OK });
                                }
                                catch (err) {
                                    span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: err instanceof Error ? err.message : String(err) });
                                    span.recordException(err);
                                    observability_1.logger.error({ err, id, groupName }, 'Failed to process reclaimed message');
                                }
                                finally {
                                    span.end();
                                }
                            });
                        }
                    }
                    startId = nextId;
                    await new Promise(resolve => setTimeout(resolve, 10000));
                }
                catch (err) {
                    if (this.isShuttingDown)
                        break;
                    observability_1.logger.error({ err, streamKey }, 'PEL Recovery loop error');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        };
        readLoop();
        recoveryLoop();
    }
    /**
     * Publish with standard envelope (Schema Versioning)
     */
    async publishEnveloped(streamKey, type, payload, source = 'system') {
        const envelope = {
            version: 1,
            type,
            timestamp: new Date().toISOString(),
            source,
            payload,
            metadata: {
                host: require('os').hostname(),
                pid: process.pid
            }
        };
        return this.publish(streamKey, envelope);
    }
    /**
     * Explicitly acknowledge a message in a group.
     */
    async acknowledge(streamKey, groupName, id) {
        await this.pub.xack(streamKey, groupName, id);
    }
    /**
     * Replay historical events between two IDs.
     */
    async replayStream(streamKey, startId = '-', endId = '+') {
        try {
            const results = await this.pub.xrange(streamKey, startId, endId);
            return results.map(([id, [, payload]]) => ({
                id,
                data: JSON.parse(payload)
            }));
        }
        catch (err) {
            observability_1.logger.error({ err, streamKey }, 'Failed to replay Redis Stream');
            return [];
        }
    }
    async getStreamMetrics(streamKey) {
        try {
            const info = await this.pub.xinfo('STREAM', streamKey).catch(() => null);
            if (!info)
                return null;
            // Convert flat array to object
            const metrics = {};
            const infoArray = info;
            for (let i = 0; i < infoArray.length; i += 2) {
                metrics[infoArray[i]] = infoArray[i + 1];
            }
            const groups = await this.pub.xinfo('GROUPS', streamKey).catch(() => []);
            const groupDetails = await Promise.all(groups.map(async (g) => {
                const groupMetrics = {};
                for (let i = 0; i < g.length; i += 2) {
                    groupMetrics[g[i]] = g[i + 1];
                }
                // Fetch deeper PEL (Pending Entitlement List) stats
                const pendingInfo = await this.pub.xpending(streamKey, groupMetrics.name).catch(() => [0]);
                // Estimate Latency
                let latencyMs = 0;
                if (groupMetrics['last-delivered-id'] && groupMetrics['last-delivered-id'] !== '0-0') {
                    const lastTime = parseInt(groupMetrics['last-delivered-id'].split('-')[0], 10);
                    const headTime = parseInt(metrics['last-generated-id'].split('-')[0], 10);
                    latencyMs = Math.max(0, headTime - lastTime);
                }
                return {
                    name: groupMetrics.name,
                    consumers: groupMetrics.consumers,
                    pending: groupMetrics.pending,
                    pelSize: pendingInfo[0] || 0,
                    latencyMs,
                    lastDeliveredId: groupMetrics['last-delivered-id']
                };
            }));
            // Check DLQ status
            const dlqKey = `${streamKey}:dlq`;
            const dlqInfo = await this.pub.xinfo('STREAM', dlqKey).catch(() => null);
            return {
                length: metrics.length,
                groupsCount: groups.length,
                lastGeneratedId: metrics['last-generated-id'],
                dlqSize: dlqInfo ? dlqInfo.find((v, i, a) => a[i - 1] === 'length') : 0,
                groups: groupDetails
            };
        }
        catch (err) {
            observability_1.logger.error({ err, streamKey }, 'Failed to fetch stream metrics');
            return null;
        }
    }
    /**
     * Partitioning Strategy Helper
     * Supports horizontal scaling by sharding streams by tenant or shardId.
     * Uses deterministic hashing to map a tenant to a specific shard.
     */
    getShardForTenant(tenantId, totalShards = 16) {
        const hash = require('crypto').createHash('md5').update(tenantId).digest('hex');
        const shardId = parseInt(hash.substring(0, 8), 16) % totalShards;
        return `shard:${shardId}`;
    }
    getPartitionedStream(baseKey, shard) {
        return `${baseKey}:${shard}`;
    }
    /**
     * Recover messages from DLQ by re-publishing them to the main stream.
     * Safe Replay: Implements batching and delays to prevent system overload.
     */
    async replayFromDlq(streamKey, options = {}) {
        const { limit = 500, batchSize = 50, delayMs = 1000, dryRun = false } = options;
        const dlqKey = `${streamKey}:dlq`;
        try {
            const results = await this.pub.xrange(dlqKey, '-', '+', 'COUNT', limit);
            if (!results || results.length === 0)
                return 0;
            if (dryRun) {
                observability_1.logger.info({ dlqKey, count: results.length }, '🔍 [Dry Run] DLQ events detected');
                return results.length;
            }
            let replayedCount = 0;
            for (let i = 0; i < results.length; i += batchSize) {
                const batch = results.slice(i, i + batchSize);
                for (const [id, [, payload]] of batch) {
                    try {
                        const event = JSON.parse(payload);
                        delete event._dlq_reason;
                        delete event._moved_at;
                        delete event._original_id;
                        await this.publish(streamKey, event);
                        await this.pub.xdel(dlqKey, id);
                        replayedCount++;
                    }
                    catch (err) {
                        observability_1.logger.error({ err, id }, 'Failed to replay DLQ event');
                    }
                }
                if (i + batchSize < results.length) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
            return replayedCount;
        }
        catch (err) {
            observability_1.logger.error({ err, dlqKey }, 'Failed to replay from DLQ');
            return 0;
        }
    }
    async shutdown() {
        this.isShuttingDown = true;
        // Give loops a moment to finish current iteration
        await new Promise(resolve => setTimeout(resolve, 3000));
        await this.pub.quit();
        await this.sub.quit();
        observability_1.logger.info('🛑 EventBus shutdown complete');
    }
}
exports.EventBus = EventBus;
exports.eventBus = new EventBus();
// Kafka Support (Production Mode)
var kafka_1 = require("./kafka");
Object.defineProperty(exports, "kafkaManager", { enumerable: true, get: function () { return kafka_1.kafkaManager; } });
Object.defineProperty(exports, "kafkaConfig", { enumerable: true, get: function () { return kafka_1.kafkaConfig; } });
Object.defineProperty(exports, "KAFKA_TOPICS", { enumerable: true, get: function () { return kafka_1.KAFKA_TOPICS; } });
__exportStar(require("./types"), exports);
// Core Event Types
var AgentEvents;
(function (AgentEvents) {
    AgentEvents["TASK_STARTED"] = "agent.task.started";
    AgentEvents["TASK_COMPLETED"] = "agent.task.completed";
    AgentEvents["TASK_FAILED"] = "agent.task.failed";
    AgentEvents["MISSION_UPDATED"] = "mission.updated";
})(AgentEvents || (exports.AgentEvents = AgentEvents = {}));
//# sourceMappingURL=index.js.map
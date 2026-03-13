/**
 * Event Bus — Redis Streams backbone for build event streaming.
 *
 * Uses Redis XADD (publish) + XREAD BLOCK (subscribe) instead of pub/sub
 * so events survive client disconnects and reconnects can catch up from lastId.
 *
 * Stream key:  build:stream:{executionId}
 * State key:   build:state:{executionId}   (snapshot — existing shape)
 * Pub channel: build:progress:{executionId} (legacy compat — kept for any other listeners)
 *
 * TTL: 4 hours — enough to cover any build + debugging session.
 */

import { redis } from './queue';
import logger from '@config/logger';
import { PersistenceStore } from './persistence-store';

const STREAM_TTL_SECONDS = 4 * 60 * 60; // 4 hours
const THROTTLE_MS = 100; // 100ms throttle for progress/thought events

const throttleMap = new Map<string, number>();

export interface BuildEvent {
    type: 'progress' | 'stage' | 'thought' | 'complete' | 'error' | 'heartbeat' | 'agent';
    executionId: string;
    projectId?: string; // Optional context for global event routing
    timestamp: number;
    // Progress fields
    progress?: number;
    message?: string;
    currentStage?: string;
    status?: string;
    stages?: unknown[];
    totalProgress?: number;
    // Agent timeline fields
    agent?: string;
    action?: string;
    durationMs?: number;
    tokensUsed?: number;
    costUsd?: number;
    // VFS Snapshot
    files?: { path: string; content?: string }[];
    // Nested metadata
    metadata?: Record<string, unknown>;
}

// ─── PUBLISHER ────────────────────────────────────────────────────────────────

/**
 * Publish a build event to the Redis stream for the given executionId.
 * Also publishes to the legacy pub/sub channel for any old subscribers.
 * Also updates the build:state snapshot so reconnecting clients get fresh state.
 */
export async function publishBuildEvent(event: BuildEvent): Promise<void> {
    const { executionId } = event;
    const streamKey = `build:stream:${executionId}`;
    const stateKey = `build:state:${executionId}`;
    const pubChannel = `build:progress:${executionId}`;
    const payload = JSON.stringify(event);

    try {
        // Throttle progress and thought events to prevent socket storms
        if (event.type === 'progress' || event.type === 'thought') {
            const throttleKey = `${event.executionId}:${event.type}`;
            const now = Date.now();
            const last = throttleMap.get(throttleKey) || 0;
            if (now - last < THROTTLE_MS) {
                return; // Silently drop high-frequency small updates
            }
            throttleMap.set(throttleKey, now);
        }

        const pipeline = redis.pipeline();

        // 1. Append to stream with inline MAXLEN — atomic, no separate XTRIM needed
        //    ioredis variadic: XADD key MAXLEN ~ 500 * field value
        pipeline.xadd(streamKey, 'MAXLEN', '~', 500, '*', 'data', payload);
        // Reset TTL on each message
        pipeline.expire(streamKey, STREAM_TTL_SECONDS);

        // 2. Update the snapshot state (for initial-state hydration on connect)
        pipeline.setex(stateKey, STREAM_TTL_SECONDS, payload);

        // 2b. Authoritative Event Persistence (Layer 9)
        if (event.type === 'stage' || event.type === 'agent' || event.type === 'error' || event.type === 'complete') {
            PersistenceStore.logEvent({
                execution_id: event.executionId,
                type: event.type,
                agent_name: event.agent || event.metadata?.agent as string,
                action: event.action,
                message: event.message,
                data: event.metadata || {}
            }).catch(() => {}); // Non-blocking persist
        }

        // 3. Legacy pub/sub compat (non-blocking, best-effort)
        pipeline.publish(pubChannel, payload);

        // 4. Global broadcast for Socket.IO project routing
        if (event.projectId) {
            pipeline.publish('build-events', payload);
        }

        await pipeline.exec();
    } catch (err) {
        logger.error({ err, executionId }, '[EventBus] Failed to publish build event');
    }
}

// ─── SUBSCRIBER (server-side streaming) ───────────────────────────────────────

/**
 * Read new messages from the stream starting after `lastId`.
 * Uses XREAD BLOCK with a timeout so we don't hold connections indefinitely.
 *
 * @param executionId  The build execution ID
 * @param lastId       Last stream entry ID seen (use '0' to read all from start, '$' for new only)
 * @param blockMs      How long to block waiting for new messages (default 20s)
 * @returns            Array of [id, event] tuples, or null on timeout
 */
export async function readBuildEvents(
    executionId: string,
    lastId: string,
    blockMs = 20_000
): Promise<Array<[string, BuildEvent]> | null> {
    const streamKey = `build:stream:${executionId}`;

    try {
        // ioredis returns: [[streamKey, [[id, [field, value, ...]], ...]]] | null
        const result = await (redis as unknown as { xread: (...args: unknown[]) => Promise<unknown[][]> }).xread(
            'BLOCK', blockMs,
            'COUNT', 50,
            'STREAMS', streamKey, lastId
        ) as [string, [string, string[]][]][] | null;

        if (!result || !result[0]) return null;

        const [, messages] = result[0] as [string, [string, string[]][]];
        return messages.map(([id, fields]) => {
            // fields is flat: ['data', '{json}']
            const dataIdx = fields.indexOf('data');
            const raw = dataIdx !== -1 ? fields[dataIdx + 1] : '{}';
            const event = JSON.parse(raw) as BuildEvent;
            return [id, event] as [string, BuildEvent];
        });
    } catch (err: unknown) {
        // BLOCK timeout produces a null result, not an error — real errors need logging
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes('timeout') && !msg.includes('ECONNRESET')) {
            logger.error({ err, executionId }, '[EventBus] xread error');
        }
        return null;
    }
}

/**
 * Get the last recorded build state snapshot for a given executionId.
 * Used to hydrate the client immediately on SSE connect (before streaming starts).
 */
export async function getLatestBuildState(executionId: string): Promise<BuildEvent | null> {
    try {
        const raw = await redis.get(`build:state:${executionId}`);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

/**
 * Convenience wrappers used by the orchestrator.
 */
export const eventBus = {
    /** Emit a progress event */
    progress(executionId: string, progress: number, message: string, stage?: string, status = 'executing', projectId?: string, metrics?: { tokens?: number; duration?: number; cost?: number }) {
        return publishBuildEvent({
            type: 'progress',
            executionId,
            projectId,
            timestamp: Date.now(),
            progress,
            totalProgress: progress,
            message,
            currentStage: stage,
            status,
            tokensUsed: metrics?.tokens,
            durationMs: metrics?.duration,
            costUsd: metrics?.cost
        });
    },

    /** Emit a stage transition event */
    stage(executionId: string, stageId: string, stageStatus: string, message: string, progress: number, projectId?: string, files?: { path: string; content?: string }[], metrics?: { tokens?: number; duration?: number; cost?: number }) {
        return publishBuildEvent({
            type: 'stage',
            executionId,
            projectId,
            timestamp: Date.now(),
            currentStage: stageId,
            status: stageStatus,
            message: `[Stage] ${message}`,
            progress,
            totalProgress: progress,
            files,
            tokensUsed: metrics?.tokens,
            durationMs: metrics?.duration,
            costUsd: metrics?.cost
        });
    },

    /** Emit an AI agent thought / log line */
    thought(executionId: string, agent: string, thought: string, projectId?: string) {
        return publishBuildEvent({
            type: 'thought',
            executionId,
            projectId,
            timestamp: Date.now(),
            message: thought,
            metadata: { agent },
        });
    },

    /** Emit final completion event and schedule stream cleanup */
    async complete(executionId: string, previewUrl?: string, metadata?: Record<string, unknown>, projectId?: string, files?: { path: string; content?: string }[]) {
        const tokens = Number(metadata?.tokensTotal || 0);
        const duration = Number(metadata?.durationMs || 0);
        const cost = (tokens / 1000) * 0.002;

        await publishBuildEvent({
            type: 'complete',
            executionId,
            projectId,
            timestamp: Date.now(),
            status: 'completed',
            progress: 100,
            totalProgress: 100,
            message: 'Build complete',
            currentStage: 'deployment',
            metadata: { previewUrl, ...metadata },
            files,
            tokensUsed: tokens,
            durationMs: duration,
            costUsd: cost
        });
        // Schedule stream cleanup — expire in 4 hours so replay is available for debugging
        try {
            await redis.expire(`build:stream:${executionId}`, STREAM_TTL_SECONDS);
            await redis.expire(`build:state:${executionId}`, STREAM_TTL_SECONDS);
        } catch { /* non-fatal */ }
    },

    /** Emit an agent activity event (appears in the Timeline tab) */
    agent(executionId: string, agentName: string, action: string, message: string, projectId?: string) {
        return publishBuildEvent({
            type: 'agent',
            executionId,
            projectId,
            timestamp: Date.now(),
            agent: agentName,
            action,
            message,
        });
    },

    /**
     * Start a duration-tracked agent timer.
     * Emits a 'started' event immediately, returns a done() function that emits
     * a 'finished' event with elapsed time when called.
     *
     * Usage:
     *   const done = await eventBus.startTimer(id, 'DatabaseAgent', 'schema_design', 'Designing schema...');
     *   // ... do work ...
     *   await done('Schema complete');
     */
    async startTimer(executionId: string, agentName: string, action: string, message: string, projectId?: string) {
        const startedAt = Date.now();
        await publishBuildEvent({
            type: 'agent',
            executionId,
            projectId,
            timestamp: startedAt,
            agent: agentName,
            action: `${action}:started`,
            message,
        });
        return async (completionMessage?: string) => {
            const durationMs = Date.now() - startedAt;
            await publishBuildEvent({
                type: 'agent',
                executionId,
                projectId,
                timestamp: Date.now(),
                agent: agentName,
                action: `${action}:finished`,
                message: completionMessage || message,
                durationMs,
            });
        };
    },

    /** Emit a build failure event */
    error(executionId: string, message: string, projectId?: string) {
        return publishBuildEvent({
            type: 'error',
            executionId,
            projectId,
            timestamp: Date.now(),
            status: 'failed',
            message,
        });
    },

    /** Read new messages from the stream */
    readBuildEvents
} as const;

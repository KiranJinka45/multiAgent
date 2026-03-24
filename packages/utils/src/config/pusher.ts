/**
 * lib/pusher.ts — Legacy compatibility stub.
 *
 * The task-orchestrator used to call `pusher.triggerBuildUpdate()` but the
 * module never existed, causing all build events to be silently swallowed.
 *
 * This stub re-routes calls to the new Redis Streams Event Bus so old call
 * sites work without changes. All new code should use eventBus directly.
 */

import { eventBus } from '../services/event-bus';
import logger from './logger';

export const pusher = {
    /**
     * Called by task-orchestrator updateLegacyUiStage().
     * Re-routes to Redis Streams Event Bus.
     */
    triggerBuildUpdate(executionId: string, stageData: {
        id?: string;
        status?: string;
        message?: string;
        progressPercent?: number;
        progress?: number;
        [key: string]: unknown;
    }) {
        if (!executionId) return;
        const progress = stageData.progressPercent ?? stageData.progress ?? 0;
        eventBus.stage(
            executionId,
            stageData.id || 'initializing',
            stageData.status || 'in_progress',
            stageData.message || '',
            progress
        ).catch(err => logger.warn({ err }, '[Pusher stub] Failed to route to event bus'));
    },
};

export default pusher;

import { redis } from './redis';
import { eventBus } from './event-bus';
import { PersistenceStore } from './persistence-store';
import logger from '@packages/observability';

export type ProjectLifecycleState = 
    | 'created' 
    | 'building' 
    | 'sandbox-starting' 
    | 'server-starting' 
    | 'preview-ready' 
    | 'error';

export interface ProjectStateMetadata {
    projectId: string;
    executionId: string;
    status: ProjectLifecycleState;
    message?: string;
    progress?: number;
    tokens?: number;
    duration?: number;
    cost?: number;
    updatedAt: number;
}

export class ProjectStateManager {
    private static instance: ProjectStateManager;

    private constructor() {}

    public static getInstance(): ProjectStateManager {
        if (!ProjectStateManager.instance) {
            ProjectStateManager.instance = new ProjectStateManager();
        }
        return ProjectStateManager.instance;
    }

    /**
     * Atomically transitions the project to a new lifecycle state.
     * Persists to both Redis (real-time) and Supabase (authoritative).
     */
    async transition(
        executionId: string, 
        newState: ProjectLifecycleState, 
        message: string, 
        progress: number, 
        projectId: string,
        metrics?: { tokens?: number; duration?: number; cost?: number; previewUrl?: string }
    ) {
        const timestamp = Date.now();
        const metadata: ProjectStateMetadata = {
            projectId,
            executionId,
            status: newState,
            message,
            progress,
            updatedAt: timestamp,
            ...(metrics?.tokens !== undefined && { tokens: metrics.tokens }),
            ...(metrics?.duration !== undefined && { duration: metrics.duration }),
            ...(metrics?.cost !== undefined && { cost: metrics.cost })
        };

        try {
            // 1. Real-time Sync (Redis)
            await redis.set(`project:state:${executionId}`, JSON.stringify(metadata), 'EX', 86400);

            // 2. Authoritative Sync (Supabase Layer 9 Persistence)
            await PersistenceStore.upsertBuild({
                id: executionId,
                project_id: projectId,
                status: 'executing', // Base status
                current_stage: newState,
                progress_percent: progress,
                message,
                ...(metrics?.tokens !== undefined && { tokens_used: metrics.tokens }),
                ...(metrics?.duration !== undefined && { duration_ms: metrics.duration }),
                ...(metrics?.cost !== undefined && { cost_usd: metrics.cost }),
                ...(metrics?.previewUrl !== undefined && { preview_url: metrics.previewUrl }),
                metadata: { transitionTime: timestamp }
            });

            // Also ensure project entry is refreshed
            await PersistenceStore.ensureProject(projectId, 'Autonomous Project', 'system_level');

            // 3. Emit Event via Bus
            await eventBus.stage(executionId, newState, 'in_progress', message, progress, projectId, [], {
                ...(metrics?.tokens !== undefined && { tokens: metrics.tokens }),
                ...(metrics?.duration !== undefined && { duration: metrics.duration }),
                ...(metrics?.cost !== undefined && { cost: metrics.cost })
            });
            
            logger.info({ executionId, status: newState, progress }, '[StateManager] Transitioned successfully');

        } catch (error) {
            logger.error({ error, executionId, newState }, '[StateManager] Transition failure');
        }
    }

    async getState(executionId: string): Promise<ProjectStateMetadata | null> {
        const raw = await redis.get(`project:state:${executionId}`);
        return raw ? JSON.parse(raw) : null;
    }
}

export const stateManager = ProjectStateManager.getInstance();

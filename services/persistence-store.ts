import { supabaseAdmin } from './supabase-admin';
import logger from '@/config/logger';

export interface BuildRecord {
    id: string;
    project_id: string;
    status: string;
    current_stage: string;
    progress_percent: number;
    message: string;
    tokens_used?: number;
    duration_ms?: number;
    cost_usd?: number;
    preview_url?: string;
    metadata?: Record<string, unknown>;
}

export interface BuildEventRecord {
    execution_id: string;
    type: string;
    agent_name?: string;
    action?: string;
    message?: string;
    data?: Record<string, unknown>;
}

export class PersistenceStore {
    /**
     * Atomically log a build state transition.
     */
    static async upsertBuild(build: BuildRecord) {
        if (!supabaseAdmin) return;
        try {
            const { error } = await supabaseAdmin.from('builds').upsert({
                id: build.id,
                project_id: build.project_id,
                status: build.status,
                current_stage: build.current_stage,
                progress_percent: build.progress_percent,
                message: build.message,
                tokens_used: build.tokens_used,
                duration_ms: build.duration_ms,
                cost_usd: build.cost_usd,
                preview_url: build.preview_url,
                metadata: build.metadata,
                updated_at: new Date().toISOString()
            });
            if (error) logger.error({ error, buildId: build.id }, '[PersistenceStore] Build Upsert Error');
        } catch (err) {
            logger.error({ err }, '[PersistenceStore] Fatal DB Error during build upsert');
        }
    }

    /**
     * Store a granular event for history/replay.
     */
    static async logEvent(event: BuildEventRecord) {
        if (!supabaseAdmin) return;
        try {
            const { error } = await supabaseAdmin.from('build_events').insert({
                execution_id: event.execution_id,
                type: event.type,
                agent_name: event.agent_name,
                action: event.action,
                message: event.message,
                data: event.data,
                timestamp: new Date().toISOString()
            });
            if (error) logger.error({ error, executionId: event.execution_id }, '[PersistenceStore] Event Logging Error');
        } catch (err) {
            logger.error({ err }, '[PersistenceStore] Fatal DB Error during event log');
        }
    }

    /**
     * Ensure a project exists in the DB.
     */
    static async ensureProject(projectId: string, name: string, userId: string) {
        if (!supabaseAdmin) return;
        try {
            const { error } = await supabaseAdmin.from('projects').upsert({
                id: projectId,
                name,
                user_id: userId,
                updated_at: new Date().toISOString()
            });
            if (error) logger.error({ error, projectId }, '[PersistenceStore] Project Sync Error');
        } catch (err) {
            logger.error({ err }, '[PersistenceStore] Fatal DB Error during project sync');
        }
    }
}

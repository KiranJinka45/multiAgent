import { supabaseAdmin } from '@libs/utils';
import logger from '@libs/utils';

export interface PerformanceSnapshot {
    agentName: string;
    taskType: string;
    success: boolean;
    durationMs: number;
    tokens: number;
}

export class AgentMetrics {
    /**
     * Records the outcome of an agent's task execution.
     */
    static async record(snapshot: PerformanceSnapshot): Promise<void> {
        const { agentName, taskType, success, durationMs, tokens } = snapshot;

        logger.info({ agentName, taskType, success }, '[AgentMetrics] Recording performance snapshot...');

        try {
            const { error } = await supabaseAdmin.rpc('record_agent_performance', {
                p_agent_name: agentName,
                p_task_type: taskType,
                p_success: success,
                p_duration: durationMs,
                p_tokens: tokens
            });

            if (error) {
                logger.error({ error }, '[AgentMetrics] Failed to record performance via RPC');
            }
        } catch (e) {
            logger.error({ error: e }, '[AgentMetrics] Fatal error recording metrics');
        }
    }

    /**
     * Retrieves performance data for an agent.
     */
    static async getAgentStats(agentName: string) {
        const { data, error } = await supabaseAdmin
            .from('agent_performance')
            .select('*')
            .eq('agent_name', agentName);

        if (error) return null;
        return data;
    }
}

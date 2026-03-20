/**
 * libs/core-engine/lightweight-orchestrator.ts
 * 
 * High-performance, ephemeral orchestrator for fast tasks.
 */

import { AgentRequest, AgentResponse, AgentContext } from '@libs/contracts';
import { agentRegistry } from '../../apps/api-gateway/services/task-engine/agent-registry'; // Temporary bridge
import { eventBus } from '@shared/services/event-bus';
import logger from '@libs/utils';

export interface LightweightTask {
    id: string;
    agent: string;
    prompt: string;
    params?: any;
    dependencies: string[];
}

export class LightweightOrchestrator {
    private executionId: string;
    private projectId: string;

    constructor(executionId: string, projectId: string) {
        this.executionId = executionId;
        this.projectId = projectId;
    }

    async run(tasks: LightweightTask[], context: AgentContext): Promise<AgentResponse[]> {
        logger.info({ executionId: this.executionId, taskCount: tasks.length }, '[LightweightOrchestrator] Starting fast-path execution');
        
        const results: Map<string, AgentResponse> = new Map();
        const pending = new Set(tasks.map(t => t.id));
        const completed = new Set<string>();

        while (pending.size > 0) {
            const ready = tasks.filter(t => 
                pending.has(t.id) && 
                t.dependencies.every(d => completed.has(d))
            );

            if (ready.length === 0 && pending.size > 0) {
                throw new Error('Cyclic dependency detected or tasks stuck in lightweight orchestration');
            }

            // Parallel execution of ready tasks
            await Promise.all(ready.map(async (task) => {
                await eventBus.agent(this.executionId, task.agent, 'executing', `Starting ${task.id}...`, this.projectId);
                
                const agent = agentRegistry.getAgent(task.agent);
                if (!agent) throw new Error(`Agent ${task.agent} not found in registry`);

                const start = Date.now();
                const request: AgentRequest = {
                    prompt: task.prompt,
                    context: { 
                        ...context, 
                        history: Array.from(results.values()).map(r => ({ agent: '', action: '', timestamp: Date.now(), success: r.success, data: r.data })) 
                    },
                    params: task.params || {}
                };

                try {
                    const response = await agent.execute(request, new AbortController().signal);
                    
                    results.set(task.id, response);
                    completed.add(task.id);
                    pending.delete(task.id);

                    await eventBus.agent(this.executionId, task.agent, 'completed', `${task.id} finished successfully`, this.projectId);
                } catch (err) {
                    logger.error({ err, taskId: task.id }, '[LightweightOrchestrator] Task failed');
                    await eventBus.error(this.executionId, err instanceof Error ? err.message : String(err), this.projectId);
                    throw err;
                }
            }));
        }

        return Array.from(results.values());
    }
}

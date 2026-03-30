/**
 * libs/core-engine/workflow-engine.ts
 * 
 * Robust, stateful workflow engine for production-grade agent orchestration.
 */

import { AgentRequest, AgentResponse, AgentContext } from '@packages/contracts';
import { agentRegistry } from '@packages/agents';
import { projectMemory, eventBus, logger } from '@packages/utils/server';

export interface WorkflowTask {
    id: string;
    agent: string;
    prompt: string;
    params?: any;
    dependencies: string[];
    retryCount?: number;
    maxRetries?: number;
}

export interface WorkflowState {
    executionId: string;
    projectId: string;
    tasks: WorkflowTask[];
    results: Record<string, AgentResponse>;
    status: 'running' | 'completed' | 'failed' | 'paused';
    updatedAt: number;
    metrics: {
        totalTokens: number;
        totalDurationMs: number;
        agentLatencies: Record<string, number[]>; // agentName -> [ms1, ms2, ...]
    };
}

export class WorkflowEngine {
    private executionId: string;
    private projectId: string;

    constructor(executionId: string, projectId: string) {
        this.executionId = executionId;
        this.projectId = projectId;
    }

    private async saveState(state: WorkflowState) {
        await redis.setex(`workflow:state:${this.executionId}`, 86400 * 7, JSON.stringify(state)); // 7 days TTL
    }

    private async loadState(): Promise<WorkflowState | null> {
        const raw = await redis.get(`workflow:state:${this.executionId}`);
        return raw ? JSON.parse(raw) : null;
    }

    async run(tasks: WorkflowTask[], context: AgentContext): Promise<AgentResponse[]> {
        let state = await this.loadState();
        if (!state) {
            state = {
                executionId: this.executionId,
                projectId: this.projectId,
                tasks,
                results: {},
                status: 'running',
                updatedAt: Date.now(),
                metrics: {
                    totalTokens: 0,
                    totalDurationMs: 0,
                    agentLatencies: {}
                }
            };
            await this.saveState(state);
        }

        logger.info({ executionId: this.executionId, status: state.status }, '[WorkflowEngine] Resuming/Starting workflow');

        while (state.status === 'running') {
            const pending = state.tasks.filter(t => !state!.results[t.id]);
            if (pending.length === 0) {
                state.status = 'completed';
                await this.saveState(state);
                break;
            }

            const ready = pending.filter(t => 
                t.dependencies.every(d => state!.results[d]?.success)
            );

            if (ready.length === 0) {
                const failedDeps = pending.filter(t => t.dependencies.some(d => state!.results[d]?.success === false));
                if (failedDeps.length > 0) {
                    state.status = 'failed';
                    await this.saveState(state);
                    throw new Error('Workflow stalled due to dependency failure');
                }
                break; // Should not happen in well-formed DAG
            }

            // Execute ready tasks in parallel
            await Promise.all(ready.map(async (task) => {
                const agent = agentRegistry.getAgent(task.agent);
                if (!agent) throw new Error(`Agent ${task.agent} not found`);

                const maxRetries = task.maxRetries || 3;
                let attempt = 0;
                let success = false;
                let lastResponse: AgentResponse | null = null;

                while (attempt < maxRetries && !success) {
                    attempt++;

                    // Budget Check (Cost Governance)
                    if (context.budget && state!.metrics.totalTokens > context.budget.maxTokens) {
                        logger.warn({ executionId: this.executionId, totalTokens: state!.metrics.totalTokens, budget: context.budget.maxTokens }, '[WorkflowEngine] HALTING: Token budget exceeded');
                        state!.status = 'failed';
                        await this.saveState(state!);
                        throw new Error(`Execution halted: Token budget of ${context.budget.maxTokens} exceeded (used ${state!.metrics.totalTokens})`);
                    }

                    try {
                        const request: AgentRequest = {
                            prompt: task.prompt,
                            context: { ...context, history: Object.values(state!.results).map(r => ({ agent: '', action: '', timestamp: Date.now(), success: r.success, data: r.data })) },
                            params: task.params || {}
                        };
                        
                        const start = Date.now();
                        const response = await agent.execute(request, new AbortController().signal);
                        const duration = Date.now() - start;

                        lastResponse = response;

                        // Track Metrics
                        state!.metrics.totalTokens += response.metrics.tokensTotal;
                        state!.metrics.totalDurationMs += duration;
                        if (!state!.metrics.agentLatencies[task.agent]) {
                            state!.metrics.agentLatencies[task.agent] = [];
                        }
                        state!.metrics.agentLatencies[task.agent].push(duration);

                        if (lastResponse.success) {
                            success = true;
                        } else {
                            logger.warn({ taskId: task.id, attempt, error: lastResponse.error }, '[WorkflowEngine] Task failed, retrying...');
                            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                        }
                    } catch (err) {
                        logger.error({ err, taskId: task.id, attempt }, '[WorkflowEngine] Critical task error');
                        if (attempt >= maxRetries) throw err;
                        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                    }
                }

                if (lastResponse) {
                    state!.results[task.id] = lastResponse;
                    state!.updatedAt = Date.now();
                    await this.saveState(state!);
                }
            }));
        }

        // Final Report logic could be added here (e.g., P95 calc)
        this.logFinalMetrics(state);

        return Object.values(state.results);
    }

    private logFinalMetrics(state: WorkflowState) {
        const report: Record<string, any> = {
            totalTokens: state.metrics.totalTokens,
            totalDurationMs: state.metrics.totalDurationMs,
            agentStats: {}
        };

        for (const [agent, latencies] of Object.entries(state.metrics.agentLatencies)) {
            const sorted = [...latencies].sort((a, b) => a - b);
            report.agentStats[agent] = {
                avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
                p95: sorted[Math.floor(sorted.length * 0.95)],
                p99: sorted[Math.floor(sorted.length * 0.99)],
                count: latencies.length
            };
        }

        logger.info({ report, executionId: this.executionId }, '[WorkflowEngine] Final Performance Report');
    }
}

import { TaskGraph, BaseTask } from './task-graph';
import { agentRegistry } from './agent-registry';
import { AgentMetrics } from '../agent-intelligence/agent-metrics';
import { StrategyEngine } from '../agent-intelligence/strategy-engine';
import { SwarmOrchestrator } from './swarm-orchestrator';
import logger from '../../config/logger';
import { eventBus } from '../../services/event-bus';

export class TaskExecutor {
    /**
     * Traverses the TaskGraph, executing tasks whose dependencies are met.
     * Starts execution of independent nodes in parallel automatically.
     */
    async evaluateGraph(graph: TaskGraph, globalContext?: any) {
        const concurrentTasks = new Set<string>();
        let isRunning = true;

        logger.info('Starting Multi-Agent Task Graph execution');
        let remainingTasks = graph.getAllTasks().filter(t => t.status !== 'completed' && t.status !== 'failed');

        try {
            while (remainingTasks.length > 0 && isRunning) {
                const runnableTasks = graph.getReadyTasks();

                if (runnableTasks.length === 0) {
                    // If there are remaining tasks, but none runnable, it implies a cycle or failed dependencies preventing progression.
                    const executing = concurrentTasks.size > 0;
                    if (!executing) {
                        logger.error('Task engine detected a deadlock or failed dependency graph! Halting execution.');
                        return;
                    }
                    // Yield to event loop to allow concurrent promises to advance the graph status
                    await new Promise(r => setTimeout(r, 100));
                } else {
                    // Spawn parallel executions for all currently runnable nodes
                    const runPromises = runnableTasks.map(task => this.executeTask(task, graph, globalContext, concurrentTasks));
                    await Promise.all(runPromises);
                }

                remainingTasks = graph.getAllTasks().filter(t => t.status !== 'completed' && t.status !== 'failed');
            }
        } finally {
            logger.info('Task Graph execution finished.');
            isRunning = false;
        }
    }

    private async executeTask(task: BaseTask, graph: TaskGraph, globalContext: any, concurrentTasks: Set<string>) {
        if (concurrentTasks.has(task.id)) return;

        concurrentTasks.add(task.id);
        const executingTask = graph.getTask(task.id)!;
        executingTask.status = 'running';

        logger.info({ taskId: task.id, type: task.type }, `Spawning agent assigned to task '${task.title}'`);

        const startTime = Date.now();
        try {
            // Check if registry handles this type. If not, default to standard generic prompt logic or skip.
            if (!agentRegistry.hasAgent(task.type)) {
                logger.warn({ type: task.type }, `No specialised agent found for task type. Skiping task resolution.`);
                executingTask.status = 'completed'; // Soft-fail or dummy skip for now
            } else {
                // ── 1. Evolution: Strategy Optimization ─────────────────
                const strategy = await StrategyEngine.getOptimalStrategy(task.type, task.title);
                SwarmOrchestrator.broadcast(task.type, `Starting task: ${task.title} with strategy: ${strategy.strategy}`);

                const executionId = globalContext?.executionId || 'unknown';
                const agentTimer = await eventBus.startTimer(executionId, task.type, 'task_execution', `Processing: ${task.title}`);

                const res = await agentRegistry.runTaskDirectly(task.type, task.payload, globalContext, undefined, strategy);
                
                await agentTimer(res.success ? 'Success' : `Failed: ${res.error}`);
                
                console.log(`[DEBUG] Agent ${task.type} resolved task ${task.id}. Success: ${res.success}, Files: ${res.data?.fileCount || res.data?.files?.length || 0}`);

                const duration = Date.now() - startTime;

                if (res.success) {
                    executingTask.status = 'completed';
                    logger.info({ taskId: task.id, duration }, `Agent successfully resolved task.`);

                    // ── 2. Evolution: Record Performance ────────────────────
                    await AgentMetrics.record({
                        agentName: task.type,
                        taskType: task.title,
                        success: true,
                        durationMs: duration,
                        tokens: 2500 // Mock token usage
                    });
                } else {
                    // ── 3. Autonomous Self-Healing: DebugAgent retry ────────
                    logger.warn({ taskId: task.id, error: res.error }, `Agent failed. Attempting DebugAgent self-heal...`);

                    const healed = await this.attemptDebugFix(task, res, globalContext);
                    if (healed) {
                        executingTask.status = 'completed';
                        logger.info({ taskId: task.id, duration: Date.now() - startTime }, `Task self-healed via DebugAgent.`);

                        await AgentMetrics.record({
                            agentName: task.type,
                            taskType: task.title,
                            success: true,
                            durationMs: Date.now() - startTime,
                            tokens: 3500 // Agent + debug attempt
                        });
                    } else {
                        executingTask.status = 'failed';
                        logger.error({ taskId: task.id, error: res.error }, `Agent failed its task execution and DebugAgent could not heal!`);

                        await AgentMetrics.record({
                            agentName: task.type,
                            taskType: task.title,
                            success: false,
                            durationMs: Date.now() - startTime,
                            tokens: 3500
                        });
                    }
                }
            }
        } catch (e: any) {
            const duration = Date.now() - startTime;
            executingTask.status = 'failed';
            logger.error({ taskId: task.id, error: e.message }, `Agent threw exception.`);

            await AgentMetrics.record({
                agentName: task.type,
                taskType: task.title,
                success: false,
                durationMs: duration,
                tokens: 500
            });
        } finally {
            concurrentTasks.delete(task.id);
        }
    }

    /**
     * Attempt to self-heal a failed task by invoking DebugAgent.
     * Returns true if the fix was successful.
     */
    private async attemptDebugFix(task: BaseTask, failedResult: any, globalContext?: any): Promise<boolean> {
        try {
            const { DebugAgent } = require('../../agents/debug-agent');
            const debugAgent = new DebugAgent();

            const errorMsg = failedResult.error || 'Unknown agent failure';
            const existingFiles = failedResult.data?.files || [];

            const debugResult = await debugAgent.execute({
                errors: errorMsg,
                files: existingFiles.slice(0, 10),
                userPrompt: task.payload?.prompt || task.description
            }, {} as any);

            if (debugResult.success && debugResult.data?.patches?.length > 0 && debugResult.data.confidence > 0.5) {
                logger.info({
                    taskId: task.id,
                    patchCount: debugResult.data.patches.length,
                    confidence: debugResult.data.confidence
                }, 'DebugAgent produced a fix — injecting into context');

                // Store the fixed files back into globalContext
                if (globalContext?.setAgentResult) {
                    globalContext.setAgentResult(task.type, {
                        data: { files: debugResult.data.patches },
                        success: true
                    });
                }
                return true;
            }

            return false;
        } catch (e) {
            logger.warn({ taskId: task.id, error: e }, 'DebugAgent self-heal attempt failed');
            return false;
        }
    }
}

export const taskExecutor = new TaskExecutor();


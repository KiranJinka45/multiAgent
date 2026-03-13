import { TaskGraph, BaseTask } from './task-graph';
import { agentRegistry } from './agent-registry';
import { AgentContext } from '../../types/agent-context';
import { AgentMetrics } from '../agent-intelligence/agent-metrics';
import { StrategyEngine } from '../agent-intelligence/strategy-engine';
import { SwarmOrchestrator } from './swarm-orchestrator';
import logger from '../../config/logger';
import { eventBus } from '../event-bus';
import { DebugAgent } from '../../agents/debug-agent';
import { AgentResponse } from '../../agents/base-agent';
import { patchEngine } from '../patch-engine';
import { BuildCache } from './build-cache';
import { previewManager } from '../../runtime/preview-manager';

export class TaskExecutor {
    /**
     * Traverses the TaskGraph, executing tasks whose dependencies are met.
     * Starts execution of independent nodes in parallel automatically.
     */
    /**
     * Traverses the TaskGraph, executing tasks whose dependencies are met.
     * Starts execution of independent nodes in parallel automatically.
     */
    async evaluateGraph(graph: TaskGraph, globalContext: AgentContext) {
        const concurrentTasks = new Set<string>();
        let isRunning = true;

        logger.info('Starting Agent Task Graph Engine execution');
        
        try {
            while (isRunning) {
                const runnableTasks = graph.getReadyTasks();
                const remainingPending = graph.getAllTasks().filter(t => t.status === 'pending');

                if (runnableTasks.length === 0) {
                    if (remainingPending.length === 0) {
                        // All tasks are either running, completed, or failed.
                        const running = graph.getAllTasks().filter(t => t.status === 'running');
                        if (running.length === 0) {
                            isRunning = false;
                            break;
                        }
                    } else {
                        // Deadlock detection?
                        const running = graph.getAllTasks().filter(t => t.status === 'running');
                        if (running.length === 0) {
                            logger.error('Task Engine Deadlock: Tasks remain pending but none are runnable.');
                            isRunning = false;
                            break;
                        }
                    }
                    // Wait for concurrent tasks to complete
                    await new Promise(r => setTimeout(r, 200));
                } else {
                    // Start all runnable tasks in parallel
                    for (const task of runnableTasks) {
                        // Fire and forget executeTask, it will update status inside
                        this.executeTask(task, graph, globalContext, concurrentTasks).catch(err => {
                            logger.error({ taskId: task.id, err }, 'Critical error in background task execution');
                        });
                    }
                    // Briefly wait as we've spawned new work
                    await new Promise(r => setTimeout(r, 100));
                }

                if (graph.hasFailed()) {
                    logger.warn('Graph execution contains failures. Continuing other branches if possible.');
                }
            }
        } finally {
            logger.info('Agent Task Graph Engine execution finished.');
        }
    }

    private async executeTask(task: BaseTask, graph: TaskGraph, globalContext: AgentContext, concurrentTasks: Set<string>) {
        if (concurrentTasks.has(task.id)) return;

        concurrentTasks.add(task.id);
        const executingTask = graph.getTask(task.id)!;
        executingTask.status = 'running';

        logger.info({ taskId: task.id, type: task.type }, `[GraphEngine] Executing task: ${task.title}`);

        const startTime = Date.now();
        try {
            // ── 1. Context Preparation (Input Mapping) ──────────────────
            const taskInputs: Record<string, unknown> = { ...task.payload };
            if (task.inputs) {
                for (const inputKey of task.inputs) {
                    // Try to find input in the results of dependency tasks
                    for (const depId of task.dependsOn || []) {
                        const depTask = graph.getTask(depId);
                        if (depTask?.result && depTask.result[inputKey] !== undefined) {
                            taskInputs[inputKey] = depTask.result[inputKey];
                        }
                    }
                }
            }

            if (!agentRegistry.hasAgent(task.type)) {
                logger.warn({ type: task.type }, `No specialised agent for '${task.type}'. Skipping.`);
                graph.completeTask(task.id, { skipped: true });
            } else {
                // ── 2. Build Cache Check (Performance Upgrade) ────────────────
                const depResults = (task.dependsOn || []).map(id => graph.getTask(id)?.result || {});
                const cacheKey = BuildCache.generateKey(task.type, taskInputs, depResults);
                const cached = await BuildCache.get(cacheKey);

                if (cached) {
                    logger.info({ taskId: task.id, cacheKey }, '[GraphEngine] CACHE HIT: Reusing existing artifact');
                    await eventBus.agent(globalContext.getExecutionId(), task.type, 'cache_hit', `Reused cached result for: ${task.title}`, globalContext.getProjectId());
                    graph.completeTask(task.id, cached);
                    return;
                }

                const strategy = await StrategyEngine.getOptimalStrategy(task.type, task.title);
                SwarmOrchestrator.broadcast(task.type, `Task started: ${task.title}`);

                const executionId = globalContext.getExecutionId();
                const projectId = globalContext.getProjectId();
                const agentTimer = await eventBus.startTimer(executionId, task.type, 'task_execution', `Processing: ${task.title}`, projectId);

                const res = await agentRegistry.runTaskDirectly(task.type, taskInputs, globalContext, undefined, strategy);
                
                await agentTimer(res.success ? 'Success' : `Failed: ${res.error}`);
                
                const duration = Date.now() - startTime;

                if (res.success) {
                    // ── Surgical Patch / VFS Sync ──────────────────────────
                    await this.syncTaskResults(res, globalContext);
                    
                    const resultData = (res.data as Record<string, unknown>) || {};
                    await BuildCache.set(cacheKey, resultData);
                    
                    graph.completeTask(task.id, resultData);
                    logger.info({ taskId: task.id, duration }, `Task completed successfully.`);

                    await AgentMetrics.record({
                        agentName: task.type,
                        taskType: task.title,
                        success: true,
                        durationMs: duration,
                        tokens: res.tokens || 1000
                    });
                } else {
                    logger.warn({ taskId: task.id, error: res.error }, `Task failed. Attempting self-heal...`);
                    const healed = await this.attemptDebugFix(task, res, globalContext);
                    
                    if (healed) {
                        graph.completeTask(task.id, { healed: true });
                        logger.info({ taskId: task.id }, `Task self-healed.`);
                    } else {
                        graph.failTask(task.id, res.error || 'Unknown error');
                        logger.error({ taskId: task.id }, `Task failed after repair attempt.`);
                    }
                }
            }
        } catch (e: unknown) {
            const error = e as Error;
            logger.error({ taskId: task.id, error: error.message }, `Task execution threw exception.`);
            graph.failTask(task.id, error.message);
        } finally {
            concurrentTasks.delete(task.id);
        }
    }

    private async syncTaskResults(res: AgentResponse<unknown>, globalContext: AgentContext) {
        if (!res.data || typeof res.data !== 'object') return;
        
        const files = (res.data as Record<string, any>).files;
        if (Array.isArray(files)) {
            const projectId = globalContext.getProjectId();
            for (const file of files) {
                if (file.path && file.content) {
                    // 1. Surgical Patch Engine (Permanent)
                    await patchEngine.applyPatch(projectId, file.path, file.content);
                    
                    // 2. Real-time VFS Stream (Transient Hot-Reload)
                    await previewManager.streamFileUpdate(projectId, file.path, file.content);
                }
            }
        }
    }

    /**
     * Attempt to self-heal a failed task by invoking DebugAgent.
     * Returns true if the fix was successful.
     */
    private async attemptDebugFix(task: BaseTask, failedResult: AgentResponse<unknown>, globalContext: AgentContext): Promise<boolean> {
        try {
            const debugAgent = new DebugAgent();

            const errorMsg = (typeof failedResult.error === 'string' ? failedResult.error : 'Unknown agent failure');
            const data = failedResult.data as { files?: { path: string, content: string }[] } | undefined;
            const existingFiles = data?.files || [];

            const debugResult = await debugAgent.execute({
                errors: errorMsg,
                files: existingFiles.slice(0, 10),
                userPrompt: (task.payload?.prompt as string) || task.description || ''
            }, globalContext);

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
                        status: 'completed'
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


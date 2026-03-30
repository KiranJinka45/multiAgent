import { TaskGraph, BaseTask } from './task-graph';
import { agentRegistry } from './agent-registry';
import { AgentContext } from '@packages/contracts';
import { StrategyEngine, logger, eventBus, patchEngine, DistributedExecutionContext, AgentMemory } from '@packages/utils/server';
import { DebugAgent, AgentResponse } from '@packages/brain/debug-agent';
import { BuildCache } from './build-cache';
import { previewManager } from '@packages/preview-runtime/preview-manager';
import { workerPool } from './worker-pool';

import * as fsLib from 'fs-extra';
import pathLib from 'path';

const NODE_TIMEOUT = 180000; // Increased to 180s for complex tasks
const STALL_THRESHOLD = 30000; // Increased to 30s

const timeout = (ms: number) => new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`NODE_TIMEOUT_DETECTED: Absolute runtime limit reached (${ms}ms)`)), ms)
);

export class TaskExecutor {
    /**
     * Snapshot the current graph state to the sandbox for recovery.
     */
    async snapshotGraph(projectId: string, graph: TaskGraph) {
        const snapshotPath = pathLib.join(process.cwd(), '.generated-projects', projectId, 'graph-snapshot.json');
        await fsLib.ensureDir(pathLib.dirname(snapshotPath));
        await fsLib.writeJson(snapshotPath, graph.getAllTasks());
    }

    /**
     * Resume a graph from a snapshot.
     */
    async resumeGraph(projectId: string, graph: TaskGraph) {
        const snapshotPath = pathLib.join(process.cwd(), '.generated-projects', projectId, 'graph-snapshot.json');
        if (await fsLib.pathExists(snapshotPath)) {
            const tasks = await fsLib.readJson(snapshotPath) as BaseTask[];
            for (const t of tasks) {
                graph.addTask(t);
            }
            logger.info({ projectId }, 'Graph engine resumed from snapshot.');
            return true;
        }
        return false;
    }
    /**
     * Traverses the TaskGraph, executing tasks whose dependencies are met.
     * Starts execution of independent nodes in parallel automatically.
     */
    async evaluateGraph(graph: TaskGraph, globalContext: AgentContext) {
        let isRunning = true;
        const projectId = globalContext.getProjectId();
        let lastProgressCount = 0;
        let lastProgressTime = Date.now();

        // 0. Pre-flight Validation (Search for Deadlocks)
        const cycle = graph.detectCycle();
        if (cycle) {
            const cyclePath = cycle.join(' -> ');
            logger.error({ cycle: cyclePath }, 'ENGINE_DEADLOCK_PREVENTED: Circular dependency detected in task graph.');
            await eventBus.error(globalContext.getExecutionId(), `Circular dependency detected: ${cyclePath}`, projectId);
            return;
        }

        try {
            while (isRunning) {
                // 1. Get nodes ready for execution
                const readyTasks = graph.getReadyTasks();
                for (const task of readyTasks) {
                    // Fire and forget - executeTask handles its own lifecycle and workerPool integration
                    this.executeTask(task, graph, globalContext).catch(err => {
                        logger.error({ taskId: task.id, err }, 'Critical task execution escaped catch block');
                    });
                }

                // 2. Check for completion or terminal failure
                if (graph.isCompleted()) {
                    isRunning = false;
                    break;
                }

                if (graph.hasFailed()) {
                    logger.error('Graph Execution ABORTED: One or more tasks reached terminal failure state.');
                    isRunning = false;
                    break;
                }

                // 3. Progress Monitor (Deterministic)
                const currentCompleted = graph.getAllTasks().filter(t => t.status === 'completed').length;
                const running = graph.getAllTasks().filter(t => t.status === 'running');

                if (currentCompleted > lastProgressCount) {
                    lastProgressCount = currentCompleted;
                    lastProgressTime = Date.now();
                }

                // 4. Watchdog Recovery Integration
                if (running.length > 0 && (Date.now() - lastProgressTime > STALL_THRESHOLD)) {
                    logger.warn({ runningTasks: running.map(t => t.id) }, 'STALL DETECTED: No node completion. Initiating recovery...');
                    
                    for (const task of running) {
                        if (graph.isStuck(task.id, STALL_THRESHOLD)) {
                            logger.error({ taskId: task.id }, 'NODE_STALL: Attempting Surgical Recovery via DebugAgent');
                            
                            // Aion Architect Hack: Try to heal without full reset first
                            this.attemptDebugFix(task, { success: false, error: 'NODE_STALL: Task stopped producing progress.', data: {} }, globalContext)
                                .then(healed => {
                                    if (healed) {
                                        logger.info({ taskId: task.id }, 'Surgical recovery SUCCESSFUL. Node continuing.');
                                    } else {
                                        logger.warn({ taskId: task.id }, 'Surgical recovery failed. Resetting node.');
                                        graph.resetTask(task.id);
                                    }
                                });
                        }
                    }
                    lastProgressTime = Date.now();
                }

                // 5. Deadlock Prevention
                if (running.length === 0 && readyTasks.length === 0 && !graph.isCompleted() && !graph.hasFailed()) {
                    logger.error('ENGINE DEADLOCK: No tasks running, none ready, yet graph incomplete.');
                    isRunning = false;
                    break;
                }

                // 6. Snapshot and Throttle
                await this.snapshotGraph(projectId, graph);
                
                // Active worker heartbeat (Aion Architect Hardening)
                for (const t of running) {
                    t.lastUpdate = Date.now();
                }
                
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } finally {
            logger.info('Production-grade Graph Engine loop finished.');
            await this.snapshotGraph(projectId, graph);
        }
    }

    private async executeTask(task: BaseTask, graph: TaskGraph, globalContext: AgentContext) {
        const executionId = globalContext.getExecutionId();
        const projectId = globalContext.getProjectId();

        try {
            task.status = 'running';
            task.startTime = Date.now();
            task.lastUpdate = Date.now();
            
            logger.info({ node_id: task.id, type: task.type }, `[GraphEngine] NODE_STARTED: ${task.title}`);
            await eventBus.agent(executionId, task.type, 'NODE_STARTED', `Executing: ${task.title}`, projectId);

            // ── 1. Input Mapping ──────────────────
            const taskInputs: Record<string, unknown> = { ...task.payload };
            if (task.inputs) {
                for (const inputKey of task.inputs) {
                    for (const depId of task.dependsOn || []) {
                        const depTask = graph.getTask(depId);
                        if (depTask?.result && depTask.result[inputKey] !== undefined) {
                            taskInputs[inputKey] = depTask.result[inputKey];
                        }
                    }
                }
            }

            if (!agentRegistry.hasAgent(task.type)) {
                logger.warn({ type: task.type, taskId: task.id }, `No specialised agent for '${task.type}'. Skipping.`);
                graph.completeTask(task.id, { skipped: true });
                return;
            }

            // ── 2. Cache & Execution Check ────────────────
            const depResults = (task.dependsOn || []).map(id => graph.getTask(id)?.result || {});
            const cacheKey = BuildCache.generateKey(task.type, taskInputs, depResults);
            const cached = await BuildCache.get(cacheKey);

            if (cached) {
                logger.debug({ taskId: task.id }, '[GraphEngine] CACHE HIT');
                graph.completeTask(task.id, cached);
                return;
            }

            // ── 3. Worker Execution with Guardrails ────────────────
            const res = await workerPool.run(async () => {
                const strategy = await StrategyEngine.getOptimalStrategy(task.type, task.title);
                const agentTimer = await eventBus.startTimer(executionId, task.type, 'task_execution', `Processing: ${task.title}`, projectId);
                
                try {
                    const response = await Promise.race([
                        agentRegistry.runTaskDirectly(task.type, taskInputs, globalContext, undefined, strategy),
                        timeout(NODE_TIMEOUT)
                    ]) as AgentResponse<unknown>;
                    
                    await agentTimer(response.success ? 'Success' : `Failed: ${response.error}`);
                    return response;
                } catch (err) {
                    await agentTimer(`Exception: ${err instanceof Error ? err.message : String(err)}`);
                    throw err;
                }
            });
            
            if (res.success) {
                await this.syncTaskResults(res, globalContext);
                const resultData = (res.data as Record<string, unknown>) || {};
                await BuildCache.set(cacheKey, resultData);
                graph.completeTask(task.id, resultData);
                
                logger.info({ node_id: task.id }, `[GraphEngine] NODE_COMPLETED: ${task.title}`);
                await eventBus.agent(executionId, task.type, 'NODE_COMPLETED', `Successfully finished: ${task.title}`, projectId);
            } else {
                throw new Error(res.error || 'Agent execution failed without error message');
            }

        } catch (e: unknown) {
            const error = e as Error;
            logger.warn({ node_id: task.id, error: error.message }, `[GraphEngine] NODE_FAILURE: ${task.title}`);

            // Self-Heal or Retry Logic
            if ((task.retryCount || 0) < 1) {
                logger.info({ node_id: task.id }, 'Attempting self-heal/retry...');
                // Try Debug Fix if it's an execution failure (not a timeout)
                if (!error.message.includes('NODE_TIMEOUT_DETECTED')) {
                    const healed = await this.attemptDebugFix(task, { success: false, error: error.message, data: {} }, globalContext);
                    if (healed) {
                        graph.completeTask(task.id, { healed: true });
                        return;
                    }
                }
                graph.resetTask(task.id);
            } else {
                logger.error({ node_id: task.id }, 'NODE_ABORTED: Max retries reached.');
                graph.abortTask(task.id);
                await eventBus.agent(executionId, task.type, 'NODE_ABORTED', `Failed after retries: ${task.title}`, projectId);
            }
        }
    }

    private async syncTaskResults(res: AgentResponse<unknown>, globalContext: AgentContext) {
        if (!res.data || typeof res.data !== 'object') return;
        
        const files = (res.data as Record<string, Record<string, unknown>>).files;
        if (Array.isArray(files)) {
            const projectId = globalContext.getProjectId();
            await Promise.all(files.map(async (file) => {
                if (file.path && file.content) {
                    // 1. Surgical Patch Engine (Permanent)
                    await patchEngine.applyPatch(projectId, file.path, file.content);
                    
                    // 2. Real-time VFS Stream (Transient Hot-Reload)
                    await previewManager.streamFileUpdate(projectId, file.path, file.content);
                }
            }));
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


import { TaskGraph, BaseTask } from './task-graph';
import { agentRegistry } from './agent-registry';
import { AgentMetrics } from '../agent-intelligence/agent-metrics';
import { StrategyEngine } from '../agent-intelligence/strategy-engine';
import logger from '../logger';

export class TaskExecutor {
    private isRunning = false;
    private concurrentTasks = new Set<string>();

    /**
     * Traverses the TaskGraph, executing tasks whose dependencies are met.
     * Starts execution of independent nodes in parallel automatically.
     */
    async evaluateGraph(graph: TaskGraph, globalContext?: any) {
        if (this.isRunning) return;
        this.isRunning = true;

        logger.info('Starting Multi-Agent Task Graph execution');
        let remainingTasks = graph.getAllTasks().filter(t => t.status !== 'completed' && t.status !== 'failed');

        while (remainingTasks.length > 0 && this.isRunning) {
            const runnableTasks = graph.getReadyTasks();

            if (runnableTasks.length === 0) {
                // If there are remaining tasks, but none runnable, it implies a cycle or failed dependencies preventing progression.
                const executing = this.concurrentTasks.size > 0;
                if (!executing) {
                    logger.error('Task engine detected a deadlock or failed dependency graph! Halting execution.');
                    return;
                }
                // Yield to event loop to allow concurrent promises to advance the graph status
                await new Promise(r => setTimeout(r, 100));
            } else {
                // Spawn parallel executions for all currently runnable nodes
                const runPromises = runnableTasks.map(task => this.executeTask(task, graph, globalContext));
                await Promise.all(runPromises);
            }

            remainingTasks = graph.getAllTasks().filter(t => t.status !== 'completed' && t.status !== 'failed');
        }

        logger.info('Task Graph execution finished.');
        this.isRunning = false;
    }

    private async executeTask(task: BaseTask, graph: TaskGraph, globalContext?: any) {
        if (this.concurrentTasks.has(task.id)) return;

        this.concurrentTasks.add(task.id);
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
                // In a more advanced implementation, we would apply strategy.temperature etc. to the agent call

                const res = await agentRegistry.runTaskDirectly(task.type, task.payload, globalContext);

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
                    executingTask.status = 'failed';
                    logger.error({ taskId: task.id, error: res.error }, `Agent failed its task execution!`);

                    await AgentMetrics.record({
                        agentName: task.type,
                        taskType: task.title,
                        success: false,
                        durationMs: duration,
                        tokens: 500
                    });
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
            this.concurrentTasks.delete(task.id);
        }
    }
}

export const taskExecutor = new TaskExecutor();

import { TaskGraph, BaseTask } from './task-graph';
import { TaskExecutor } from './executor';
import { AgentContext } from '../types/local-contracts';
import { logger } from '@packages/observability';

/**
 * SpeculativeExecutor - Orchestrates multi-agent competition.
 * 
 * Instead of running one agent, it runs N agents in parallel for the same task,
 * then selects the "winner" based on performance, build success, or ranking agent scores.
 */

export class SpeculativeExecutor {
    /**
     * Spawns multiple versions of a task and executes them in parallel.
     * The first one to pass strictly defined validation "wins".
     */
    async executeCompetitive(
        taskTemplate: Partial<BaseTask>,
        variants: number,
        globalContext: AgentContext
    ): Promise<Record<string, unknown>> {
        const executionId = globalContext.executionId || (globalContext.getExecutionId ? globalContext.getExecutionId() : 'unknown');
        logger.info({ executionId, variants }, '[SpeculativeExecutor] Launching competitive branches...');

        const branches: TaskGraph[] = [];
        const taskPromises: Promise<unknown>[] = [];
        const executor = new TaskExecutor(); // Execution-scoped executor

        for (let i = 0; i < variants; i++) {
            const branchId = `branch-${i}`;
            const graph = new TaskGraph([{
                ...taskTemplate,
                id: `${taskTemplate.id}-${branchId}`,
                branchId,
                title: `${taskTemplate.title} (Variant ${i})`,
                status: 'pending'
            } as unknown as BaseTask]);

            branches.push(graph);
            taskPromises.push(executor.evaluateGraph(graph, globalContext));
        }

        // Wait for all branches to attempt completion
        await Promise.allSettled(taskPromises);

        // Selection Logic: Pick the first successful variant
        const winner = branches.find(g => g.isCompleted());
        
        if (winner) {
            const winnerTask = winner.getAllTasks()[0];
            logger.info({ branchId: winnerTask.branchId }, '[SpeculativeExecutor] Winning branch selected.');
            return winnerTask.result || {};
        }

        throw new Error('All speculative branches failed to converge.');
    }
}





import { TaskGraph, BaseTask } from './task-graph';
import { taskExecutor } from './executor';
import { AgentContext } from '@packages/contractsagent-context';
import { logger } from '@packages/utils/server';

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
        const executionId = globalContext.getExecutionId();
        logger.info({ executionId, variants }, '[SpeculativeExecutor] Launching competitive branches...');

        const branches: TaskGraph[] = [];
        const taskPromises: Promise<unknown>[] = [];

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
            taskPromises.push(taskExecutor.evaluateGraph(graph, globalContext));
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

export const speculativeExecutor = new SpeculativeExecutor();

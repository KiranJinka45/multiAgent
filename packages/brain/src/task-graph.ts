import { Task, DeploymentPlan } from './planner';
import logger from '@packages/utils';

export class TaskGraph {
    static resolveExecutionOrder(plan: DeploymentPlan): Task[][] {
        logger.info({ taskCount: plan.tasks.length }, '[TaskGraph] Resolving execution order');
        
        const tasks = [...plan.tasks];
        const executionGroups: Task[][] = [];
        const completedTaskIds = new Set<string>();

        while (tasks.length > 0) {
            const currentGroup = tasks.filter(task => 
                task.dependencies.every(depId => completedTaskIds.has(depId))
            );

            if (currentGroup.length === 0) {
                logger.error({ tasks }, '[TaskGraph] Circular dependency detected or missing dependency');
                throw new Error('Invalid Task Graph: Circular dependency or missing task');
            }

            executionGroups.push(currentGroup);
            currentGroup.forEach(t => {
                completedTaskIds.add(t.id);
                const idx = tasks.indexOf(t);
                tasks.splice(idx, 1);
            });
        }

        return executionGroups;
    }
}

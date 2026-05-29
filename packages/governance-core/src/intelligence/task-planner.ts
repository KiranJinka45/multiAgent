import type { CommandExecutionProposal } from '../filters/command-filter.js';

export interface TaskPlan {
    objective: string;
    steps: CommandExecutionProposal[];
}

export class DecompositionPlanner {
    /**
     * Statically decomposes an objective into a linear sequence of proposals.
     */
    static createPlan(objective: string, tenantId: string): TaskPlan {
        console.log(`[TASK_PLANNER] Decomposing objective: ${objective}`);
        
        const plan = {
            objective,
            steps: [
                {
                    id: 'step-1',
                    toolName: 'read-file',
                    tenantId: tenantId,
                    payload: JSON.stringify({ path: '/var/lib/ztan/config.json' }),
                    dependencies: []
                },
                {
                    id: 'step-2',
                    toolName: 'write-file',
                    tenantId: tenantId,
                    payload: JSON.stringify({ path: '/var/lib/ztan/output.txt', content: 'processed' }),
                    dependencies: ['step-1']
                }
            ]
        };

        // Always validate the generated plan for cycles before returning
        this.validatePlan(plan);

        return plan;
    }

    /**
     * Depth-First Search validation on the task steps to reject cyclic dependency structures.
     */
    static validatePlan(plan: TaskPlan): void {
        if (this.hasCycle(plan.steps)) {
            throw new Error("CYCLIC_DEPENDENCY_DETECTED: Infinite loop detected in task plan dependencies.");
        }
    }

    private static hasCycle(steps: CommandExecutionProposal[]): boolean {
        const adj = new Map<string, string[]>();
        for (const step of steps) {
            if (step.id) {
                adj.set(step.id, step.dependencies || []);
            }
        }

        const visited = new Set<string>();
        const recStack = new Set<string>();

        const dfs = (node: string): boolean => {
            if (recStack.has(node)) {
                return true; // Cycle detected
            }
            if (visited.has(node)) {
                return false;
            }

            visited.add(node);
            recStack.add(node);

            const neighbors = adj.get(node) || [];
            for (const neighbor of neighbors) {
                if (dfs(neighbor)) {
                    return true;
                }
            }

            recStack.delete(node);
            return false;
        };

        for (const step of steps) {
            if (step.id && !visited.has(step.id)) {
                if (dfs(step.id)) {
                    return true;
                }
            }
        }

        return false;
    }
}

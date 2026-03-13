export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'retrying';

export interface BaseTask {
    id: string;
    type: string;
    title: string;
    description?: string;
    dependsOn?: string[]; // IDs of tasks that must complete before this runs
    inputs?: string[];    // Expected input keys from the global context or parent tasks
    outputs?: string[];   // Output keys this task will populate upon completion
    payload?: Record<string, unknown>;
    status?: TaskStatus;
    result?: Record<string, unknown>;         // Final artifact or data produced by the task
    branchId?: string;                        // Optional identifier for speculative branches
    isWinner?: boolean;                       // Flag for speculative result selection
}

export class TaskGraph {
    public tasks: Map<string, BaseTask> = new Map();

    /**
     * Parse an array of generic tasks and load them into a traversable graph.
     */
    constructor(taskList: BaseTask[] = []) {
        for (const task of taskList) {
            this.tasks.set(task.id, {
                ...task,
                status: task.status || 'pending',
                dependsOn: task.dependsOn || []
            });
        }
    }

    addTask(task: BaseTask) {
        this.tasks.set(task.id, {
            ...task,
            status: task.status || 'pending',
            dependsOn: task.dependsOn || []
        });
    }

    getTask(id: string): BaseTask | undefined {
        return this.tasks.get(id);
    }

    getAllTasks(): BaseTask[] {
        return Array.from(this.tasks.values());
    }

    /**
     * Checks if all dependencies for a given task are marked as completed.
     */
    areDependenciesMet(taskId: string): boolean {
        const task = this.getTask(taskId);
        if (!task || !task.dependsOn || task.dependsOn.length === 0) return true;

        for (const depId of task.dependsOn) {
            const depTask = this.getTask(depId);
            if (!depTask || depTask.status !== 'completed') {
                return false;
            }
        }
        return true;
    }

    /**
     * Return all pending tasks whose dependencies are fully met and are ready to run.
     */
    getReadyTasks(): BaseTask[] {
        return this.getAllTasks().filter(t => t.status === 'pending' && this.areDependenciesMet(t.id));
    }

    /**
     * Mark a task as completed and update its internal result.
     */
    completeTask(id: string, result: Record<string, unknown>) {
        const task = this.getTask(id);
        if (task) {
            task.status = 'completed';
            task.result = result;
        }
    }

    /**
     * Mark a task as failed.
     */
    failTask(id: string, error: string) {
        const task = this.getTask(id);
        if (task) {
            task.status = 'failed';
            task.payload = { ...task.payload, error };
        }
    }

    /**
     * Check if the entire graph is completed successfully.
     */
    isCompleted(): boolean {
        return this.getAllTasks().every(t => t.status === 'completed');
    }

    /**
     * Check if any task in the graph has failed.
     */
    hasFailed(): boolean {
        return this.getAllTasks().some(t => t.status === 'failed');
    }

    /**
     * Mark a specific task as the winner of a speculative competition.
     * All other tasks in the same competitive set (parallel siblings) will be ignored.
     */
    setWinner(taskId: string) {
        const task = this.getTask(taskId);
        if (task) {
            task.isWinner = true;
            // Optionally mark siblings as 'skipped' or 'obsolete'
        }
    }
}

export type TaskStatus = 'waiting' | 'ready' | 'running' | 'completed' | 'failed' | 'aborted';

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
    startTime?: number;                       // When task entered 'running' state
    lastUpdate?: number;                      // For heartbeat tracking
    retryCount?: number;                      // Number of times task was restarted
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
                status: task.status || 'waiting',
                dependsOn: task.dependsOn || []
            });
        }
    }

    addTask(task: BaseTask) {
        this.tasks.set(task.id, {
            ...task,
            status: task.status || 'waiting',
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
     * Return all nodes that are WAITING but have all dependencies MET.
     * Moves them internally to READY.
     */
    getReadyTasks(): BaseTask[] {
        const ready = this.getAllTasks().filter(t => 
            t.status === 'waiting' && this.areDependenciesMet(t.id)
        );
        for (const task of ready) {
            task.status = 'ready';
        }
        return ready;
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
     * Mark a task as failed. Retries are handled by the Executor or Watchdog.
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
     * Check if any task in the graph has reached a terminal failure state (aborted).
     */
    hasFailed(): boolean {
        return this.getAllTasks().some(t => t.status === 'aborted');
    }

    /**
     * Checks if any running task has exceeded its timeout.
     */
    isStuck(taskId: string, timeoutMs: number): boolean {
        const task = this.getTask(taskId);
        if (!task || task.status !== 'running' || !task.startTime) return false;
        
        const lastActivity = task.lastUpdate || task.startTime;
        return (Date.now() - lastActivity) > timeoutMs;
    }

    /**
     * Resets a task to waiting, incrementing retry count.
     */
    resetTask(id: string) {
        const task = this.getTask(id);
        if (task) {
            task.status = 'waiting';
            task.retryCount = (task.retryCount || 0) + 1;
            task.startTime = undefined;
            task.lastUpdate = undefined;
        }
    }

    /**
     * Aborts a task after persistent failures.
     */
    abortTask(id: string) {
        const task = this.getTask(id);
        if (task) {
            task.status = 'aborted';
        }
    }
    /**
     * Detects if the graph contains any circular dependencies using DFS.
     * Returns an array of task IDs forming the first detected cycle, or null.
     */
    detectCycle(): string[] | null {
        const visited = new Set<string>();
        const stack = new Set<string>();
        const path: string[] = [];

        const findCycle = (id: string): string[] | null => {
            if (stack.has(id)) {
                const cycleStartIndex = path.indexOf(id);
                return path.slice(cycleStartIndex);
            }
            if (visited.has(id)) return null;

            visited.add(id);
            stack.add(id);
            path.push(id);

            const task = this.getTask(id);
            if (task?.dependsOn) {
                for (const depId of task.dependsOn) {
                    const cycle = findCycle(depId);
                    if (cycle) return cycle;
                }
            }

            path.pop();
            stack.delete(id);
            return null;
        };

        for (const taskId of this.tasks.keys()) {
            const cycle = findCycle(taskId);
            if (cycle) return cycle;
        }

        return null;
    }
}

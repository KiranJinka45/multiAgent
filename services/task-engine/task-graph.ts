export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'retrying';

export interface BaseTask {
    id: string;
    type: string;
    title: string;
    description?: string;
    dependsOn?: string[]; // IDs of tasks that must complete before this runs
    payload?: any;
    status?: TaskStatus;
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
}

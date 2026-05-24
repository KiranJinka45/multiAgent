export interface ScheduledTask {
    taskId: string;
    name: string;
    execute: () => Promise<any>;
    logicalTimestamp: number;
}

export class DeterministicScheduler {
    private queue: ScheduledTask[] = [];
    private logicalTime = 0;
    private executionHistory: string[] = [];
    private isReplayMode = false;
    private replayInterleaves: string[] = [];

    constructor(isReplayMode = false) {
        this.isReplayMode = isReplayMode;
    }

    /**
     * Enqueues a task to the virtual scheduler.
     */
    public schedule(name: string, task: () => Promise<any>): string {
        const taskId = `task-${this.queue.length + 1}`;
        this.queue.push({
            taskId,
            name,
            execute: task,
            logicalTimestamp: this.logicalTime++
        });
        return taskId;
    }

    /**
     * Runs the virtual scheduler sequentially. 
     * In replay mode, it resolves tasks in the exact historical order captured.
     */
    public async flush(limit = Infinity): Promise<any[]> {
        const outcomes: any[] = [];
        
        if (this.isReplayMode) {
            // Filter queue to ONLY contain tasks that were recorded in the replay interleaves
            const expectedIds = new Set(this.replayInterleaves);
            this.queue = this.queue.filter(t => expectedIds.has(t.taskId));

            // Sort queue based on historical interleave records
            const orderMap = new Map<string, number>();
            this.replayInterleaves.forEach((id, idx) => orderMap.set(id, idx));
            
            this.queue.sort((a, b) => {
                const idxA = orderMap.get(a.taskId)!;
                const idxB = orderMap.get(b.taskId)!;
                return idxA - idxB;
            });
        }

        let count = 0;
        // Run queue sequentially under controlled microtasks
        while (this.queue.length > 0 && count < limit) {
            const task = this.queue.shift()!;
            this.executionHistory.push(task.taskId);
            count++;
            
            try {
                const res = await task.execute();
                outcomes.push({ taskId: task.taskId, name: task.name, status: 'resolved', result: res });
            } catch (err: any) {
                outcomes.push({ taskId: task.taskId, name: task.name, status: 'rejected', error: err.message });
            }
        }

        return outcomes;
    }

    public getExecutionHistory(): string[] {
        return [...this.executionHistory];
    }

    public loadReplayInterleaves(history: string[]): void {
        this.replayInterleaves = [...history];
    }
}

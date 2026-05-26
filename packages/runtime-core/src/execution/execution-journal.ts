import { TaskState } from './task-lifecycle-engine.js';

export interface JournalEntry {
    taskId: string;
    stepIndex: number;
    state: TaskState;
    payloadHash: string;
    timestamp: number;
}

export class ExecutionJournal {
    protected journal: JournalEntry[] = [];

    /**
     * Appends a transition entry sequentially to the WAL journal.
     */
    public appendEntry(taskId: string, stepIndex: number, state: TaskState, payload: any): JournalEntry {
        const payloadHash = this.computeHash(payload);
        const entry: JournalEntry = {
            taskId,
            stepIndex,
            state,
            payloadHash,
            timestamp: Date.now()
        };
        this.journal.push(entry);
        return entry;
    }

    /**
     * Gets all journal entries for a given task.
     */
    public getJournalForTask(taskId: string): JournalEntry[] {
        return this.journal.filter(entry => entry.taskId === taskId);
    }

    /**
     * Reconstructs the task state from the journal to restore crash continuity.
     */
    public reconstructTaskState(taskId: string): { lastStepIndex: number; lastState: TaskState | null } {
        const taskEntries = this.getJournalForTask(taskId).sort((a, b) => a.stepIndex - b.stepIndex);
        if (taskEntries.length === 0) {
            return { lastStepIndex: -1, lastState: null };
        }
        const lastEntry = taskEntries[taskEntries.length - 1];
        return {
            lastStepIndex: lastEntry.stepIndex,
            lastState: lastEntry.state
        };
    }

    /**
     * Simple payload hashing for integrity mapping.
     */
    private computeHash(payload: any): string {
        const str = JSON.stringify(payload || {});
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0;
        }
        return `hash-${Math.abs(hash)}`;
    }
}

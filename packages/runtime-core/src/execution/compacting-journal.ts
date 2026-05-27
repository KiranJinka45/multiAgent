import { ExecutionJournal, JournalEntry } from './execution-journal.js';
import { TaskState } from './task-lifecycle-engine.js';

export interface CheckpointEntry {
    taskId: string;
    stepIndex: number;
    state: TaskState;
    consolidatedStatePayload: any;
    timestamp: number;
}

export class CompactedExecutionJournal extends ExecutionJournal {
    private checkpoints = new Map<string, CheckpointEntry>();

    /**
     * Captures a consolidated state checkpoint snapshot for a specific task.
     */
    public checkpointSnapshot(
        taskId: string,
        stepIndex: number,
        state: TaskState,
        consolidatedStatePayload: any
    ): CheckpointEntry {
        const checkpoint: CheckpointEntry = {
            taskId,
            stepIndex,
            state,
            consolidatedStatePayload: JSON.parse(JSON.stringify(consolidatedStatePayload)), // Deep copy
            timestamp: Date.now()
        };

        this.checkpoints.set(taskId, checkpoint);

        // Also append a checkpoint marker entry to the standard WAL journal
        this.appendEntry(taskId, stepIndex, state, {
            isCheckpoint: true,
            checkpointStepIndex: stepIndex
        });

        return checkpoint;
    }

    /**
     * Gets the latest active checkpoint for a task.
     */
    public getCheckpoint(taskId: string): CheckpointEntry | undefined {
        return this.checkpoints.get(taskId);
    }

    /**
     * Prunes detailed historical intermediate journal entries older than the latest checkpoint
     * to mitigate WAL storage space amplification.
     */
    public compactJournal(taskId: string): { prunedCount: number } {
        const checkpoint = this.checkpoints.get(taskId);
        if (!checkpoint) {
            return { prunedCount: 0 };
        }

        const checkpointStepIndex = checkpoint.stepIndex;
        const initialCount = this.journal.length;

        // Keep all entries that do not belong to the target task,
        // or target task entries that are at or after the checkpoint step index.
        this.journal = this.journal.filter(entry => {
            if (entry.taskId !== taskId) {
                return true;
            }
            return entry.stepIndex >= checkpointStepIndex;
        });

        const finalCount = this.journal.length;
        return { prunedCount: initialCount - finalCount };
    }

    /**
     * Reconstructs the task state and baseline payload, taking active checkpoints into account.
     */
    public reconstructTaskStateWithCompaction(taskId: string): {
        lastStepIndex: number;
        lastState: TaskState | null;
        baselineState: any;
    } {
        const checkpoint = this.checkpoints.get(taskId);
        
        if (!checkpoint) {
            // No checkpoint exists: fallback to standard journal reconstruction
            const standardReconstruction = this.reconstructTaskState(taskId);
            return {
                lastStepIndex: standardReconstruction.lastStepIndex,
                lastState: standardReconstruction.lastState,
                baselineState: null
            };
        }

        // Get post-checkpoint journal entries
        const postCheckpointEntries = this.journal
            .filter(entry => entry.taskId === taskId && entry.stepIndex > checkpoint.stepIndex)
            .sort((a, b) => a.stepIndex - b.stepIndex);

        if (postCheckpointEntries.length === 0) {
            return {
                lastStepIndex: checkpoint.stepIndex,
                lastState: checkpoint.state,
                baselineState: checkpoint.consolidatedStatePayload
            };
        }

        const lastEntry = postCheckpointEntries[postCheckpointEntries.length - 1];
        return {
            lastStepIndex: lastEntry.stepIndex,
            lastState: lastEntry.state,
            baselineState: checkpoint.consolidatedStatePayload
        };
    }
}

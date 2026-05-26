export type TaskState = 'INIT' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'ROLLING_BACK' | 'ROLLED_BACK';

export interface TaskStateTransitionReport {
    taskId: string;
    fromState: TaskState;
    toState: TaskState;
    timestamp: number;
    success: boolean;
    error?: string;
}

export class TaskLifecycleEngine {
    private validTransitions: Record<TaskState, TaskState[]> = {
        'INIT': ['RUNNING', 'FAILED'],
        'RUNNING': ['SUCCESS', 'FAILED'],
        'SUCCESS': [],
        'FAILED': ['ROLLING_BACK'],
        'ROLLING_BACK': ['ROLLED_BACK', 'FAILED'],
        'ROLLED_BACK': []
    };

    /**
     * Validates and performs state transitions for execution tasks.
     */
    public transitionState(
        taskId: string,
        currentState: TaskState,
        targetState: TaskState
    ): TaskStateTransitionReport {
        const allowed = this.validTransitions[currentState] || [];
        if (!allowed.includes(targetState)) {
            const errMsg = `Invalid task state transition from ${currentState} to ${targetState} for task ${taskId}`;
            return {
                taskId,
                fromState: currentState,
                toState: currentState,
                timestamp: Date.now(),
                success: false,
                error: errMsg
            };
        }

        return {
            taskId,
            fromState: currentState,
            toState: targetState,
            timestamp: Date.now(),
            success: true
        };
    }
}

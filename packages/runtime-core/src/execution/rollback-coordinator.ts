export interface ExecutionStep {
    actionType: string;
    payload: any;
}

export interface RollbackAction {
    inverseActionType: string;
    payload: any;
}

export interface RollbackReport {
    success: boolean;
    executedReversals: RollbackAction[];
    failedReversals: Array<{ action: RollbackAction; error: string }>;
    timestamp: number;
}

export class RollbackCoordinator {
    /**
     * Map forward actions to their inverse operations.
     */
    public getInverseAction(step: ExecutionStep): RollbackAction | null {
        switch (step.actionType) {
            case 'CREATE_FILE':
                return {
                    inverseActionType: 'DELETE_FILE',
                    payload: { filePath: step.payload.filePath }
                };
            case 'WRITE_DATABASE':
                return {
                    inverseActionType: 'DELETE_DATABASE_RECORD',
                    payload: { table: step.payload.table, recordId: step.payload.recordId }
                };
            case 'ACQUIRE_LEASE':
                return {
                    inverseActionType: 'RELEASE_LEASE',
                    payload: { leaseId: step.payload.leaseId }
                };
            default:
                return null;
        }
    }

    /**
     * Executes safe sequential rollback of completed steps.
     * Rollbacks run in reverse order (LIFO).
     */
    public async executeRollback(
        completedSteps: ExecutionStep[],
        rollbackExecutor: (action: RollbackAction) => Promise<void>
    ): Promise<RollbackReport> {
        const executedReversals: RollbackAction[] = [];
        const failedReversals: Array<{ action: RollbackAction; error: string }> = [];

        // Reverse step order for LIFO rollback
        const stepsToReverse = [...completedSteps].reverse();

        for (const step of stepsToReverse) {
            const inverse = this.getInverseAction(step);
            if (!inverse) {
                // If action cannot be reversed, record failure
                failedReversals.push({
                    action: { inverseActionType: `UNRESOLVED_INVERSE:${step.actionType}`, payload: step.payload },
                    error: `No inverse action defined for action type "${step.actionType}"`
                });
                continue;
            }

            try {
                await rollbackExecutor(inverse);
                executedReversals.push(inverse);
            } catch (err: any) {
                failedReversals.push({
                    action: inverse,
                    error: err.message || 'Unknown rollback failure'
                });
            }
        }

        return {
            success: failedReversals.length === 0,
            executedReversals,
            failedReversals,
            timestamp: Date.now()
        };
    }
}

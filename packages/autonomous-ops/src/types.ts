/**
 * Nexus ZTAN Safe Autonomous Operations Types
 * (v2026.LTS.1)
 */

export type ActionType = 
    | 'RESTART' 
    | 'ROLLBACK' 
    | 'DRIFT_REPAIR' 
    | 'REBALANCE' 
    | 'ROTATE'
    | 'K8S_ROLLOUT'
    | 'INFRA_APPLY'
    | 'RECONCILE';

export interface AutonomousActionManifest {
    actionId: string;
    type: ActionType;
    targetId: string;
    reason: string;
    metadata: {
        image?: string;
        previousImage?: string;
        workingDir?: string;
        vars?: Record<string, string>;
        spec?: any;
        autoRollback?: boolean;
    };
    blastRadius: {
        score: number;
        affectedNodes: string[];
    };
    rollbackPlan: {
        method: 'SNAPSHOT_REVERT' | 'CONFIG_REAPPLY' | 'UNDO_RESTART' | 'AUTO' | 'STATE_REVERT';
        preCheckId: string;
    };
    approvalStatus: 'PENDING' | 'APPROVED' | 'AUTO_APPROVED' | 'REJECTED';
    executionStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
}

export interface ActionSafetyReport {
    actionId: string;
    safeToExecute: boolean;
    reasoning: string;
    requiredApproverTier: 1 | 2 | 3;
}

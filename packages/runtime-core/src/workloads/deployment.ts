import { IMissionEvent } from '../contracts';

/**
 * 📦 Traceable Deployment Controller (TDC)
 * The first "Boring but Useful" ZTAN workload.
 * Handles deterministic deployment steps with full forensic continuity.
 */

export interface IDeploymentManifest {
    id: string;
    targetEnvironment: 'staging' | 'production';
    steps: IDeploymentStep[];
    rollbackPolicy: 'auto' | 'manual';
}

export interface IDeploymentStep {
    name: string;
    action: 'copy' | 'shell' | 'restart' | 'health-check';
    params: Record<string, any>;
    critical: boolean;
}

export interface IDeploymentResult {
    deploymentId: string;
    status: 'SUCCESS' | 'FAILED' | 'ROLLED_BACK';
    startTime: string;
    endTime: string;
    traceId: string;
    stepsExecuted: number;
}

/**
 * 📊 Operational Truth Metrics (OTM)
 * Measured after every TDC execution.
 */
export interface IOperationalTruthMetrics {
    successRate: number;
    replayDeterminismRate: number;
    recoveryTimeMs: number;
    traceOverheadBytes: number;
    restartContinuity: boolean;
    rollbackSuccess: boolean;
}

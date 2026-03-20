/**
 * shared/types/pipeline-types.ts
 * 
 * Deterministic Pipeline Stages for MultiAgent Production.
 */

export enum JobStage {
    PLAN = 'PLAN',
    PLANNING = 'PLANNING',
    GENERATE_CODE = 'GENERATE_CODE',
    SECURITY = 'SECURITY',
    MONETIZATION = 'MONETIZATION',
    DEPLOYMENT = 'DEPLOYMENT',
    MONITORING = 'MONITORING',
    BUILD = 'BUILD',
    TEST = 'TEST',
    WRITE_ARTIFACTS = 'WRITE_ARTIFACTS',
    VALIDATE_ARTIFACTS = 'VALIDATE_ARTIFACTS',
    START_PREVIEW = 'START_PREVIEW',
    HEALTH_CHECK = 'HEALTH_CHECK',
    REGISTER_PREVIEW = 'REGISTER_PREVIEW',
    COMPLETE = 'COMPLETE',
    FAILED = 'FAILED'
}

export type PipelineStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface PipelineState {
    stage: JobStage;
    status: PipelineStatus;
    message: string;
    progress: number;
    updatedAt: number;
}

/**
 * Build State — Central stage tracking and state mapping.
 */

export const STAGE_ORDER = [
    'initializing',
    'planner',
    'backend',
    'frontend',
    'testing',
    'dockerization',
    'cicd',
    'deployment'
] as const;

export type BuildStage = typeof STAGE_ORDER[number];

export const BUILD_STAGE_PROGRESS: Record<BuildStage, number> = {
    initializing: 5,
    planner: 15,
    backend: 35,
    frontend: 55,
    testing: 70,
    dockerization: 80,
    cicd: 90,
    deployment: 100
};

export interface StageState {
    id: BuildStage;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    message: string;
    progressPercent: number;
}


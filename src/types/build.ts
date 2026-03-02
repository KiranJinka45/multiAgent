export type BuildStageStatus = "pending" | "in_progress" | "completed" | "failed";

export interface BuildStage {
    id: string;
    stageIndex: number;
    name: string;
    status: BuildStageStatus;
    message: string;
    progressPercent: number; // Progress within the specific stage (0-100)
    weight: number; // Contribution to total progress (e.g., 0.15 for 15%)
    timestamp: string; // ISO Date
    startedAt?: string;
    completedAt?: string;
}

export interface BuildUpdate {
    executionId: string;
    totalProgress: number; // Aggregate weighted progress (0-100)
    currentStageIndex: number; // Strict mapping index for UI mapping
    currentStage: string;
    stages: BuildStage[];
    status: "executing" | "completed" | "failed";
    tokensUsed?: number;
    durationMs?: number;
    message?: string;
    timestamp?: string;
    previewUrl?: string; // Populated on build completion
    previewPort?: number; // Internal port the sandbox is running on
}

export const BUILD_STAGES_CONFIG: Omit<BuildStage, 'status' | 'message' | 'progressPercent' | 'timestamp' | 'startedAt' | 'completedAt'>[] = [
    { id: 'initializing', stageIndex: 0, name: 'Initializing Project Core', weight: 0.05 },
    { id: 'database', stageIndex: 1, name: 'Architecting Database Schema', weight: 0.15 },
    { id: 'backend', stageIndex: 2, name: 'Generating Backend API layer', weight: 0.15 },
    { id: 'frontend', stageIndex: 3, name: 'Building Frontend UI & Layout', weight: 0.20 },
    { id: 'testing', stageIndex: 4, name: 'Executing Unit & Integration Tests', weight: 0.10 },
    { id: 'dockerization', stageIndex: 5, name: 'Dockerizing Application Environment', weight: 0.10 },
    { id: 'cicd', stageIndex: 6, name: 'Configuring CI/CD Pipelines', weight: 0.10 },
    { id: 'deployment', stageIndex: 7, name: 'Deploying to Staging Sandbox', weight: 0.10 },
    { id: 'finalization', stageIndex: 8, name: 'Finalizing Deployment', weight: 0.05 },
];

export const STAGE_PROGRESS: Record<string, number> = {
    initializing: 5,
    database: 15,
    backend: 35,
    frontend: 55,
    testing: 75,
    dockerization: 80,
    cicd: 85,
    deployment: 95,
    finalization: 100
};

export const STAGE_ORDER = [
    'initializing',
    'database',
    'backend',
    'frontend',
    'testing',
    'dockerization',
    'cicd',
    'deployment',
    'finalization'
];

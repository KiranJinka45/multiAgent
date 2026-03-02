export type BuildStageStatus = "pending" | "in_progress" | "completed" | "failed";

export interface BuildStage {
    id: string;
    name: string;
    status: BuildStageStatus;
    message: string;
    progressPercent: number; // Progress within the specific stage (0-100)
    weight: number; // Contribution to total progress (e.g., 0.15 for 15%)
    timestamp: string; // ISO Date
}

export interface BuildUpdate {
    executionId: string;
    totalProgress: number; // Aggregate weighted progress (0-100)
    currentStage: string;
    stages: BuildStage[];
    status: "executing" | "completed" | "failed";
    tokensUsed?: number;
    durationMs?: number;
    message?: string;
    timestamp: string;
}

export const BUILD_STAGES_CONFIG: Omit<BuildStage, 'status' | 'message' | 'progressPercent' | 'timestamp'>[] = [
    { id: 'initializing', name: 'Initializing', weight: 0.05 },
    { id: 'database', name: 'Database Schema', weight: 0.10 },
    { id: 'backend', name: 'Backend API', weight: 0.20 },
    { id: 'frontend', name: 'Frontend App', weight: 0.20 },
    { id: 'security', name: 'Security Policies', weight: 0.05 },
    { id: 'testing', name: 'Testing', weight: 0.15 },
    { id: 'dockerization', name: 'Dockerization', weight: 0.05 },
    { id: 'cicd', name: 'CI/CD Setup', weight: 0.05 },
    { id: 'deployment', name: 'Deployment', weight: 0.10 },
    { id: 'finalization', name: 'Finalization', weight: 0.05 },
];

export const STAGE_PROGRESS: Record<string, number> = {
    initializing: 5,
    database: 15,
    backend: 35,
    frontend: 55,
    security: 60,
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
    'security',
    'testing',
    'dockerization',
    'cicd',
    'deployment',
    'finalization'
];

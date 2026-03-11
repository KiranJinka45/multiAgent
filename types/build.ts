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

export interface FileDiff {
    path: string;
    oldContent: string;
    newContent: string;
    type: 'create' | 'modify' | 'delete';
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
    isPreviewReady?: boolean; // Flag for early preview access
    isBackgroundBuilding?: boolean; // Flag for background deployment
    metadata?: {
        diffs?: FileDiff[];
        executionId?: string;
        previewUrl?: string;
        taskCount?: number;
        autonomousCycles?: number;
        fastPath?: boolean;
    };
}

export const BUILD_STAGES_CONFIG: Omit<BuildStage, 'status' | 'message' | 'progressPercent' | 'timestamp' | 'startedAt' | 'completedAt'>[] = [
    { id: 'meta', stageIndex: 0, name: 'Meta-Agent Analysis', weight: 0.10 },
    { id: 'planner', stageIndex: 1, name: 'AI Architecture Planning', weight: 0.15 },
    { id: 'database', stageIndex: 2, name: 'Database Schema Generation', weight: 0.15 },
    { id: 'backend', stageIndex: 3, name: 'Backend API Generation', weight: 0.15 },
    { id: 'frontend', stageIndex: 4, name: 'Frontend UI Construction', weight: 0.20 },
    { id: 'docker', stageIndex: 5, name: 'Docker Environment Setup', weight: 0.10 },
    { id: 'deployment', stageIndex: 6, name: 'Live Deployment', weight: 0.15 },
];

export const STAGE_PROGRESS: Record<string, number> = {
    meta: 10,
    planner: 25,
    database: 40,
    backend: 55,
    frontend: 75,
    docker: 85,
    deployment: 100,
};

export const STAGE_ORDER = [
    'meta',
    'planner',
    'database',
    'backend',
    'frontend',
    'docker',
    'deployment'
];

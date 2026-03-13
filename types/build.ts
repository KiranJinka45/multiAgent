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
    status: "queued" | "executing" | "completed" | "failed" | "repairing";
    type?: string; // Realtime event classification
    files?: { path: string; content?: string }[]; // Optional snapshot of project files
    queuePosition?: number;
    tokensUsed?: number;
    durationMs?: number;
    message?: string;
    timestamp?: string;
    previewUrl?: string; // Populated on build completion
    previewPort?: number; // Internal port the sandbox is running on
    isPreviewReady?: boolean; // Flag for early preview access
    isBackgroundBuilding?: boolean; // Flag for background deployment
    agent?: string; // Granular agent identification
    action?: string; // Granular action identification
    costUsd?: number;
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
    { id: 'planning', stageIndex: 0, name: 'AI Architecting & Planning', weight: 0.15 },
    { id: 'generating', stageIndex: 1, name: 'Code Generation', weight: 0.40 },
    { id: 'patching', stageIndex: 2, name: 'Reliability Guardrails', weight: 0.20 },
    { id: 'building', stageIndex: 3, name: 'Build & Compilation', weight: 0.20 },
    { id: 'deployment', stageIndex: 4, name: 'Runtime Infrastructure', weight: 0.05 },
];

export const STAGE_PROGRESS: Record<string, number> = {
    planning: 15,
    generating: 40,
    patching: 60,
    building: 80,
    deployment: 95,
};

export const STAGE_ORDER = [
    'planning',
    'generating',
    'patching',
    'building',
    'deployment'
];

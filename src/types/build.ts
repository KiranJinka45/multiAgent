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
}

export const BUILD_STAGES_CONFIG: Omit<BuildStage, 'status' | 'message' | 'progressPercent' | 'timestamp'>[] = [
    { id: 'initializing', name: 'Initializing Project', weight: 0.05 },
    { id: 'database', name: 'Designing Database Schema', weight: 0.15 },
    { id: 'auth', name: 'Configuring Authentication', weight: 0.10 },
    { id: 'security', name: 'Applying Security Policies (RLS)', weight: 0.05 },
    { id: 'backend', name: 'Generating Backend API', weight: 0.20 },
    { id: 'frontend_layout', name: 'Generating Frontend Layout', weight: 0.10 },
    { id: 'landing_page', name: 'Building Landing Page', weight: 0.10 },
    { id: 'auth_pages', name: 'Building Auth Pages', weight: 0.05 },
    { id: 'dashboard', name: 'Building Dashboards', weight: 0.10 },
    { id: 'finalizing', name: 'Finalizing Build', weight: 0.10 },
];

import type { AgentContext } from './agent-context';
export type { AgentContext };

export type AgentRequest<P = any> = {
    prompt: string;
    context: AgentContext;
    tenantId: string;
    taskType: 'code-gen' | 'debug' | 'refactor' | 'planning' | 'security-scan' | 'validation' | 'testing';
    params: P;
};

export type AgentData = 
    | { type: 'plan'; plan: BrainPlan }
    | { type: 'code'; files: JobArtifact[] }
    | { type: 'analysis'; findings: string[]; score: number }
    | { type: 'validation'; isValid: boolean; errors: string[] }
    | Record<string, unknown>;

export interface AgentResponse<T = AgentData> {
    success: boolean;
    data: T;
    artifacts: JobArtifact[];
    metrics: {
        durationMs: number;
        tokensTotal: number;
    };
    confidence?: number;
    error?: string;
}

export interface PlannerParams {
    mode: 'comprehensive' | 'incremental';
}

export interface SecurityParams {
    authProvider: string;
    roles: string[];
    artifacts: JobArtifact[];
}

export interface FrontendParams {
    plan: BrainPlan;
    backendFiles?: JobArtifact[];
    isIncremental?: boolean;
    affectedFiles?: string[];
    isPatch?: boolean;
    section?: string;
}

export interface BackendParams {
    plan: BrainPlan;
    schema?: string;
    isIncremental?: boolean;
    affectedFiles?: string[];
}

export interface DatabaseParams {
    plan: BrainPlan;
    isIncremental?: boolean;
    affectedFiles?: string[];
}

export interface DebugParams {
    errors: string;
    artifacts: JobArtifact[];
    stdout?: string;
    failureHistory?: string[];
}

export interface CriticParams {
    task: string;
    output: unknown;
    artifacts: JobArtifact[];
    requirements?: string;
}

export interface ValidationParams {
    agentName: string;
    output: unknown;
    spec: string;
}

export interface CoderParams {
    instructions: string;
    fileTargets: string[];
}

export interface EditParams {
    editRequest: string;
    projectContext: string;
    currentFiles: { path: string; content: string }[];
    techStack: { framework: string; styling: string; backend: string; database: string };
}

export interface CustomizerParams {
    prompt: string;
    templateId: string;
    files: { path: string; content: string }[];
    branding: any;
    features: string[];
}

export interface MetaParams {
    prompt: string;
}

export interface EvolutionParams {
    projectId: string;
    metrics: any[];
    optimizationFocus: 'performance' | 'security' | 'ux';
}

export interface HealingParams {
    projectId: string;
    errorLogs: string;
    lastAction: string;
    filePath?: string;
}

export interface RankingParams {
    variants: Array<{
        branchId: string;
        content: string;
        metrics?: Record<string, number>;
    }>;
    criteria: 'reliability' | 'performance' | 'readability';
}

export interface RepairParams {
    stderr: string;
    stdout: string;
    files: any[];
    command?: string;
}

export interface ResearchParams {
    prompt: string;
}

export interface MonetizationParams {
    prompt: string;
}

export interface SandboxParams {
    projectId: string;
}

export interface IntentParams {
    prompt: string;
}

export interface BrainTask {
    id: string;
    agent: string;
    description: string;
    dependencies: string[];
}

export interface BrainPlan {
    tasks: BrainTask[];
    reasoning: string;
}

export interface JobArtifact {
    path: string;
    content: string;
    type?: string;
}

export interface ValidationResult {
    valid: boolean;
    errors?: string[];
}

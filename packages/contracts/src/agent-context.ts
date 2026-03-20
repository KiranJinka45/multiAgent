export interface AgentContext {
    executionId: string;
    projectId: string;
    userId: string;
    vfs: any;
    history: unknown[];
    metadata: Record<string, unknown>;
    fileCount?: number;
    errorDepth?: number;
    getExecutionId(): string;
    getProjectId(): string;
    getVFS(): any;
    atomicUpdate(updater: (ctx: any) => void): Promise<void>;
    [key: string]: unknown;
}

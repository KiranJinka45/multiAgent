export interface AgentContext {
    executionId: string;
    projectId: string;
    userId: string;
    vfs: unknown;
    history: unknown[];
    metadata: Record<string, unknown>;
    prompt?: string;
    fileCount?: number;
    errorDepth?: number;
    getExecutionId(): string;
    getProjectId(): string;
    getVFS(): unknown;
    get(): Promise<unknown>;
    atomicUpdate(updater: (ctx: unknown) => void): Promise<void>;
    [key: string]: unknown;
}

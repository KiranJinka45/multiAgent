import { VirtualFileSystem } from '@services/vfs';

export interface AgentContext {
    getVFS(): VirtualFileSystem;
    getExecutionId(): string;
    getProjectId(): string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get(): Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    atomicUpdate(updater: (ctx: any) => void): Promise<void>;
    setAgentResult(
        agentName: string,
        result: {
            status: 'in_progress' | 'completed' | 'failed';
            data?: unknown;
            tokens?: number;
            startTime?: string;
            endTime?: string;
        }
    ): Promise<void>;
}

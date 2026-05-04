import { ChildProcess } from 'child_process';
import Bridge from '@packages/utils';

export type ProcessStatus = 'IDLE' | 'STARTING' | 'RUNNING' | 'FAILED' | 'STOPPED';

export interface ManagedProcess {
    pid: number;
    projectId: string;
    status: ProcessStatus;
    startedAt: string;
    cwd: string;
    process: ChildProcess;
}

const { ProcessManager: BridgePM } = Bridge as any;

/**
 * processManager.ts
 *
 * Proxy implementation that delegates to the centralized Bridge.
 * Restored from .d.ts signature to resolve null-byte corruption.
 */
export const ProcessManager = {
    async start(
        projectId: string, 
        cwd: string, 
        command?: string, 
        args?: string[], 
        env?: Partial<NodeJS.ProcessEnv>, 
        timeoutMs?: number
    ): Promise<{ pid: number; cwd: string }> {
        return BridgePM.start(projectId, cwd, command, args, env, timeoutMs);
    },

    async stopAll(projectId: string): Promise<void> {
        return BridgePM.stopAll(projectId);
    },

    getStatus(projectId: string): ProcessStatus {
        return BridgePM.isRunning(projectId) ? 'RUNNING' : 'STOPPED';
    },

    getPids(projectId: string): number[] {
        return BridgePM.getPids ? BridgePM.getPids(projectId) : [];
    },

    isRunning(projectId: string): boolean {
        return BridgePM.isRunning(projectId);
    },

    listAll(): { projectId: string; pids: number[]; status: ProcessStatus }[] {
        return BridgePM.listAll ? BridgePM.listAll() : [];
    }
};


import { ChildProcess } from 'child_process';

export type ProcessStatus = 'IDLE' | 'STARTING' | 'RUNNING' | 'FAILED' | 'STOPPED';

export interface ManagedProcess {
    pid: number;
    projectId: string;
    status: ProcessStatus;
    startedAt: string;
    cwd: string;
    process: ChildProcess;
}

const getBridgePM = () => {
    try {
        const utils = require('@packages/utils');
        return utils.ProcessManager;
    } catch (e) {
        return null;
    }
};

/**
 * processManager.ts
 *
 * Proxy implementation that delegates to the centralized Bridge.
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
        const pm = getBridgePM();
        if (!pm) throw new Error('ProcessManager not found in Bridge');
        return pm.start(projectId, cwd, command, args, env, timeoutMs);
    },

    async stopAll(projectId: string): Promise<void> {
        const pm = getBridgePM();
        if (!pm) return;
        return pm.stopAll(projectId);
    },

    getStatus(projectId: string): ProcessStatus {
        const pm = getBridgePM();
        if (!pm) return 'STOPPED';
        return pm.isRunning(projectId) ? 'RUNNING' : 'STOPPED';
    },

    getPids(projectId: string): number[] {
        const pm = getBridgePM();
        if (!pm || !pm.getPids) return [];
        return pm.getPids(projectId);
    },

    isRunning(projectId: string): boolean {
        const pm = getBridgePM();
        if (!pm) return false;
        return pm.isRunning(projectId);
    },

    listAll(): { projectId: string; pids: number[]; status: ProcessStatus }[] {
        const pm = getBridgePM();
        if (!pm || !pm.listAll) return [];
        return pm.listAll();
    }
};

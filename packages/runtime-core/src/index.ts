export enum RuntimeStatus {
    IDLE = 'IDLE',
    RUNNING = 'RUNNING',
    STOPPED = 'STOPPED',
    ERROR = 'ERROR'
}

export enum JobStage {
    INIT = 'INIT',
    EXECUTION = 'EXECUTION',
    FINALIZATION = 'FINALIZATION'
}

export enum MissionStatus {
    PENDING = 'PENDING',
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED'
}

export class ProcessManager {
    static async register() {
        console.log('[ProcessManager] Process registered');
    }
}

export class DistributedExecutionContext {
    static async get() {
        return { id: 'default-context' };
    }
}

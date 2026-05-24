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
    private static store = new Map<string, any>();
    private id: string;

    static getTracer() {
        return {
            startActiveSpan: async (name: string, cb: (span: any) => Promise<any>) => {
                const span = {
                    setAttribute: (...args: any[]) => {},
                    setStatus: (...args: any[]) => {},
                    recordException: (...args: any[]) => {},
                    end: () => {}
                };
                return cb(span);
            }
        };
    }

    constructor(id: string) {
        this.id = id;
        if (!DistributedExecutionContext.store.has(id)) {
            DistributedExecutionContext.store.set(id, {
                id,
                status: 'pending',
                finalFiles: [],
                agentResults: {}
            });
        }
    }

    async get() {
        return DistributedExecutionContext.store.get(this.id);
    }

    async atomicUpdate(fn: (ctx: any) => void) {
        const ctx = DistributedExecutionContext.store.get(this.id) || { id: this.id };
        fn(ctx);
        DistributedExecutionContext.store.set(this.id, ctx);
    }

    static async get() {
        return { id: 'default-context' };
    }
}

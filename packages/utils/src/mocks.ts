/**
 * SHARED UNIVERSAL SERVER MOCK BRIDGE
 * Serves as a centralized source of truth for mocks across all workspace services.
 */
export const logger = {
    info: (...args: any[]) => console.log('[BRIDGE-LOG]', ...args),
    error: (...args: any[]) => console.error('[BRIDGE-ERR]', ...args),
    warn: (...args: any[]) => console.warn('[BRIDGE-WARN]', ...args),
    debug: (...args: any[]) => console.debug('[BRIDGE-DEBUG]', ...args),
    getExecutionLogger: (...args: any[]) => logger,
} as any;

export const getExecutionLogger = logger.getExecutionLogger;

export const registry = {
    register: (...args: any[]) => {},
    metrics: async () => '',
    contentType: 'text/plain; version=0.0.4'
} as any;

export const QUEUE_FREE = 'build-free';
export const QUEUE_PRO = 'build-pro';
export const QUEUE_ARCH = 'build-arch';
export const QUEUE_VALIDATE = 'build-validate';
export const watchdog: any = { start: async () => {}, stop: async () => {} };

export const Mission: any = {
    id: 'mock-mission',
    status: 'active'
};

export interface RuntimeRecord {
    projectId: string;
    executionId: string;
    userId?: string;
    status: string; // Using string to allow various status values
    startedAt: string;
    lastHealthCheck?: string;
    lastHeartbeatAt?: string;
    previewUrl?: string;
    port?: number;
    pid?: number;
}

export enum RuntimeStatus {
    IDLE = 'idle',
    RUNNING = 'running',
    FAILED = 'failed'
}

export interface RuntimeSnapshot {
    id: string;
    projectId: string;
    timestamp: string;
}

export const redis: any = {
    get: async (key: string) => null,
    set: async (key: string, val: any) => 'OK',
    setex: async (key: string, ttl: number, val: any) => 'OK',
    del: async (key: string) => 1,
    hgetall: async (key: string) => ({}),
    hset: async () => 1,
    hincrby: async () => 1,
    publish: async () => 1,
    subscribe: async () => 1,
    on: () => {},
    quit: async () => 'OK',
    duplicate: () => redis,
    expire: async () => 1,
};

export const subscriber: any = {
    psubscribe: (pattern: string, cb: any) => cb(null),
    on: (event: string, cb: any) => {},
};

export class DistributedExecutionContext {
    id: string;
    constructor(id: string) { this.id = id; }
    async init(...args: any[]) {}
    setAgentResult(...args: any[]) {}
    async get(): Promise<any> { return { 
        status: 'in-progress', 
        agentResults: {}, 
        metrics: { startTime: new Date().toISOString() },
        projectId: 'mock-project',
        executionId: this.id,
        prompt: 'Mock prompt',
        userId: 'mock-user',
        currentStage: 'planner'
    }; }
    async atomicUpdate(cb: any) { await cb({}); }
    static async getActiveExecutions() { return []; }
    async transition(to: string) {}
}

export class ResumeAgent {
    async execute(...args: any[]) { return { data: { score: 95 } }; }
}

export class Queue<T = any> { 
    constructor(name: string, opts?: any) {} 
    async add(...args: any[]) { return { id: 'mock' }; } 
    async close() {} 
    on(event: string, cb: any) { return this; }
}

export class Worker { 
    public opts: any;
    constructor(name: string, cb: any, opts?: any) { this.opts = opts || { connection: {} }; } 
    async close() {} 
    on(event: string, cb: any) { return this; }
}

export const missionController: any = {
    listActiveMissions: async () => [],
    updateMission: async (id: string, data: any) => ({})
};

export const eventBus: any = {
    stage: async (...args: any[]) => {},
    error: async (...args: any[]) => {},
    agent: async (...args: any[]) => {},
    passed: async (...args: any[]) => {},
    thought: async (...args: any[]) => {},
    shutdown: async () => {}
};

export const ReliabilityMonitor: any = {
    recordSuccess: async (...args: any[]) => {},
    recordFailure: async (...args: any[]) => {}
};

export const BuildCacheManager: any = {
    restore: async (...args: any[]) => true,
    save: async (...args: any[]) => {}
};

export const ArtifactValidator: any = {
    validate: async (...args: any[]) => ({ valid: true, missingFiles: [] })
};

export const PreviewServerManager: any = { start: async () => {}, stop: async () => {} };
export const previewManager: any = { start: async () => {}, stop: async () => {} };
export const PortManager: any = { start: async () => {}, stop: async () => {} };
export const ContainerManager: any = { 
    start: async () => ({ containerId: 'mock-container', containerName: 'mock-name' }), 
    stop: async () => {}, 
    cleanupAll: async () => {}, 
    pruneImages: async () => {},
    isRunning: (id: string) => false,
    listAll: () => [],
    ensureNetwork: () => {},
    buildImage: async () => {}
};
export const ProcessManager: any = {
    start: async () => {},
    stop: async () => {},
    getPid: (id: string) => 1234,
    isRunning: (id: string) => false,
    listAll: () => []
};
export const SandboxRunner: any = class { async run(...args: any[]) { return {}; } };

export const RedisRecovery: any = { handleRedisCrash: async () => {} };
export const PreviewOrchestrator: any = { start: async () => {} };
export const RuntimeCleanup: any = { start: () => {}, shutdownAll: async () => {} };
export const NodeRegistry: any = { register: async () => 'mock-node', deregister: async () => {}, listNodes: async () => [], getNode: async () => null };
export const FailoverManager: any = { start: () => {}, stop: () => {} };
export const WorkerClusterManager: any = { heartbeat: async () => {}, deregister: async () => {} };
export const BuildGraphEngine: any = { getAffectedNodes: async () => [] };
export const EvolutionManager: any = { evolve: async () => false };

export enum JobStage { PLAN = 'PLAN', FAILED = 'FAILED' }
export enum MissionStatus { PLANNING = 'planning', COMPLETED = 'completed', FAILED = 'failed' }

export const runtimeStartupDuration: any = { observe: () => {} };
export const runtimeCrashesTotal: any = { inc: () => {} };
export const runtimeActiveTotal: any = { inc: () => {}, dec: () => {} };
export const runtimeProxyErrorsTotal: any = { inc: () => {} };
export const runtimeEvictionsTotal: any = { inc: () => {} };
export const nodeMemoryUsage: any = { set: () => {}, observe: () => {} };
export const nodeCpuUsage: any = { set: () => {}, observe: () => {} };
export const queueWaitTimeSeconds: any = { observe: () => {} };
export const stuckBuildsTotal: any = { inc: () => {} };
export const env: any = { WORKER_CONCURRENCY_FREE: 5, WORKER_CONCURRENCY_PRO: 10 };

export const runWithTracing = async (id: string, cb: any) => await cb();

export class Job<T = any> {
    id: string = 'mock-job';
    data: T;
    timestamp: number = Date.now();
    token: string = 'mock-token';
    queueName: string = 'mock-queue';
    name: string = 'mock-name';
    constructor(data: T) { this.data = data; }
    async isActive() { return true; }
    async extendLock(...args: any[]) {}
}

export const repairQueue: any = new Queue('repair');
export const dockerQueue: any = new Queue('docker');
export const generatorQueue: any = new Queue('generator');
export const supervisorQueue: any = new Queue('supervisor');
export const queueManager: any = { getQueue: (name: string) => new Queue(name), add: async (...args: any[]) => ({ id: 'mock' }) };
export const QueueManager: any = queueManager;

export const agentRegistry: any = {
    getAgent: (name: string) => null,
    registerAgent: (name: string, agent: any) => {},
    register: (name: string, agent: any) => {}
};

export const patchVerifier: any = { verify: async (dir: string, vfs: any) => ({ passed: true, errors: [] }) };
export class VirtualFileSystem { loadFromDiskState(files: any[]) {} read() { return ''; } write() {} }
export const supervisorService: any = { start: async () => {} };
export const supabaseAdmin: any = {};
export const deployQueue: any = new Queue('deploy');
export const DEPLOYMENT_QUEUE = 'deploy';
export const plannerQueue: any = new Queue('planner');
export const QUEUE_SELF_MODIFICATION = 'self-mod';
export const QUEUE_STRATEGY = 'strategy';
export const QUEUE_PLANNER = 'planner';
export const architectureQueue: any = new Queue('arch');
export const validatorQueue: any = new Queue('val');
export const QUEUE_REPAIR = 'repair';
export const QUEUE_ROLLBACK = 'rollback';

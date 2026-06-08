/**
 * SHARED UNIVERSAL SERVER MOCK BRIDGE
 * Serves as a centralized source of truth for mocks across all workspace services.
 */
export const logger = {
    info: (...args: any[]) => console.log('[BRIDGE-LOG]', ...args),
    error: (...args: any[]) => console.error('[BRIDGE-ERR]', ...args),
    warn: (...args: any[]) => console.warn('[BRIDGE-WARN]', ...args),
    debug: (...args: any[]) => console.debug('[BRIDGE-DEBUG]', ...args),
    getExecutionLogger: (..._args: any[]) => logger,
} as any;

export const getExecutionLogger = logger.getExecutionLogger;

export const registry = {
    register: (..._args: any[]) => {},
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
export type AgentResult = any;
export type ExecutionContextType = any;

export interface ManagedContainer {
    containerId: string;
    projectId: string;
    port: number;
    status: string;
    startedAt: string;
}

import { 
    RuntimeStatus, 
    JobStage, 
    MissionStatus, 
    DistributedExecutionContext as RealContext 
} from './runtime-types.js';

export { RuntimeStatus, JobStage, MissionStatus };
export class DistributedExecutionContext extends RealContext {
    static getTracer() {
        return {
            startActiveSpan: async (name: string, cb: (span: any) => Promise<any>) => {
                const span = {
                    setAttribute: (..._args: any[]) => {},
                    setStatus: (..._args: any[]) => {},
                    recordException: (..._args: any[]) => {},
                    end: () => {}
                };
                return cb(span);
            }
        };
    }
}

export const redis: any = {
    get: async (_key: string) => null,
    set: async (_key: string, _val: any) => 'OK',
    setex: async (_key: string, _ttl: number, _val: any) => 'OK',
    del: async (_key: string) => 1,
    hgetall: async (_key: string) => ({}),
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
    on: (_event: string, _cb: any) => {},
};

export class ResumeAgent {
    async execute(..._args: any[]) { return { data: { score: 95 } }; }
}

export class Queue<T = any> { 
    constructor(_name: string, _opts?: any) {} 
    async add(..._args: any[]) { return { id: 'mock' }; } 
    async close() {} 
    on(_event: string, _cb: any) { return this; }
    async getRepeatableJobs() { return []; }
    async addBulk(..._args: any[]) { return []; }
    async getJobs(..._args: any[]) { return []; }
    async getJobCounts() { return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }; }
}

export class Worker { 
    public opts: any;
    public processFn: any;
    constructor(name: string, cb: any, opts?: any) { 
        this.opts = opts || { connection: {} }; 
        this.processFn = cb;
    } 
    async close() {} 
    on(_event: string, _cb: any) { return this; }
}

export const missionController: any = {
    listActiveMissions: async () => [],
    updateMission: async (_id: string, _data: any) => ({})
};

export const eventBus: any = {
    stage: async (..._args: any[]) => {},
    error: async (..._args: any[]) => {},
    agent: async (..._args: any[]) => {},
    passed: async (..._args: any[]) => {},
    thought: async (..._args: any[]) => {},
    shutdown: async () => {}
};

export const ReliabilityMonitor: any = {
    recordSuccess: async (..._args: any[]) => {},
    recordFailure: async (..._args: any[]) => {}
};

export const BuildCacheManager: any = {
    restore: async (..._args: any[]) => true,
    save: async (..._args: any[]) => {}
};

export const ArtifactValidator: any = {
    validate: async (..._args: any[]) => ({ valid: true, missingFiles: [] })
};

export const PreviewServerManager: any = { start: async () => {}, stop: async () => {} };
export const PreviewWatchdog: any = { start: async () => {}, stop: async () => {} };
export class BaseAgent {
    constructor(public name: string = 'base') {}
    async run(..._args: any[]) { return { success: true }; }
    async execute(..._args: any[]): Promise<any> { return { success: true }; }
}
export class DatabaseAgent extends BaseAgent { constructor() { super('database'); } }
export class BackendAgent extends BaseAgent { constructor() { super('backend'); } }
export class FrontendAgent extends BaseAgent { constructor() { super('frontend'); } }
export class DeploymentAgent extends BaseAgent { constructor() { super('deployment'); } }
export class SecurityAgent extends BaseAgent { constructor() { super('security'); } }
export class MonitoringAgent extends BaseAgent { constructor() { super('monitoring'); } }
export class SaaSMonetizationAgent extends BaseAgent { constructor() { super('billing'); } }
export class PlannerAgent extends BaseAgent { constructor() { super('planner'); } }
export class ResearchAgent extends BaseAgent { constructor() { super('research'); } }
export class DebugAgent extends BaseAgent { constructor() { super('debug'); } }
export class ArchitectureAgent extends BaseAgent { constructor() { super('architecture'); } }
export class RankingAgent extends BaseAgent { constructor() { super('ranking'); } }
export class RepairAgent extends BaseAgent { constructor() { super('repair'); } }
export class CriticAgent extends BaseAgent { constructor() { super('critic'); } }

export const previewManager: any = { start: async () => {}, stop: async () => {} };
export const PortManager: any = { 
    start: async () => {}, 
    stop: async () => {},
    acquirePorts: async () => [3000],
    releasePorts: async () => {},
    getPorts: async () => [3000],
    renewLease: async () => {},
    forceAcquirePorts: async () => {},
    isPortFree: async () => true,
    acquireFreePort: async () => 3000
};
export const ContainerManager: any = { 
    start: async () => ({ containerId: 'mock-container', containerName: 'mock-name' }), 
    stop: async () => {}, 
    cleanupAll: async () => {}, 
    pruneImages: async () => {},
    isRunning: (_id: string) => false,
    listAll: () => [],
    ensureNetwork: () => {},
    buildImage: async () => {},
    hotInject: async () => {}
};
export const ProcessManager: any = {
    start: async () => {},
    stop: async () => {},
    getPid: (_id: string) => 1234,
    isRunning: (_id: string) => false,
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
export const RuntimeCapacity: any = { check: async () => ({ allowed: true }), reserve: async () => {}, release: async () => {} };
export const RuntimeHeartbeat: any = { startLoop: async () => {} };
export const RuntimeMetrics: any = { record: async () => {} };



export const runtimeStartupDuration: any = { observe: () => {} };
export const runtimeCrashesTotal: any = { inc: () => {} };
export const retryCountTotal: any = { inc: () => {} };
export const runtimeActiveTotal: any = { inc: () => {}, dec: () => {} };
export const runtimeProxyErrorsTotal: any = { inc: () => {} };
export const runtimeEvictionsTotal: any = { inc: () => {} };
export const nodeMemoryUsage: any = { set: () => {}, observe: () => {} };
export const nodeCpuUsage: any = { set: () => {}, observe: () => {} };
export const queueWaitTimeSeconds: any = { observe: () => {} };
export const stuckBuildsTotal: any = { inc: () => {} };
export const getSafeEnv = (overrides: any = {}) => ({ ...process.env, ...overrides });
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
    async extendLock(..._args: any[]) {}
}

export const repairQueue: any = new Queue('repair');
export const dockerQueue: any = new Queue('docker');
export const generatorQueue: any = new Queue('generator');
export const supervisorQueue: any = new Queue('supervisor');
export const queueManager: any = { getQueue: (name: string) => new Queue(name), add: async (...args: any[]) => ({ id: 'mock' }) };
export const QueueManager: any = queueManager;

export const agentRegistry: any = {
    getAgent: (_name: string) => null,
    registerAgent: (_name: string, _agent: any) => {},
    register: (_name: string, _agent: any) => {}
};

export const patchVerifier: any = { verify: async (dir: string, vfs: any) => ({ passed: true, errors: [] }) };
export class VirtualFileSystem { loadFromDiskState(files: any[]) {} read() { return ''; } write() {} }
export const supervisorService: any = {
    start: async () => {},
    checkHealth: async (_id: string) => 'NONE',
    handleDecision: async (_id: string, _decision: string) => {}
};
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

export const activities: any = {
    createActivities: (_name: string) => ({})
};
export const createActivities = activities.createActivities;

export const connection = redis;

export const runPipeline = async (id: string, prompt: string) => ({ success: true, missionId: id });
export const updatePipeline = async (id: string, prompt: string) => ({ success: true, missionId: id });
export const deployPipeline = async (id: string, ip: string) => ({ success: true, missionId: id });

export const rateLimitMiddleware = (req: any, res: any, next: any) => next();
export const createBreaker = (fn: any, opts: any) => ({
    fire: (...args: any[]) => fn(...args),
    opened: false
});
export const createBackpressureMiddleware = (opts: any) => (req: any, res: any, next: any) => next();
export const createOutboundClient = (opts: any) => ({});

export const kafkaManager: any = {
    publish: async (..._args: any[]) => {},
    subscribe: async (..._args: any[]) => {},
    on: (..._args: any[]) => {}
};

export const ThresholdBls: any = {
    dkg: async (threshold: number, count: number, nodeIds: string[]) => ({
        shares: nodeIds.map(id => ({ nodeId: id, secretShare: 'deadbeef' })),
        masterPublicKey: 'beefdead'
    }),
    signShare: async (..._args: any[]) => 'signature',
    aggregate: async (..._args: any[]) => 'aggregate',
    verify: async (sig: string, ..._args: any[]) => {
        if (sig === 'INVALID_OR_MISSING_SIG' || sig === 'FAIL') return false;
        return true;
    }
};

export const Canonical: any = {
    hash: (_data: any) => 'hashed'
};

export const QUEUE_DOCKER = 'docker-queue';
export const QUEUE_SUPERVISOR = 'supervisor-queue';
export const QUEUE_REFACTOR = 'refactor-queue';
export const QUEUE_EVOLUTION = 'evolution-queue';
export const TenantService: any = {
    getTenantForUser: async (_userId: string) => ({ id: 'mock-tenant', plan: 'free' }),
    checkQuota: async () => true
};
export const InfraProvisioner: any = {
    provisionResources: async (_projectId: string, _plan: string) => ({})
};
export const CICDManager: any = {
    setupPipeline: async (_projectId: string, _sandboxDir: string, _templateId: string) => {}
};
export const CommitManager: any = {
    commit: async (..._args: any[]) => {}
};
export class BlueprintManager {
    async getForTemplate(_templateId: string) { return []; }
}
export const IS_PRODUCTION = false;

export const SLOService: any = {
    recordLatency: async (..._args: any[]) => {},
    recordFailure: async (..._args: any[]) => {},
    getMetrics: async () => ({}),
    checkLatency: async (..._args: any[]) => {}
};
export class SandboxPodController {
    async deploy(_projectId: string, _executionId: string, _files: any[]) {
        return { success: true, url: 'http://127.0.0.1:3000' };
    }
    async createPod(..._args: any[]) {}
    async deletePod(..._args: any[]) {}
}
export const usageService: any = {
    recordAiUsage: async (..._args: any[]) => {}
};
export const QUEUE_META = 'meta-queue';
export const ANALYTICS_QUEUE = 'analytics-queue';
export const QUEUE_BILLING = 'billing-queue';
export const QUEUE_PATTERN = 'pattern-queue';
export const QUEUE_EVALUATION = 'evaluation-queue';
export const QUEUE_GENERATOR = 'generator-queue';

import { db as realDb } from '@packages/db';
import Redis from 'ioredis';
import { logger as realLogger, contextStorage, getTenantId, getRequestId } from '@packages/observability';
import { eventBus as baseEventBus } from '@packages/events';
import { Queue as BullQueue, Worker as BullWorker, Job as BullJob } from 'bullmq';
import { serverConfig as config } from '@packages/config';
export { Job } from 'bullmq';
import * as governance from './governance';
import { BuildCache } from './build-cache';

export const CostGovernanceService = governance.CostGovernanceService;
export const regionalGovernance = governance.regionalGovernance;
export const BuildCacheManager = BuildCache;

export type AgentResponse<T = any> = any;
export type BuildEvent = any;
export type RuntimeRecord = any;


// Re-export db for convenience
export const db = realDb;
export const memoryPlane = realDb;
export const logger: any = realLogger;
export const getExecutionLogger = (id: string): any => realLogger.child({ executionId: id });

// Pipeline Stubs
export const planner = async (...args: any[]) => ({ projectName: 'Mock Project', template: 'Next.js', [Symbol.iterator]: function* () { } });
export const uiAgent = async (...args: any[]) => ({ 'index.html': '<h1>Mock</h1>' });
export const logicAgent = async (...args: any[]) => ({ 'api.ts': 'export const run = () => {}' });

export class PolishAgent {
    async execute(payload: any) { return { success: true, data: { summary: 'Polished', modifiedFiles: [] } }; }
}

export class ChatEditAgent {
    async execute(payload: any) { return { success: true, data: { patches: [] }, error: null }; }
}

export class CoderAgent {
    async execute(payload: any, ...args: any[]) { return { success: true, data: { files: [] }, error: undefined, metrics: { tokensTotal: 0, durationMs: 0 } }; }
}

export class PlannerAgent {
    async execute(payload: any, ...args: any[]) { return { success: true, data: { steps: [] }, error: undefined, metrics: { tokensTotal: 0, durationMs: 0 } }; }
}

export const healer = async (errors: any[], files: any) => files;
export const validator = async (files: any) => ({ valid: true, isValid: true, errors: [], missingFiles: [] });
export const run = async (id: string, files: any) => 'http://localhost:3000/mock';

export class BaseAgent {
    public logs: any[] = [];
    constructor(...args: any[]) { }
    async execute(payload: any, ...args: any[]) {
        return { success: true, data: { status: 'mocked', score: 100, patches: [], confidence: 1, ...payload } };
    }
    log(message: string, context?: any) {
        this.logs.push({ message, context, timestamp: new Date().toISOString() });
        console.log(`[Agent] ${message}`);
    }
    async promptLLM(system: string, user: string, model?: string, signal?: any) {
        return { result: {}, tokens: { total: 100 } };
    }
}

export class DatabaseAgent extends BaseAgent { }
export class BackendAgent extends BaseAgent { }
export class FrontendAgent extends BaseAgent { }
export class DeploymentAgent extends BaseAgent { }
export class TestingAgent extends BaseAgent { }
export class ValidatorAgent extends BaseAgent { }
export class RankingAgent extends BaseAgent { }
export class ResumeAgent extends BaseAgent { }
export class DebugAgent extends BaseAgent { }
export class SaaSMonetizationAgent extends BaseAgent { }
export class ResearchAgent extends BaseAgent { }
export class ArchitectureAgent extends BaseAgent { }
export class SecurityAgent extends BaseAgent { }
export class MonitoringAgent extends BaseAgent { }
export class IntentDetectionAgent extends BaseAgent { }
export class GeneratorAgent extends BaseAgent { }
export class MetaAgent extends BaseAgent { }
export class CustomizerAgent extends BaseAgent { }

export class StrategyEngine extends BaseAgent {
    static async getOptimalStrategy(...args: any[]) { return {}; }
}

export class AgentMemory extends BaseAgent { }

// Messaging & State
const safePublish = async (channel: string, payload: string) => {
    try {
        if (redis.status !== 'ready') {
            logger.warn({ channel }, '[EventBus] Redis not ready, waiting for reconnect...');
            await new Promise(r => setTimeout(r, 500));
            if (redis.status !== 'ready') {
                logger.error({ channel }, '[EventBus] Redis still not ready. Event dropped.');
                return;
            }
        }
        await redis.publish(channel, payload);
    } catch (err: any) {
        logger.error({ err: err.message, channel }, '[EventBus] Failed to publish event');
    }
};

export const eventBus: any = {
    ...baseEventBus,
    publish: async (topic: string, data: any, projectId?: string) => {
        const executionId = data.executionId || 'global';
        const payloadObj = { ...data, type: topic, projectId, timestamp: new Date().toISOString() };
        await safePublish('build-events', JSON.stringify(payloadObj));
        try {
            const streamKey = `mission:events:${executionId}`;
            await (baseEventBus as any).publishStream(streamKey, payloadObj, 1000);
            const shard = (baseEventBus as any).getShardForTenant(projectId || 'global', 16);
            const globalStreamKey = (baseEventBus as any).getPartitionedStream('platform:mission:events', shard);
            await (baseEventBus as any).publishStream(globalStreamKey, payloadObj, 10000, { backpressureLimit: 5000 });
        } catch (e) {
            logger.error({ err: e, executionId }, '[Bridge] publishStream failed');
        }
    },
    thought: async (executionId: string, agent: string, thought: string, projectId?: string) => {
        await eventBus.publish('thought', { executionId, agent, message: thought }, projectId);
    },
    stage: async (executionId: string, stage: string, status: string, message: string, progress: number, projectId?: string) => {
        await eventBus.publish('progress', { executionId, stage, status, message, totalProgress: progress }, projectId);
    },
    progress: async (executionId: string, progress: number, message: string, stage: string, status: string, projectId?: string) => {
        await eventBus.publish('progress', { executionId, stage, status, message, totalProgress: progress }, projectId);
    },
    error: async (executionId: string, error: string, projectId?: string) => {
        await eventBus.publish('error', { executionId, message: error }, projectId);
    },
    agent: async (executionId: string, agent: string, action: string, message: string, projectId?: string) => {
        await eventBus.publish('agent', { executionId, agent, action, message }, projectId);
    },
    log: async (missionId: string, message: string, level = 'INFO', agent_id = 'System') => {
        const payload = JSON.stringify({ missionId, message, level, agent_id, timestamp: new Date().toISOString() });
        await safePublish('log-events', payload);
    },
    complete: async (executionId: string, payload: any = {}, projectId?: string, ...args: any[]) => {
        await eventBus.publish('complete', {
            executionId,
            message: payload.message || 'Build completed successfully',
            tokensUsed: payload.tokensUsed || 0,
            durationMs: payload.durationMs || 0,
            costUsd: payload.costUsd || 0
        }, projectId);
    },
    readBuildEvents: async (executionId: string, lastId = '0') => {
        try {
            const streamKey = `build:stream:${executionId}`;
            const results = await (baseEventBus as any).replayStream(streamKey, lastId, '+');
            return results.map((r: any) => [r.id, r.data]);
        } catch (e) {
            logger.error({ err: e, executionId }, '[Bridge] readBuildEvents failed');
            return [];
        }
    },
    getLatestBuildState: async (executionId: string) => {
        const events = await eventBus.readBuildEvents(executionId);
        if (events.length === 0) return null;
        return events[events.length - 1][1];
    },
    startTimer: async (executionId: string, source: string, label: string, message: string, projectId?: string) => {
        const startTime = Date.now();
        await eventBus.publish(executionId, 'timer_start', { source, label, message: `Starting: ${message}` }, projectId);
        return async (finalStatus = 'Success') => {
            const durationMs = Date.now() - startTime;
            await eventBus.publish(executionId, 'timer_end', { source, label, message: `Finished: ${message} (${finalStatus})`, durationMs }, projectId);
        };
    },
};

export const getLatestBuildState = eventBus.getLatestBuildState;
export const readBuildEvents = eventBus.readBuildEvents;

export const stateManager = {
    get: async (...args: any[]) => null,
    set: async (...args: any[]) => { },
    transition: async (...args: any[]) => { },
};

export const projectMemory = {
    get: async (...args: any[]) => ({ memory: [] }),
    update: async (...args: any[]) => { },
};

// Redis Initialization
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redisConfig: any = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    autoResubscribe: true,
    retryStrategy(times: number) {
        return Math.min(times * 200, 10000);
    }
};

if (!(globalThis as any).__redisClient) {
    (globalThis as any).__redisClient = new Redis(REDIS_URL, redisConfig);
}
export const redis = (globalThis as any).__redisClient;

// Infrastructure
export const RateLimiter = {
    checkExportLimit: async (...args: any[]) => ({ allowed: true, retryAfter: 0 }),
    checkLimit: async (...args: any[]) => ({ allowed: true }),
};

export const projectService = {
    verifyProjectOwnership: async (...args: any[]) => true,
    getProject: async (...args: any[]) => ({ id: 'mock', status: 'mock' }),
    getProjects: async (...args: any[]) => [],
    getProjectFiles: async (...args: any[]) => [],
    createProject: async (...args: any[]) => ({ data: { id: 'mock-id' }, error: null }),
};
export const ProjectService = projectService;

export const missionController = {
    getMission: async (id: string) => {
        return await db.mission.findUnique({ where: { id } });
    },
    createMission: async (mission: any, steps: any[] = []) => {
        const m = await db.mission.upsert({
            where: { id: mission.id },
            update: {
                title: mission.title || mission.prompt?.substring(0, 50) || 'New Mission',
                status: mission.status || 'queued',
                description: mission.prompt,
                tenantId: mission.tenantId || 'system',
                updatedAt: new Date(),
            },
            create: {
                id: mission.id,
                title: mission.title || mission.prompt?.substring(0, 50) || 'New Mission',
                status: mission.status || 'queued',
                description: mission.prompt,
                tenantId: mission.tenantId || 'system',
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        });
        return m;
    },
    updateMission: async (id: string, updates: any) => {
        return await db.mission.update({
            where: { id },
            data: { ...updates, updatedAt: new Date() }
        });
    },
    addLog: async (executionId: string, stage: string, statusOrMessage: string, message?: string, progress?: number) => {
        const finalStatus = message ? statusOrMessage : 'info';
        const finalMessage = message || statusOrMessage;
        return await db.executionLog.create({
            data: { executionId, stage, status: finalStatus, message: finalMessage, progress: progress || 0 }
        });
    },
    triggerDeployment: async (...args: any[]) => ({ success: true }),
    listActiveMissions: async () => {
        return await db.mission.findMany({ where: { status: { in: ['queued', 'in-progress'] } } });
    },
    setFailed: async (id: string, error: string) => {
        return await db.mission.update({
            where: { id },
            data: { status: 'failed', error, updatedAt: new Date() }
        });
    },
};
export const MissionService = missionController;

export const AppService = { getStatus: async () => 'online' };
export const MetricService = { record: (...args: any[]) => { } };

export enum RuntimeStatus {
    IDLE = "IDLE",
    RUNNING = "RUNNING",
    FAILURE = "FAILURE"
}

export const counterMock = { inc: (...args: any[]) => { }, dec: (...args: any[]) => { }, observe: (...args: any[]) => { }, set: (...args: any[]) => { } };
export const runtimeCrashesTotal = counterMock;
export const runtimeActiveTotal = counterMock;
export const runtimeStartupDuration = counterMock;
export const runtimeProxyErrorsTotal = counterMock;
export const runtimeEvictionsTotal = counterMock;
export const nodeCpuUsage = counterMock;
export const nodeMemoryUsage = counterMock;
export const cacheHitsTotal = counterMock;
export const cacheMissesTotal = counterMock;
export const aiCacheSavingsTotal = counterMock;

export const initTelemetry = (serviceName: string) => { };
export const registry = {
    register: (...args: any[]) => { },
    metrics: async () => '',
    contentType: 'text/plain; version=0.0.4'
};
export const agentRegistry = registry;

export class PreviewServerManager {
    start() { }
    stop() { }
    static async listAll() { return []; }
}

export class SandboxRunner {
    run() { }
    stop() { }
    static async listAll() { return []; }
    static spawnLongRunning(...args: any[]) { return { on: () => { }, kill: () => { }, [Symbol.iterator]: function* () { } }; }
}

export const ProcessManager = {
    start: async (...args: any[]) => ({ pid: 123 }),
    stopAll: async (...args: any[]) => { },
    listAll: async () => [],
    getPids: async (...args: any[]) => [],
    isRunning: async (...args: any[]) => true,
};

export const RollingRestart = {
    execute: async () => { },
    isDraining: false,
};

export const QUEUE_VALIDATE = 'validate_queue';
export const QUEUE_ARCH = 'architect_queue';
export const QUEUE_ARCHITECT = QUEUE_ARCH;
export const QUEUE_SELF_MOD = 'self_mod_queue';
export const QUEUE_SELF_MODIFICATION = QUEUE_SELF_MOD;
export const QUEUE_EVAL = 'evaluation_queue';
export const QUEUE_EVALUATION = QUEUE_EVAL;
export const QUEUE_EVO = 'evolution_queue';
export const QUEUE_EVOLUTION = QUEUE_EVO;
export const QUEUE_SUPERVISOR = 'supervisor_queue';
export const QUEUE_STRATEGY = 'strategy_queue';
export const QUEUE_REPAIR = 'repair_queue';
export const QUEUE_PLANNER = 'planner_queue';
export const QUEUE_PATTERN = 'pattern_queue';
export const QUEUE_FREE = 'free_queue';
export const QUEUE_PRO = 'pro-queue';
export const QUEUE_DOCKER = 'docker_queue';
export const QUEUE_DEPLOY = 'deploy_queue';
export const QUEUE_GENERATOR = 'generator_queue';
export const QUEUE_META = 'meta_queue';
export const QUEUE_ROLLBACK = 'rollback_queue';
export const QUEUE_REFACTOR = 'refactor_queue';
export const QUEUE_BILLING = 'billing_queue';
export const ANALYTICS_QUEUE = 'analytics_queue';

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export const QueueManager = {
    add: async (name: string, data: any, opts: any = {}) => {
        const tenantId = data.tenantId || 'global';
        const region = data.region || process.env.CURRENT_REGION || 'us-east-1';
        const queue = QueueManager.getQueue(name, region);
        return queue.add(name, { ...data, tenantId, region }, { ...opts, group: { id: tenantId } });
    },
    addJob: async (name: string, data: any, opts: any = {}) => QueueManager.add(name, data, opts),
    process: async (name: string, cb: any, opts: any = {}) => {
        const region = opts.region || process.env.CURRENT_REGION || 'us-east-1';
        return new BullWorker(`${name}:${region}`, cb, { connection: redis, ...opts });
    },
    getQueue: (name: string, region?: string) => {
        const targetRegion = region || process.env.CURRENT_REGION || 'us-east-1';
        const regionalName = `${name}:${targetRegion}`;
        const globalQueues = (globalThis as any).__regionalQueues || ((globalThis as any).__regionalQueues = new Map());
        if (!globalQueues.has(regionalName)) {
            globalQueues.set(regionalName, new BullQueue(regionalName, { connection: redis }));
        }
        return globalQueues.get(regionalName);
    },
    getQueueDepth: async (name: string, region?: string) => {
        const queue = QueueManager.getQueue(name, region);
        return await queue.getWaitingCount();
    }
};
export const queueManager = QueueManager;

export class VirtualFileSystem {
    files: Record<string, string> = {};
    async read(path: string) { return path ? this.files[path] : ''; }
    async write(path: string, content: string) { if (path) this.files[path] = content ?? ''; }
    async readFile(path: string) { return this.files[path] || ''; }
    async writeFile(path: string, content: string) { this.files[path] = content; }
    async loadFromDiskState(state: any) { }
    setFile(path: string, content: string) { this.files[path] = content; }
    getAllFiles() { return { ...this.files }; }
}

export class CommitManager {
    static async commit(...args: any[]) { return { success: true }; }
}

export class patchVerifier {
    static async verify(path: string, vfs: any) { return { passed: true, errors: [] }; }
    async verify(path: string, vfs: any) { return { passed: true, errors: [] }; }
}

export class DistributedExecutionContext {
    id: string;
    missionId: string;
    projectId: string;
    metadata: any = {};
    vfs = new VirtualFileSystem();
    constructor(id: string, projectId: string = 'default') {
        this.id = id;
        this.missionId = id;
        this.projectId = projectId;
    }
    async init(userId: string, projectId: string, prompt: string, executionId: string) {
        this.id = executionId;
        this.missionId = executionId;
        this.projectId = projectId;
        this.metadata = { userId, prompt, executionId, startTime: new Date().toISOString() };
    }
    getVFS() { return this.vfs; }
    async get() {
        return { id: this.id, status: 'planning', projectId: this.projectId || 'mock', executionId: this.id, userId: 'mock-user', prompt: 'mock-prompt', currentStage: 'planner', metrics: { startTime: new Date().toISOString() }, agentResults: {}, metadata: this.metadata };
    }
    get executionId() { return this.id; }
    getProjectId() { return this.projectId || 'mock-project'; }
    getExecutionId() { return this.id; }
    setAgentResult(...args: any[]) { }
    async atomicUpdate(cb: any) { await cb(this); }
    static async getActiveExecutions() { return []; }
    async transition(to: string) { }
}

export type ExecutionContextType = DistributedExecutionContext;
export type AgentResult = any;

export const ContainerManager = {
    start: async (...args: any[]) => ({ containerId: 'mock' }),
    stop: async (...args: any[]) => { },
    isRunning: async (...args: any[]) => true,
    pruneImages: async (...args: any[]) => { },
    cleanupAll: async (...args: any[]) => { },
    isAvailable: () => true,
    executeCommand: async (...args: any[]) => ({ stdout: '', stderr: '', exitCode: 0 }),
    listAll: async () => [],
    hotInject: async () => ({ success: true }),
    inspect: async () => ({}),
};
export const ManagedContainer = { containerId: 'mock' };

export const RuntimeCapacity = {
    cpu: 0, memory: 0,
    reserve: async (...args: any[]) => true,
    check: async (...args: any[]) => true,
    release: async (...args: any[]) => { },
};

export const RuntimeHeartbeat = {
    nodeId: 'mock', timestamp: 0,
    startLoop: async (...args: any[]) => { },
    scanForZombies: async (...args: any[]) => [],
    stopAll: async (...args: any[]) => { },
};

export const RuntimeMetrics = {
    lastStartedAt: 0, totalStarts: 0,
    recordStart: async (...args: any[]) => { },
    recordHealthCheck: async (...args: any[]) => { },
    recordCrash: async (...args: any[]) => { },
};

export const RuntimeRecord = { id: 'mock', status: 'IDLE' };

export const PreviewRegistry: any = {
    lookupByPreviewId: async (id: string) => null,
    get: async (id: string) => ({ id, status: 'RUNNING', ports: [3000], previewId: id, runtimeVersion: '1.0.0', executionId: 'mock-exec', userId: 'mock-user', previewUrl: 'http://mock.test', restartDisabled: false, pids: [], [Symbol.iterator]: function* () { } }),
    init: async (...args: any[]) => ({ success: true, previewId: 'mock-id', id: 'mock-id', status: 'RUNNING', ports: [3000], runtimeVersion: '1.0.0', executionId: 'mock-exec', userId: 'mock-user', previewUrl: 'http://mock.test', restartDisabled: false, pids: [] }),
    update: async (...args: any[]) => ({ success: true }),
    markRunning: async (...args: any[]) => { },
    markFailed: async (...args: any[]) => { },
    markStopped: async (...args: any[]) => { },
    listAll: async () => [],
};

export const ArtifactValidator = {
    validate: async (...args: any[]) => ({ isValid: true, valid: true, errors: [], missingFiles: [] }),
};

export const PortManager = {
    acquirePorts: async (...args: any[]) => [3000],
    releasePorts: async (...args: any[]) => { },
    getPorts: async (...args: any[]) => [3000],
    renewLease: async (...args: any[]) => { },
    forceAcquirePorts: async (...args: any[]) => { },
    forceAcquirePort: async (...args: any[]) => { },
    acquireFreePort: async (...args: any[]) => 3000,
    isPortFree: async (...args: any[]) => true,
};

export const supabaseAdmin: any = {
    from: (table: string): any => ({ 
        select: (): any => ({ 
            eq: (): any => ({ 
                single: async () => ({ data: {} as any, error: null as any }), 
            }), 
        }),
        insert: async (data: any) => ({ data: {} as any, error: null as any }),
    }),
    rpc: async (name: string, args: any): Promise<any> => ({ data: [] as any, error: null as any }),
};

export const getSupabaseClient = () => ({
    auth: { getSession: async () => ({ data: { session: null }, error: null }), getUser: async () => ({ data: { user: null }, error: null }), },
    from: (table: string) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }), neq: () => ({ count: 0 }), count: 0 }), count: 0 }) })
});

export const chatService = { addMessage: async (...args: any[]) => ({ id: 'mock-msg-id' }), deleteMessage: async (...args: any[]) => ({ success: true }), };
export const supervisorService = { checkHealth: async () => true };
export const CICDManager = { triggerDeploy: async (...args: any[]) => ({ success: true }), getDeployStatus: async (...args: any[]) => 'deployed', };
export const TenantService = { getTenant: async (...args: any[]) => ({ id: 'mock-tenant' }), resolveTenant: async (...args: any[]) => ({ id: 'mock-tenant' }), };

export class SandboxPodController {
    async start(payload: any) { return { podId: `mock-pod-${Date.now()}` }; }
    async stop(podId: string) { return { success: true }; }
    async getStatus(podId: string) { return 'running'; }
}

export class BlueprintManager {
    async getBlueprint(id: string) { return { id, name: 'Mock Blueprint' }; }
    async saveBlueprint(id: string, data: any) { return { success: true }; }
    async getForTemplate(templateId: string) { return [{ id: 'mock-bp', name: 'Standard Service' }]; }
}

export const ReliabilityMonitor = { 
    checkHealth: async () => true, 
    recordStart: async (...args: any[]) => { }, 
    recordSuccess: async (...args: any[]) => { }, 
    recordFailure: async (...args: any[]) => { },
    recordError: async (...args: any[]) => { },
    getStats: async () => ({ 
        totalBuilds: 0, 
        successfulBuilds: 0, 
        failedBuilds: 0, 
        successRate: 0, 
        avgGenerationTime: 0 
    })
};
export const WorkerClusterManager = { scale: async () => { }, getStatus: async () => ({ status: 'healthy' }), heartbeat: async (...args: any[]) => { }, deregister: async (...args: any[]) => { } };
export const InfraProvisioner = { provision: async () => ({ url: 'mock.url' }), destroy: async () => { } };
export const TemplateEngine = { copyTemplate: async (...args: any[]) => [] };
export const EvolutionManager = { evolve: async (...args: any[]) => ({ success: true }) };
export const NodeRegistry = { register: async (...args: any[]) => `node-${Math.random().toString(36).substr(2, 9)}`, deregister: async (...args: any[]) => { }, listAll: async () => [] };
export const FailoverManager = { check: async () => true, start: () => { }, stop: () => { } };
export const RedisRecovery = { snapshot: async () => { }, restore: async () => { }, handleRedisCrash: async (...args: any[]) => { } };
export const PreviewOrchestrator = { spawn: async () => ({ id: 'mock-preview' }) };
export const RuntimeCleanup = { start: () => { console.log('[RuntimeCleanup] Cleanup loop started'); }, shutdownAll: async () => { console.log('[RuntimeCleanup] Force shutdown of all runtimes'); } };
export const BuildGraphEngine = { analyze: async () => ({}), getAffectedNodes: async (...args: any[]) => [] };
export const subscriber = { subscribe: (...args: any[]) => () => { }, psubscribe: (...args: any[]) => { console.log('[Redis] PSubscribe active'); }, on: (...args: any[]) => { }, };
export const usageService = { recordAiUsage: async (...args: any[]) => { } };
export const SLOService = { checkLatency: async (...args: any[]) => { } };

export const runWithTracing = async (name: string, fn: () => Promise<any>) => await fn();
export const env: any = config;

export const retryCountTotal = { inc: (...args: any[]) => { } };
export const apiRequestDurationSeconds: any = { observe: (...args: any[]) => { }, startTimer: (labels = {}) => { const start = Date.now(); return (extraLabels = {}) => (Date.now() - start) / 1000; } };
export const queueWaitTimeSeconds = { observe: (...args: any[]) => { } };
export const stuckBuildsTotal = { inc: (...args: any[]) => { } };

export enum JobStage { INIT = "INIT", PLAN = "PLAN", BUILD = "BUILD", DEPLOY = "DEPLOY", VALIDATE = "VALIDATE", EVALUATE = "EVALUATE", FAILED = "FAILED" }
export enum MissionStatus { PENDING = "PENDING", RUNNING = "RUNNING", COMPLETED = "COMPLETED", FAILED = "FAILED" }

export class Queue extends BullQueue { constructor(name: string, opts?: any) { super(name, { connection: redis, ...opts }); } }
export class Worker extends BullWorker {
    constructor(name: string, cb: any, opts?: any) {
        const wrappedCb = async (job: any) => {
            try {
                const store = { requestId: job.data?.requestId || `job-${job.id}`, tenantId: job.data?.tenantId, userId: job.data?.userId, };
                return await (contextStorage as any).run(store, () => cb(job));
            } finally {
                const tenantId = job.data?.tenantId;
                if (tenantId) await (governance as any).CostGovernanceService.decrementActiveJobs(tenantId);
            }
        };
        super(name, wrappedCb, { connection: redis, ...opts });
    }
}

export const getSafeEnv = (input: any, def?: string): any => {
    if (typeof input === 'string') return process.env[input] || def || '';
    return { ...process.env, ...input } as any;
};

export const watchdog: any = { start: () => realLogger.info('[Watchdog] Service active'), stop: () => { }, check: async () => true, };
export const StrategyConfig = { default: {} } as any;
export const patchEngine = { apply: async (...args: any[]) => ({ success: true }) } as any;
export class SemanticCacheService { async get() { return null; } async set() { } }
export const previewManager = { streamFileUpdate: async (...args: any[]) => ({ success: true }), getPreviewUrl: async (...args: any[]) => 'http://localhost:3000', } as any;

// Named exports for Queues
export const dockerQueue: any = {};
export const repairQueue: any = {};
export const plannerQueue: any = {};
export const architectureQueue: any = {};
export const generatorQueue: any = {};
export const validatorQueue: any = {};
export const deployQueue: any = {};

const bridge = {
    logger, getExecutionLogger, eventBus, redis, db, QueueManager, watchdog, ProjectService, MissionService, MetricService, PreviewRegistry, ArtifactValidator, PreviewServerManager, SandboxRunner, ProcessManager, RollingRestart, VirtualFileSystem, patchVerifier, DistributedExecutionContext, ContainerManager, CostGovernanceService: governance.CostGovernanceService, regionalGovernance: governance.regionalGovernance, BuildCacheManager: BuildCache, StrategyConfig, StrategyEngine, AgentMemory, patchEngine, supabaseAdmin, RuntimeStatus, RankingAgent, ResumeAgent, DebugAgent, PortManager, nodeCpuUsage, nodeMemoryUsage, runtimeEvictionsTotal, cacheHitsTotal, cacheMissesTotal, aiCacheSavingsTotal, getSafeEnv, dockerQueue, repairQueue, plannerQueue, architectureQueue, generatorQueue, validatorQueue, deployQueue, retryCountTotal, apiRequestDurationSeconds, previewManager, agentRegistry: registry, AgentResult: {} as any, ExecutionContextType: {} as any, initTelemetry, registry, Mission: {} as any, TaskGraph: {} as any, BuildEvent: {} as any, RuntimeCapacity, RuntimeHeartbeat, RuntimeMetrics, RuntimeRecord, ManagedContainer, SemanticCacheService,
} as any;

export default bridge;

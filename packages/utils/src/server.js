"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.counterMock = exports.RuntimeStatus = exports.MetricService = exports.AppService = exports.MissionService = exports.ProjectService = exports.missionController = exports.projectService = exports.RateLimiter = exports.redis = exports.projectMemory = exports.stateManager = exports.readBuildEvents = exports.getLatestBuildState = exports.eventBus = exports.AgentMemory = exports.StrategyEngine = exports.CustomizerAgent = exports.MetaAgent = exports.GeneratorAgent = exports.IntentDetectionAgent = exports.MonitoringAgent = exports.SecurityAgent = exports.ArchitectureAgent = exports.ResearchAgent = exports.SaaSMonetizationAgent = exports.DebugAgent = exports.ResumeAgent = exports.RankingAgent = exports.ValidatorAgent = exports.TestingAgent = exports.DeploymentAgent = exports.FrontendAgent = exports.BackendAgent = exports.DatabaseAgent = exports.BaseAgent = exports.run = exports.validator = exports.healer = exports.PlannerAgent = exports.CoderAgent = exports.ChatEditAgent = exports.PolishAgent = exports.logicAgent = exports.uiAgent = exports.planner = exports.getExecutionLogger = exports.logger = exports.memoryPlane = exports.db = void 0;
exports.ManagedContainer = exports.ContainerManager = exports.DistributedExecutionContext = exports.patchVerifier = exports.CommitManager = exports.VirtualFileSystem = exports.queueManager = exports.QueueManager = exports.IS_PRODUCTION = exports.ANALYTICS_QUEUE = exports.QUEUE_BILLING = exports.QUEUE_REFACTOR = exports.QUEUE_ROLLBACK = exports.QUEUE_META = exports.QUEUE_GENERATOR = exports.QUEUE_DEPLOY = exports.QUEUE_DOCKER = exports.QUEUE_PRO = exports.QUEUE_FREE = exports.QUEUE_PATTERN = exports.QUEUE_PLANNER = exports.QUEUE_REPAIR = exports.QUEUE_STRATEGY = exports.QUEUE_SUPERVISOR = exports.QUEUE_EVOLUTION = exports.QUEUE_EVO = exports.QUEUE_EVALUATION = exports.QUEUE_EVAL = exports.QUEUE_SELF_MODIFICATION = exports.QUEUE_SELF_MOD = exports.QUEUE_ARCHITECT = exports.QUEUE_ARCH = exports.QUEUE_VALIDATE = exports.RollingRestart = exports.ProcessManager = exports.SandboxRunner = exports.PreviewServerManager = exports.agentRegistry = exports.registry = exports.initTelemetry = exports.aiCacheSavingsTotal = exports.cacheMissesTotal = exports.cacheHitsTotal = exports.nodeMemoryUsage = exports.nodeCpuUsage = exports.runtimeEvictionsTotal = exports.runtimeProxyErrorsTotal = exports.runtimeStartupDuration = exports.runtimeActiveTotal = exports.runtimeCrashesTotal = void 0;
exports.previewManager = exports.SemanticCacheService = exports.patchEngine = exports.StrategyConfig = exports.watchdog = exports.getSafeEnv = exports.Worker = exports.Queue = exports.MissionStatus = exports.JobStage = exports.stuckBuildsTotal = exports.queueWaitTimeSeconds = exports.apiRequestDurationSeconds = exports.retryCountTotal = exports.env = exports.runWithTracing = exports.SLOService = exports.usageService = exports.subscriber = exports.BuildGraphEngine = exports.BuildCacheManager = exports.RuntimeCleanup = exports.PreviewOrchestrator = exports.RedisRecovery = exports.FailoverManager = exports.NodeRegistry = exports.EvolutionManager = exports.TemplateEngine = exports.InfraProvisioner = exports.WorkerClusterManager = exports.ReliabilityMonitor = exports.BlueprintManager = exports.SandboxPodController = exports.TenantService = exports.CICDManager = exports.supervisorService = exports.chatService = exports.getSupabaseClient = exports.supabaseAdmin = exports.PortManager = exports.ArtifactValidator = exports.PreviewRegistry = exports.RuntimeRecord = exports.RuntimeMetrics = exports.RuntimeHeartbeat = exports.RuntimeCapacity = void 0;
// Core Logging
const db_1 = require("@packages/db");
const ioredis_1 = __importDefault(require("ioredis"));
const observability_1 = require("@packages/observability");
const events_1 = require("@packages/events");
const bullmq_1 = require("bullmq");
exports.db = db_1.db;
exports.memoryPlane = db_1.db; // Mapping memoryPlane to db as a fallback or shared state
exports.logger = observability_1.logger;
const getExecutionLogger = (id) => observability_1.logger.child({ executionId: id });
exports.getExecutionLogger = getExecutionLogger;
// Pipeline Stubs
const planner = async (...args) => ({ projectName: 'Mock Project', template: 'Next.js', [Symbol.iterator]: function* () { } });
exports.planner = planner;
const uiAgent = async (...args) => ({ 'index.html': '<h1>Mock</h1>' });
exports.uiAgent = uiAgent;
const logicAgent = async (...args) => ({ 'api.ts': 'export const run = () => {}' });
exports.logicAgent = logicAgent;
class PolishAgent {
    async execute(payload) { return { success: true, data: { summary: 'Polished', modifiedFiles: [] } }; }
}
exports.PolishAgent = PolishAgent;
class ChatEditAgent {
    async execute(payload) { return { success: true, data: { patches: [] }, error: null }; }
}
exports.ChatEditAgent = ChatEditAgent;
class CoderAgent {
    async execute(payload, ...args) { return { success: true, data: { files: [] }, error: undefined, metrics: { tokensTotal: 0, durationMs: 0 } }; }
}
exports.CoderAgent = CoderAgent;
class PlannerAgent {
    async execute(payload, ...args) { return { success: true, data: { steps: [] }, error: undefined, metrics: { tokensTotal: 0, durationMs: 0 } }; }
}
exports.PlannerAgent = PlannerAgent;
const healer = async (errors, files) => files;
exports.healer = healer;
const validator = async (files) => ({ valid: true, isValid: true, errors: [], missingFiles: [] });
exports.validator = validator;
const run = async (id, files) => 'http://localhost:3000/mock';
exports.run = run;
class BaseAgent {
    logs = [];
    constructor(...args) { }
    async execute(payload, ...args) {
        return { success: true, data: { status: 'mocked' } };
    }
    log(message, context) {
        this.logs.push({ message, context, timestamp: new Date().toISOString() });
        console.log(`[${this.getName ? this.getName() : 'Agent'}] ${message}`);
    }
    async promptLLM(system, user, model, signal) {
        return { result: {}, tokens: { total: 100 } };
    }
}
exports.BaseAgent = BaseAgent;
class DatabaseAgent extends BaseAgent {
}
exports.DatabaseAgent = DatabaseAgent;
class BackendAgent extends BaseAgent {
}
exports.BackendAgent = BackendAgent;
class FrontendAgent extends BaseAgent {
}
exports.FrontendAgent = FrontendAgent;
class DeploymentAgent extends BaseAgent {
}
exports.DeploymentAgent = DeploymentAgent;
class TestingAgent extends BaseAgent {
}
exports.TestingAgent = TestingAgent;
class ValidatorAgent extends BaseAgent {
}
exports.ValidatorAgent = ValidatorAgent;
class RankingAgent extends BaseAgent {
}
exports.RankingAgent = RankingAgent;
class ResumeAgent extends BaseAgent {
}
exports.ResumeAgent = ResumeAgent;
class DebugAgent extends BaseAgent {
}
exports.DebugAgent = DebugAgent;
class SaaSMonetizationAgent extends BaseAgent {
}
exports.SaaSMonetizationAgent = SaaSMonetizationAgent;
class ResearchAgent extends BaseAgent {
}
exports.ResearchAgent = ResearchAgent;
class ArchitectureAgent extends BaseAgent {
}
exports.ArchitectureAgent = ArchitectureAgent;
class SecurityAgent extends BaseAgent {
}
exports.SecurityAgent = SecurityAgent;
class MonitoringAgent extends BaseAgent {
}
exports.MonitoringAgent = MonitoringAgent;
class IntentDetectionAgent extends BaseAgent {
}
exports.IntentDetectionAgent = IntentDetectionAgent;
class GeneratorAgent extends BaseAgent {
}
exports.GeneratorAgent = GeneratorAgent;
class MetaAgent extends BaseAgent {
}
exports.MetaAgent = MetaAgent;
class CustomizerAgent extends BaseAgent {
}
exports.CustomizerAgent = CustomizerAgent;
class StrategyEngine extends BaseAgent {
    static async getOptimalStrategy(...args) { return {}; }
}
exports.StrategyEngine = StrategyEngine;
class AgentMemory extends BaseAgent {
}
exports.AgentMemory = AgentMemory;
// Messaging & State
exports.eventBus = {
    ...events_1.eventBus,
    publish: async (executionId, type, data, projectId) => {
        const payloadObj = { ...data, executionId, type, projectId, timestamp: new Date().toISOString() };
        // 1. Pub/Sub for real-time broadcast (legacy/socket compatibility)
        await safePublish('build-events', JSON.stringify(payloadObj));
        // 2. Redis Stream for persistent history (New Backbone)
        try {
            // Per-mission stream for frontend replay
            const streamKey = `mission:events:${executionId}`;
            await events_1.eventBus.publishStream(streamKey, payloadObj, 1000);
            // Global stream for background processing (Consumer Groups)
            // SHARDED: Events are now partitioned by projectId (Tenant)
            const shard = events_1.eventBus.getShardForTenant(projectId || 'global', 16);
            const globalStreamKey = events_1.eventBus.getPartitionedStream('platform:mission:events', shard);
            await events_1.eventBus.publishStream(globalStreamKey, payloadObj, 10000, { backpressureLimit: 5000 });
        }
        catch (e) {
            observability_1.logger.error({ err: e, executionId }, '[Bridge] publishStream failed');
        }
    },
    thought: async (executionId, agent, thought, projectId) => {
        await exports.eventBus.publish(executionId, 'thought', { agent, message: thought }, projectId);
    },
    stage: async (executionId, stage, status, message, progress, projectId) => {
        await exports.eventBus.publish(executionId, 'progress', { stage, status, message, totalProgress: progress }, projectId);
    },
    progress: async (executionId, progress, message, stage, status, projectId) => {
        await exports.eventBus.publish(executionId, 'progress', { stage, status, message, totalProgress: progress }, projectId);
    },
    error: async (executionId, error, projectId) => {
        await exports.eventBus.publish(executionId, 'error', { message: error }, projectId);
    },
    agent: async (executionId, agent, action, message, projectId) => {
        await exports.eventBus.publish(executionId, 'agent', { agent, action, message }, projectId);
    },
    log: async (missionId, message, level = 'INFO', agent_id = 'System') => {
        const payload = JSON.stringify({ missionId, message, level, agent_id, timestamp: new Date().toISOString() });
        await safePublish('log-events', payload);
    },
    complete: async (executionId, payload = {}, projectId) => {
        await exports.eventBus.publish(executionId, 'complete', {
            message: payload.message || 'Build completed successfully',
            tokensUsed: payload.tokensUsed || 0,
            durationMs: payload.durationMs || 0,
            costUsd: payload.costUsd || 0
        }, projectId);
    },
    readBuildEvents: async (executionId, lastId = '0') => {
        try {
            const streamKey = `build:stream:${executionId}`;
            const results = await events_1.eventBus.replayStream(streamKey, lastId, '+');
            return results.map((r) => [r.id, r.data]);
        }
        catch (e) {
            observability_1.logger.error({ err: e, executionId }, '[Bridge] readBuildEvents failed');
            return [];
        }
    },
    getLatestBuildState: async (executionId) => {
        const events = await exports.eventBus.readBuildEvents(executionId);
        if (events.length === 0)
            return null;
        return events[events.length - 1][1];
    },
    startTimer: async (executionId, source, label, message, projectId) => {
        const startTime = Date.now();
        await exports.eventBus.publish(executionId, 'timer_start', {
            source,
            label,
            message: `Starting: ${message}`
        }, projectId);
        return async (finalStatus = 'Success') => {
            const durationMs = Date.now() - startTime;
            await exports.eventBus.publish(executionId, 'timer_end', {
                source,
                label,
                message: `Finished: ${message} (${finalStatus})`,
                durationMs
            }, projectId);
        };
    },
};
exports.getLatestBuildState = exports.eventBus.getLatestBuildState;
exports.readBuildEvents = exports.eventBus.readBuildEvents;
exports.stateManager = {
    get: async (...args) => null,
    set: async (...args) => { },
    transition: async (...args) => { },
};
exports.projectMemory = {
    get: async (...args) => ({ memory: [] }),
    update: async (...args) => { },
};
// --- REAL REDIS INTEGRATION ---
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const REDIS_SENTINEL_HOSTS = process.env.REDIS_SENTINEL_HOSTS;
const REDIS_SENTINEL_NAME = process.env.REDIS_SENTINEL_NAME || 'mymaster';
const redisConfig = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    autoResubscribe: true,
    retryStrategy(times) {
        // Exponential backoff with a cap
        const delay = Math.min(times * 200, 10000);
        return delay;
    },
    reconnectOnError(err) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
            return true;
        }
        return false;
    }
};
let redisInstance;
if (!globalThis.__redisClient) {
    if (REDIS_SENTINEL_HOSTS) {
        const sentinels = REDIS_SENTINEL_HOSTS.split(',').map(hostStr => {
            const [host, port] = hostStr.split(':');
            return { host, port: parseInt(port, 10) || 26379 };
        });
        Object.assign(redisConfig, {
            sentinels,
            name: REDIS_SENTINEL_NAME,
            password: process.env.REDIS_PASSWORD || undefined
        });
        console.log(`[Redis HA] Configuring cluster connection via Sentinel Mesh (${REDIS_SENTINEL_NAME})`);
    }
    globalThis.__redisClient = REDIS_SENTINEL_HOSTS
        ? new ioredis_1.default(redisConfig)
        : new ioredis_1.default(REDIS_URL, redisConfig);
    const client = globalThis.__redisClient;
    client.on('connect', () => console.log('[BRIDGE-REDIS] TCP connection established.'));
    client.on('ready', () => console.log('[BRIDGE-REDIS] Ready to accept commands.'));
    client.on('error', (err) => {
        console.error('[BRIDGE-REDIS-ERR] Connection lost or failed:', err.message);
    });
    client.on('reconnecting', () => console.log('[BRIDGE-REDIS] Reconnecting...'));
}
exports.redis = globalThis.__redisClient;
// Guarded publishing to prevent blocking or unhandled rejections during outages
const safePublish = async (channel, payload) => {
    const latency = parseInt(process.env.REDIS_LATENCY_MS || '0', 10);
    if (latency > 0) {
        await new Promise(resolve => setTimeout(resolve, latency));
    }
    try {
        if (exports.redis.status !== 'ready') {
            exports.logger.warn({ channel }, '[EventBus] Redis not ready, waiting for reconnect...');
            await new Promise(r => setTimeout(r, 500));
            if (exports.redis.status !== 'ready') {
                exports.logger.error({ channel }, '[EventBus] Redis still not ready. Event dropped.');
                return;
            }
        }
        await exports.redis.publish(channel, payload);
    }
    catch (err) {
        exports.logger.error({ err: err.message, channel }, '[EventBus] Failed to publish event');
    }
};
// Infrastructure
exports.RateLimiter = {
    checkExportLimit: async (...args) => ({ allowed: true, retryAfter: 0 }),
    checkLimit: async (...args) => ({ allowed: true }),
};
__exportStar(require("./governance"), exports);
const governance_1 = require("./governance");
// Domain Services
exports.projectService = {
    verifyProjectOwnership: async (...args) => true,
    getProject: async (...args) => ({ id: 'mock', status: 'mock' }),
    getProjects: async (...args) => [],
    getProjectFiles: async (...args) => [],
    createProject: async (...args) => ({ data: { id: 'mock-id' }, error: null }),
};
exports.missionController = {
    getMission: async (id) => {
        return await exports.db.mission.findUnique({ where: { id } });
    },
    createMission: async (mission, steps = []) => {
        const m = await exports.db.mission.upsert({
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
        if (steps.length > 0) {
            // First, clear existing steps if any (for idempotency)
            await exports.db.missionStep.deleteMany({ where: { missionId: mission.id } });
            // Create steps without dependencies first to get IDs
            const createdSteps = await Promise.all(steps.map((step) => exports.db.missionStep.create({
                data: {
                    missionId: mission.id,
                    title: step.title,
                    description: step.description,
                    agentType: step.agentType,
                    inputData: step.inputData,
                    order: step.order || 0
                }
            })));
            // Map original step index/id to new IDs for dependency linking
            // ... simplified for now ...
        }
        return m;
    },
    updateMission: async (id, updates) => {
        const currentRegion = process.env.CURRENT_REGION || 'us-east-1';
        // 1. Fetch current state to check region and timestamp
        const current = await exports.db.mission.findUnique({
            where: { id },
            select: { assignedRegion: true, updatedAt: true }
        });
        if (!current)
            throw new Error(`Mission ${id} not found`);
        // 2. Strong Consistency Guard: Only the assigned region should update active state
        if (current.assignedRegion && current.assignedRegion !== currentRegion) {
            exports.logger.warn({ id, currentRegion, assignedRegion: current.assignedRegion }, '⚠️ [Global-Consistency] Cross-region update detected. Verifying lock...');
            // Allow if it's a forced update or if the source region is OFFLINE
        }
        // 3. Optimistic Locking: Prevent stale updates from out-of-sync regions
        if (updates.updatedAt && new Date(updates.updatedAt) < current.updatedAt) {
            exports.logger.error({ id, updateTs: updates.updatedAt, currentTs: current.updatedAt }, '🛑 [Global-Consistency] Rejecting stale update (Conflict)');
            throw new Error('Conflict: Update is older than current state');
        }
        return await exports.db.mission.update({
            where: { id },
            data: {
                ...updates,
                updatedAt: new Date(),
            }
        });
    },
    addLog: async (executionId, stage, status, message, progress) => {
        return await exports.db.executionLog.create({
            data: {
                executionId,
                stage,
                status,
                message,
                progress,
            }
        });
    },
    triggerDeployment: async (...args) => ({ success: true }),
    listActiveMissions: async () => {
        return await exports.db.mission.findMany({
            where: {
                status: { in: ['queued', 'in-progress'] }
            }
        });
    },
};
exports.ProjectService = exports.projectService;
exports.MissionService = exports.missionController;
exports.AppService = { getStatus: async () => 'online' };
exports.MetricService = { record: (...args) => { } };
var RuntimeStatus;
(function (RuntimeStatus) {
    RuntimeStatus["IDLE"] = "IDLE";
    RuntimeStatus["RUNNING"] = "RUNNING";
    RuntimeStatus["FAILURE"] = "FAILURE";
})(RuntimeStatus || (exports.RuntimeStatus = RuntimeStatus = {}));
// Metrics & Telemetry
exports.counterMock = { inc: () => { }, dec: () => { }, observe: () => { }, set: () => { } };
exports.runtimeCrashesTotal = exports.counterMock;
exports.runtimeActiveTotal = exports.counterMock;
exports.runtimeStartupDuration = exports.counterMock;
exports.runtimeProxyErrorsTotal = exports.counterMock;
exports.runtimeEvictionsTotal = exports.counterMock;
exports.nodeCpuUsage = exports.counterMock;
exports.nodeMemoryUsage = exports.counterMock;
exports.cacheHitsTotal = exports.counterMock;
exports.cacheMissesTotal = exports.counterMock;
exports.aiCacheSavingsTotal = exports.counterMock;
// Telemetry placeholder
const initTelemetry = (serviceName) => { };
exports.initTelemetry = initTelemetry;
exports.registry = {
    register: (...args) => { },
    metrics: async () => '',
    contentType: 'text/plain; version=0.0.4'
};
exports.agentRegistry = exports.registry;
// Preview & Runtime Management
class PreviewServerManager {
    start() { }
    stop() { }
    static async listAll() { return []; }
}
exports.PreviewServerManager = PreviewServerManager;
// Preview manager placeholder
class SandboxRunner {
    run() { }
    stop() { }
    static async listAll() { return []; }
    static spawnLongRunning(...args) { return { on: () => { }, kill: () => { }, [Symbol.iterator]: function* () { } }; }
}
exports.SandboxRunner = SandboxRunner;
exports.ProcessManager = {
    start: async (...args) => ({ pid: 123 }),
    stopAll: async (...args) => { },
    listAll: async () => [],
    getPids: async (...args) => [],
    isRunning: async (...args) => true,
};
exports.RollingRestart = {
    execute: async () => { },
    isDraining: false,
};
exports.QUEUE_VALIDATE = 'validate_queue';
exports.QUEUE_ARCH = 'architect_queue';
exports.QUEUE_ARCHITECT = exports.QUEUE_ARCH;
exports.QUEUE_SELF_MOD = 'self_mod_queue';
exports.QUEUE_SELF_MODIFICATION = exports.QUEUE_SELF_MOD;
exports.QUEUE_EVAL = 'evaluation_queue';
exports.QUEUE_EVALUATION = exports.QUEUE_EVAL;
exports.QUEUE_EVO = 'evolution_queue';
exports.QUEUE_EVOLUTION = exports.QUEUE_EVO;
exports.QUEUE_SUPERVISOR = 'supervisor_queue';
exports.QUEUE_STRATEGY = 'strategy_queue';
exports.QUEUE_REPAIR = 'repair_queue';
exports.QUEUE_PLANNER = 'planner_queue';
exports.QUEUE_PATTERN = 'pattern_queue';
exports.QUEUE_FREE = 'free_queue';
exports.QUEUE_PRO = 'pro-queue';
exports.QUEUE_DOCKER = 'docker_queue';
exports.QUEUE_DEPLOY = 'deploy_queue';
exports.QUEUE_GENERATOR = 'generator_queue';
exports.QUEUE_META = 'meta_queue';
exports.QUEUE_ROLLBACK = 'rollback_queue';
exports.QUEUE_REFACTOR = 'refactor_queue';
exports.QUEUE_BILLING = 'billing_queue';
exports.ANALYTICS_QUEUE = 'analytics_queue';
exports.IS_PRODUCTION = process.env.NODE_ENV === 'production';
// Real Queue Implementation (Phase 5.4)
const createPartitionedQueue = (name) => {
    return new bullmq_1.Queue(name, {
        connection: exports.redis,
        defaultJobOptions: {
            removeOnComplete: false,
            removeOnFail: 1000,
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 }
        }
    });
};
exports.QueueManager = {
    /**
     * Add a job to a queue with automatic tenant and regional partitioning
     */
    add: async (name, data, opts = {}) => {
        const tenantId = data.tenantId || (typeof observability_1.getTenantId === 'function' ? (0, observability_1.getTenantId)() : undefined) || 'global';
        const requestId = data.requestId || (typeof observability_1.getRequestId === 'function' ? (0, observability_1.getRequestId)() : undefined);
        const region = data.region || process.env.CURRENT_REGION || 'us-east-1';
        const jobData = {
            ...data,
            tenantId,
            requestId,
            region,
            _partitioned: true
        };
        const queue = exports.QueueManager.getQueue(name, region);
        exports.logger.info({ name, region, tenantId }, '[QueueManager] Routing job to regional queue');
        return queue.add(name, jobData, {
            ...opts,
            group: { id: tenantId }
        });
    },
    addJob: async (name, data, opts = {}) => {
        return exports.QueueManager.add(name, data, opts);
    },
    process: async (name, cb, opts = {}) => {
        const region = opts.region || process.env.CURRENT_REGION || 'us-east-1';
        const regionalName = `${name}:${region}`;
        exports.logger.info({ name, regionalName, region }, '[QueueManager] Starting regional worker');
        return new bullmq_1.Worker(regionalName, cb, { connection: exports.redis, ...opts });
    },
    getQueue: (name, region) => {
        const targetRegion = region || process.env.CURRENT_REGION || 'us-east-1';
        const regionalName = `${name}:${targetRegion}`;
        // Cache regional queues to avoid recreating BullQueue instances
        const globalQueues = globalThis.__regionalQueues || (globalThis.__regionalQueues = new Map());
        if (!globalQueues.has(regionalName)) {
            exports.logger.debug({ regionalName }, '[QueueManager] Initializing new regional queue instance');
            globalQueues.set(regionalName, createPartitionedQueue(regionalName));
        }
        return globalQueues.get(regionalName);
    },
    /**
     * Retrieves the current depth of a regional queue for backpressure tracking.
     */
    getQueueDepth: async (name, region) => {
        const queue = exports.QueueManager.getQueue(name, region);
        const count = await queue.getWaitingCount();
        return count;
    }
};
exports.queueManager = exports.QueueManager;
class VirtualFileSystem {
    files = {};
    async read(path) { return path ? this.files[path] : ''; }
    async write(path, content) { if (path)
        this.files[path] = content ?? ''; }
    async readFile(path) { return this.files[path] || ''; }
    async writeFile(path, content) { this.files[path] = content; }
    async loadFromDiskState(state) { }
    setFile(path, content) { this.files[path] = content; }
    getAllFiles() { return { ...this.files }; }
}
exports.VirtualFileSystem = VirtualFileSystem;
class CommitManager {
    static async commit(...args) { return { success: true }; }
}
exports.CommitManager = CommitManager;
class patchVerifier {
    static async verify(path, vfs) { return { passed: true, errors: [] }; }
    async verify(path, vfs) { return { passed: true, errors: [] }; }
}
exports.patchVerifier = patchVerifier;
class DistributedExecutionContext {
    id;
    projectId;
    metadata = {};
    vfs = new VirtualFileSystem();
    constructor(id, projectId) {
        this.id = id || 'mock';
        this.projectId = projectId;
    }
    async init(userId, projectId, prompt, executionId) {
        this.projectId = projectId;
        this.id = executionId;
        this.metadata = {
            userId,
            prompt,
            executionId,
            startTime: new Date().toISOString()
        };
        exports.logger.info({ executionId, projectId, userId }, 'Context Initialized');
    }
    getVFS() {
        return this.vfs;
    }
    async get() {
        return {
            id: this.id,
            status: 'planning',
            projectId: this.projectId || 'mock',
            executionId: this.id,
            userId: 'mock-user',
            prompt: 'mock-prompt',
            currentStage: 'planner',
            metrics: { startTime: new Date().toISOString() },
            agentResults: {},
            metadata: this.metadata
        };
    }
    get executionId() { return this.id; }
    getProjectId() { return this.projectId || 'mock-project'; }
    getExecutionId() { return this.id; }
    setAgentResult(...args) {
        exports.logger.info('Agent result updated in context');
    }
    async atomicUpdate(cb) { await cb(this); }
    static async getActiveExecutions() { return []; }
    async transition(to) { exports.logger.info({ to }, 'Stage transitioned'); }
}
exports.DistributedExecutionContext = DistributedExecutionContext;
exports.ContainerManager = {
    start: async (...args) => ({ containerId: 'mock' }),
    stop: async (...args) => { },
    isRunning: async (...args) => true,
    pruneImages: async (...args) => { },
    cleanupAll: async (...args) => { },
    isAvailable: () => true,
    executeCommand: async (...args) => ({ stdout: '', stderr: '', exitCode: 0 }),
    listAll: async () => [],
    hotInject: async () => ({ success: true }),
    inspect: async () => ({}),
};
exports.ManagedContainer = { containerId: 'mock' };
exports.RuntimeCapacity = {
    cpu: 0,
    memory: 0,
    reserve: async (...args) => true,
    check: async (...args) => true,
    release: async (...args) => { },
};
exports.RuntimeHeartbeat = {
    nodeId: 'mock',
    timestamp: 0,
    startLoop: async (...args) => { },
    scanForZombies: async (...args) => [],
    stopAll: async (...args) => { },
};
exports.RuntimeMetrics = {
    lastStartedAt: 0,
    totalStarts: 0,
    recordStart: async (...args) => { },
    recordHealthCheck: async (...args) => { },
    recordCrash: async (...args) => { },
};
exports.RuntimeRecord = { id: 'mock', status: 'IDLE' };
exports.PreviewRegistry = {
    lookupByPreviewId: async (id) => null,
    get: async (id) => ({
        id, status: 'RUNNING', ports: [3000], previewId: id,
        runtimeVersion: '1.0.0', executionId: 'mock-exec', userId: 'mock-user',
        previewUrl: 'http://mock.test', restartDisabled: false, pids: [],
        [Symbol.iterator]: function* () { }
    }),
    init: async (...args) => ({
        success: true,
        previewId: 'mock-id',
        id: 'mock-id',
        status: 'RUNNING',
        ports: [3000],
        runtimeVersion: '1.0.0',
        executionId: 'mock-exec',
        userId: 'mock-user',
        previewUrl: 'http://mock.test',
        restartDisabled: false,
        pids: []
    }),
    update: async (...args) => ({ success: true }),
    markRunning: async (...args) => { },
    markFailed: async (...args) => { },
    markStopped: async (...args) => { },
    listAll: async () => [],
};
exports.ArtifactValidator = {
    validate: async (...args) => ({ isValid: true, valid: true, errors: [], missingFiles: [] }),
};
// Universal Port Manager Mock
exports.PortManager = {
    acquirePorts: async (...args) => [3000],
    releasePorts: async (...args) => { },
    getPorts: async (...args) => [3000],
    renewLease: async (...args) => { },
    forceAcquirePorts: async (...args) => { },
    forceAcquirePort: async (...args) => { },
    acquireFreePort: async (...args) => 3000,
    isPortFree: async (...args) => true,
};
// Auth & Supabase
exports.supabaseAdmin = {
    from: (table) => ({
        select: () => ({
            eq: () => ({
                single: async () => ({ data: null, error: null }),
            }),
        })
    })
};
const getSupabaseClient = () => ({
    auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
    },
    from: (table) => ({
        select: () => ({
            eq: () => ({
                single: async () => ({ data: null, error: null }),
                neq: () => ({ count: 0 }),
                count: 0
            }),
            count: 0
        })
    })
});
exports.getSupabaseClient = getSupabaseClient;
// Controller fallbacks
exports.chatService = {
    addMessage: async (...args) => ({ id: 'mock-msg-id' }),
    deleteMessage: async (...args) => ({ success: true }),
};
// Queues & Managers
exports.supervisorService = { checkHealth: async () => true };
exports.CICDManager = {
    triggerDeploy: async (...args) => ({ success: true }),
    getDeployStatus: async (...args) => 'deployed',
};
exports.TenantService = {
    getTenant: async (...args) => ({ id: 'mock-tenant' }),
    resolveTenant: async (...args) => ({ id: 'mock-tenant' }),
};
class SandboxPodController {
    async start(payload) { return { podId: `mock-pod-${Date.now()}` }; }
    async stop(podId) { return { success: true }; }
    async getStatus(podId) { return 'running'; }
}
exports.SandboxPodController = SandboxPodController;
class BlueprintManager {
    async getBlueprint(id) { return { id, name: 'Mock Blueprint' }; }
    async saveBlueprint(id, data) { return { success: true }; }
    async getForTemplate(templateId) { return [{ id: 'mock-bp', name: 'Standard Service' }]; }
}
exports.BlueprintManager = BlueprintManager;
exports.ReliabilityMonitor = {
    checkHealth: async () => true,
    recordStart: async (...args) => { },
    recordSuccess: async (...args) => { },
    recordFailure: async () => { },
};
exports.WorkerClusterManager = {
    scale: async () => { },
    getStatus: async () => ({ status: 'healthy' }),
    heartbeat: async (workerId) => { console.log(`[WorkerCluster] Heartbeat from ${workerId}`); }
};
exports.InfraProvisioner = {
    provision: async () => ({ url: 'mock.url' }),
    destroy: async () => { }
};
exports.TemplateEngine = {
    copyTemplate: async (...args) => []
};
exports.EvolutionManager = {
    evolve: async (...args) => ({ success: true })
};
exports.NodeRegistry = {
    register: async () => `node-${Math.random().toString(36).substr(2, 9)}`,
    deregister: async (nodeId) => { console.log(`[NodeRegistry] Deregistered ${nodeId}`); },
    listAll: async () => []
};
exports.FailoverManager = {
    check: async () => true,
    start: () => { console.log('[FailoverManager] Initialized'); }
};
exports.RedisRecovery = {
    snapshot: async () => { },
    restore: async () => { }
};
exports.PreviewOrchestrator = {
    spawn: async () => ({ id: 'mock-preview' })
};
exports.RuntimeCleanup = {
    start: () => { console.log('[RuntimeCleanup] Cleanup loop started'); },
    shutdownAll: async () => { console.log('[RuntimeCleanup] Force shutdown of all runtimes'); }
};
const build_cache_1 = require("./build-cache");
exports.BuildCacheManager = build_cache_1.BuildCache;
exports.BuildGraphEngine = {
    analyze: async () => ({})
};
exports.subscriber = {
    subscribe: (...args) => () => { },
    psubscribe: (...args) => { console.log('[Redis] PSubscribe active'); },
    on: (...args) => { },
};
exports.usageService = {
    recordAiUsage: async (...args) => { }
};
exports.SLOService = {
    checkLatency: async (...args) => { }
};
const runWithTracing = async (name, fn) => {
    return await fn();
};
exports.runWithTracing = runWithTracing;
exports.env = process.env;
// Metrics
exports.retryCountTotal = { inc: () => { } };
exports.apiRequestDurationSeconds = {
    observe: (...args) => { },
    startTimer: (labels = {}) => {
        const start = Date.now();
        return (extraLabels = {}) => {
            const duration = (Date.now() - start) / 1000;
            // console.debug('[METRIC] apiRequestDurationSeconds', { ...labels, ...extraLabels, duration });
            return duration;
        };
    }
};
exports.queueWaitTimeSeconds = { observe: () => { } };
exports.stuckBuildsTotal = { inc: () => { } };
var JobStage;
(function (JobStage) {
    JobStage["INIT"] = "INIT";
    JobStage["PLAN"] = "PLAN";
    JobStage["BUILD"] = "BUILD";
    JobStage["DEPLOY"] = "DEPLOY";
    JobStage["VALIDATE"] = "VALIDATE";
    JobStage["EVALUATE"] = "EVALUATE";
    JobStage["FAILED"] = "FAILED";
})(JobStage || (exports.JobStage = JobStage = {}));
var MissionStatus;
(function (MissionStatus) {
    MissionStatus["PENDING"] = "PENDING";
    MissionStatus["RUNNING"] = "RUNNING";
    MissionStatus["COMPLETED"] = "COMPLETED";
    MissionStatus["FAILED"] = "FAILED";
})(MissionStatus || (exports.MissionStatus = MissionStatus = {}));
class Queue extends bullmq_1.Queue {
    constructor(name, opts) {
        super(name, { connection: exports.redis, ...opts });
    }
}
exports.Queue = Queue;
class Worker extends bullmq_1.Worker {
    constructor(name, cb, opts) {
        const wrappedCb = async (job) => {
            try {
                // Phase 5.2: Wrap in context if available
                const store = {
                    requestId: job.data?.requestId || `job-${job.id}`,
                    tenantId: job.data?.tenantId,
                    userId: job.data?.userId,
                };
                return await observability_1.contextStorage.run(store, () => cb(job));
            }
            finally {
                const tenantId = job.data?.tenantId;
                if (tenantId) {
                    // Phase 5.3: Automatically release the concurrency slot
                    await governance_1.CostGovernanceService.decrementActiveJobs(tenantId);
                }
            }
        };
        super(name, wrappedCb, { connection: exports.redis, ...opts });
    }
}
exports.Worker = Worker;
const getSafeEnv = (input, def) => {
    if (typeof input === 'string')
        return process.env[input] || def || '';
    return { ...process.env, ...input };
};
exports.getSafeEnv = getSafeEnv;
exports.watchdog = {
    start: () => observability_1.logger.info('[Watchdog] Service active'),
    stop: () => { },
    check: async () => true,
};
// Engine Specific Configuration
exports.StrategyConfig = { default: {} };
exports.patchEngine = { apply: async (...args) => ({ success: true }) };
class SemanticCacheService {
    async get() { return null; }
    async set() { }
}
exports.SemanticCacheService = SemanticCacheService;
exports.previewManager = {
    streamFileUpdate: async (...args) => ({ success: true }),
    getPreviewUrl: async (...args) => 'http://localhost:3000',
};
// Default export for packages that expect it
const bridge = {
    logger: exports.logger,
    getExecutionLogger: exports.getExecutionLogger,
    eventBus: exports.eventBus,
    redis: exports.redis,
    db: db_1.db,
    QueueManager: exports.QueueManager,
    watchdog: exports.watchdog,
    ProjectService: exports.ProjectService,
    MissionService: exports.MissionService,
    MetricService: exports.MetricService,
    PreviewRegistry: exports.PreviewRegistry,
    ArtifactValidator: exports.ArtifactValidator,
    PreviewServerManager,
    SandboxRunner,
    ProcessManager: exports.ProcessManager,
    RollingRestart: exports.RollingRestart,
    VirtualFileSystem,
    patchVerifier,
    DistributedExecutionContext,
    ContainerManager: exports.ContainerManager,
    CostGovernanceService: governance_1.CostGovernanceService,
    StrategyConfig: exports.StrategyConfig,
    StrategyEngine,
    AgentMemory,
    patchEngine: exports.patchEngine,
    supabaseAdmin: exports.supabaseAdmin,
    RuntimeStatus,
    RankingAgent,
    ResumeAgent,
    DebugAgent,
    PortManager: exports.PortManager,
    nodeCpuUsage: exports.nodeCpuUsage,
    nodeMemoryUsage: exports.nodeMemoryUsage,
    runtimeEvictionsTotal: exports.runtimeEvictionsTotal,
    cacheHitsTotal: exports.cacheHitsTotal,
    cacheMissesTotal: exports.cacheMissesTotal,
    aiCacheSavingsTotal: exports.aiCacheSavingsTotal,
    getSafeEnv: exports.getSafeEnv,
    dockerQueue: {},
    repairQueue: {},
    initTelemetry: exports.initTelemetry,
    registry: exports.registry,
    Mission: {},
    TaskGraph: {},
    BuildEvent: {},
    RuntimeCapacity: exports.RuntimeCapacity,
    RuntimeHeartbeat: exports.RuntimeHeartbeat,
    RuntimeMetrics: exports.RuntimeMetrics,
    RuntimeRecord: exports.RuntimeRecord,
    ManagedContainer: exports.ManagedContainer,
    SemanticCacheService,
    plannerQueue: {},
    architectureQueue: {},
    generatorQueue: {},
    validatorQueue: {},
    deployQueue: {},
    retryCountTotal: exports.retryCountTotal,
    apiRequestDurationSeconds: exports.apiRequestDurationSeconds,
    previewManager: exports.previewManager,
    agentRegistry: exports.registry,
    AgentResult: {},
    ExecutionContextType: {},
};
exports.default = bridge;
//# sourceMappingURL=server.js.map
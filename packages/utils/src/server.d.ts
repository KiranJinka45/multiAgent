import { Queue as BullQueue, Worker as BullWorker, Job as BullJob } from 'bullmq';
export declare const db: any;
export declare const memoryPlane: any;
export declare const logger: import("pino/pino").Logger<never, boolean>;
export declare const getExecutionLogger: (id: string) => import("pino/pino").Logger<never, boolean>;
export declare const planner: (...args: any[]) => Promise<any>;
export declare const uiAgent: (...args: any[]) => Promise<any>;
export declare const logicAgent: (...args: any[]) => Promise<any>;
export declare class PolishAgent {
    execute(payload?: any): Promise<{
        success: boolean;
        data: {
            summary: string;
            modifiedFiles: never[];
        };
    }>;
}
export declare class ChatEditAgent {
    execute(payload?: any): Promise<{
        success: boolean;
        data: {
            patches: any[];
        } | null;
        error?: any;
    }>;
}
export declare class CoderAgent {
    execute(payload?: any, ...args: any[]): Promise<AgentResponse>;
}
export declare class PlannerAgent {
    execute(payload?: any, ...args: any[]): Promise<AgentResponse>;
}
export declare const healer: (errors: any[], files: any) => Promise<any>;
export declare const validator: (files: any) => Promise<{
    valid: boolean;
    isValid: boolean;
    errors: never[];
    missingFiles: never[];
}>;
export declare const run: (id: string, files: any) => Promise<string>;
export interface AgentResponse<T = any> {
    success: boolean;
    data: T | null;
    logs?: any[];
    error?: string;
    tokens?: any;
    confidence?: number;
    metrics?: {
        tokensTotal: number;
        durationMs: number;
    };
}
export declare class BaseAgent {
    protected logs: any[];
    constructor(...args: any[]);
    execute(payload: any, ...args: any[]): Promise<AgentResponse>;
    log(message: string, context?: any): void;
    promptLLM(system: string, user: string, model: string, signal?: AbortSignal): Promise<any>;
}
export declare class DatabaseAgent extends BaseAgent {
}
export declare class BackendAgent extends BaseAgent {
}
export declare class FrontendAgent extends BaseAgent {
}
export declare class DeploymentAgent extends BaseAgent {
}
export declare class TestingAgent extends BaseAgent {
}
export declare class ValidatorAgent extends BaseAgent {
}
export declare class RankingAgent extends BaseAgent {
}
export declare class ResumeAgent extends BaseAgent {
}
export declare class DebugAgent extends BaseAgent {
}
export declare class SaaSMonetizationAgent extends BaseAgent {
}
export declare class ResearchAgent extends BaseAgent {
}
export declare class ArchitectureAgent extends BaseAgent {
}
export declare class SecurityAgent extends BaseAgent {
}
export declare class MonitoringAgent extends BaseAgent {
}
export declare class IntentDetectionAgent extends BaseAgent {
}
export declare class GeneratorAgent extends BaseAgent {
}
export declare class MetaAgent extends BaseAgent {
}
export declare class CustomizerAgent extends BaseAgent {
}
export declare class StrategyEngine extends BaseAgent {
    static getOptimalStrategy(...args: any[]): Promise<{}>;
}
export declare class AgentMemory extends BaseAgent {
}
export declare const eventBus: any;
export declare const getLatestBuildState: any;
export declare const readBuildEvents: any;
export declare const stateManager: any;
export declare const projectMemory: any;
export declare const redis: any;
export declare const RateLimiter: any;
export * from './governance';
export declare const projectService: any;
export declare const missionController: any;
export declare const ProjectService: any;
export declare const MissionService: any;
export declare const AppService: any;
export declare const MetricService: any;
export declare enum RuntimeStatus {
    IDLE = "IDLE",
    RUNNING = "RUNNING",
    FAILURE = "FAILURE"
}
export declare const counterMock: any;
export declare const runtimeCrashesTotal: any;
export declare const runtimeActiveTotal: any;
export declare const runtimeStartupDuration: any;
export declare const runtimeProxyErrorsTotal: any;
export declare const runtimeEvictionsTotal: any;
export declare const nodeCpuUsage: any;
export declare const nodeMemoryUsage: any;
export declare const cacheHitsTotal: any;
export declare const cacheMissesTotal: any;
export declare const aiCacheSavingsTotal: any;
export declare const initTelemetry: (serviceName?: string) => void;
export declare const registry: {
    register: (...args: any[]) => void;
    metrics: () => Promise<string>;
    contentType: string;
};
export type ExecutionContextType = any;
export declare const agentRegistry: {
    register: (...args: any[]) => void;
    metrics: () => Promise<string>;
    contentType: string;
};
export declare class PreviewServerManager {
    start(): void;
    stop(): void;
    static listAll(): Promise<never[]>;
}
export declare class SandboxRunner {
    run(): void;
    stop(): void;
    static listAll(): Promise<never[]>;
    static spawnLongRunning(...args: any[]): any;
}
export declare const ProcessManager: any;
export declare const RollingRestart: any;
export declare const QUEUE_VALIDATE = "validate_queue";
export declare const QUEUE_ARCH = "architect_queue";
export declare const QUEUE_ARCHITECT = "architect_queue";
export declare const QUEUE_SELF_MOD = "self_mod_queue";
export declare const QUEUE_SELF_MODIFICATION = "self_mod_queue";
export declare const QUEUE_EVAL = "evaluation_queue";
export declare const QUEUE_EVALUATION = "evaluation_queue";
export declare const QUEUE_EVO = "evolution_queue";
export declare const QUEUE_EVOLUTION = "evolution_queue";
export declare const QUEUE_SUPERVISOR = "supervisor_queue";
export declare const QUEUE_STRATEGY = "strategy_queue";
export declare const QUEUE_REPAIR = "repair_queue";
export declare const QUEUE_PLANNER = "planner_queue";
export declare const QUEUE_PATTERN = "pattern_queue";
export declare const QUEUE_FREE = "free_queue";
export declare const QUEUE_PRO = "pro-queue";
export declare const QUEUE_DOCKER = "docker_queue";
export declare const QUEUE_DEPLOY = "deploy_queue";
export declare const QUEUE_GENERATOR = "generator_queue";
export declare const QUEUE_META = "meta_queue";
export declare const QUEUE_ROLLBACK = "rollback_queue";
export declare const QUEUE_REFACTOR = "refactor_queue";
export declare const QUEUE_BILLING = "billing_queue";
export declare const ANALYTICS_QUEUE = "analytics_queue";
export declare const IS_PRODUCTION: boolean;
export declare const QueueManager: {
    /**
     * Add a job to a queue with automatic tenant and regional partitioning
     */
    add: (name: string, data: any, opts?: any) => Promise<BullJob<any, any, string>>;
    addJob: (name: string, data: any, opts?: any) => Promise<BullJob<any, any, string>>;
    process: (name: string, cb: any, opts?: any) => Promise<BullWorker<any, any, string>>;
    getQueue: (name: string, region?: string) => BullQueue;
    /**
     * Retrieves the current depth of a regional queue for backpressure tracking.
     */
    getQueueDepth: (name: string, region?: string) => Promise<number>;
};
export declare const queueManager: {
    /**
     * Add a job to a queue with automatic tenant and regional partitioning
     */
    add: (name: string, data: any, opts?: any) => Promise<BullJob<any, any, string>>;
    addJob: (name: string, data: any, opts?: any) => Promise<BullJob<any, any, string>>;
    process: (name: string, cb: any, opts?: any) => Promise<BullWorker<any, any, string>>;
    getQueue: (name: string, region?: string) => BullQueue;
    /**
     * Retrieves the current depth of a regional queue for backpressure tracking.
     */
    getQueueDepth: (name: string, region?: string) => Promise<number>;
};
export declare class VirtualFileSystem {
    private files;
    read(path?: string): Promise<string>;
    write(path?: string, content?: string): Promise<void>;
    readFile(path: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;
    loadFromDiskState(state?: any): Promise<void>;
    setFile(path: string, content: string): void;
    getAllFiles(): {
        [x: string]: string;
    };
}
export declare class CommitManager {
    static commit(...args: any[]): Promise<{
        success: boolean;
    }>;
}
export declare class patchVerifier {
    static verify(path?: string, vfs?: any): Promise<{
        passed: boolean;
        errors: string[];
    }>;
    verify(path?: string, vfs?: any): Promise<{
        passed: boolean;
        errors: string[];
    }>;
}
export declare class DistributedExecutionContext {
    id: string;
    projectId?: string;
    metadata: Record<string, any>;
    private vfs;
    constructor(id: string, projectId?: string);
    init(userId: string, projectId: string, prompt: string, executionId: string): Promise<void>;
    getVFS(): VirtualFileSystem;
    get(): Promise<any>;
    get executionId(): string;
    getProjectId(): string;
    getExecutionId(): string;
    setAgentResult(...args: any[]): void;
    atomicUpdate(cb: any): Promise<void>;
    static getActiveExecutions(): Promise<never[]>;
    transition(to: string): Promise<void>;
    [key: string]: any;
}
export declare const ContainerManager: any;
export declare const ManagedContainer: any;
export declare const RuntimeCapacity: any;
export declare const RuntimeHeartbeat: any;
export declare const RuntimeMetrics: any;
export interface RuntimeRecord {
    id: string;
    status: string;
    projectId?: string;
    executionId?: string;
    previewId?: string;
    ports?: number[];
    [key: string]: any;
}
export declare const RuntimeRecord: any;
export declare const PreviewRegistry: any;
export declare const ArtifactValidator: any;
export declare const PortManager: any;
export declare const supabaseAdmin: any;
export declare const getSupabaseClient: () => any;
export declare const chatService: any;
export declare const supervisorService: any;
export declare const CICDManager: any;
export declare const TenantService: any;
export declare class SandboxPodController {
    start(payload?: any): Promise<{
        podId: string;
    }>;
    stop(podId: string): Promise<{
        success: boolean;
    }>;
    getStatus(podId: string): Promise<string>;
}
export declare class BlueprintManager {
    getBlueprint(id: string): Promise<{
        id: string;
        name: string;
    }>;
    saveBlueprint(id: string, data: any): Promise<{
        success: boolean;
    }>;
    getForTemplate(templateId: string): Promise<{
        id: string;
        name: string;
    }[]>;
}
export declare const ReliabilityMonitor: any;
export declare const WorkerClusterManager: any;
export declare const InfraProvisioner: any;
export declare const TemplateEngine: any;
export declare const EvolutionManager: any;
export declare const NodeRegistry: any;
export declare const FailoverManager: any;
export declare const RedisRecovery: any;
export declare const PreviewOrchestrator: any;
export declare const RuntimeCleanup: any;
import { BuildCache } from './build-cache';
export declare const BuildCacheManager: typeof BuildCache;
export declare const BuildGraphEngine: any;
export declare const subscriber: any;
export declare const usageService: any;
export declare const SLOService: any;
export declare const runWithTracing: (name: string, fn: () => Promise<any>) => Promise<any>;
export declare const env: Record<string, string | undefined>;
export declare const retryCountTotal: any;
export declare const apiRequestDurationSeconds: any;
export declare const queueWaitTimeSeconds: any;
export declare const stuckBuildsTotal: any;
export type AgentResult = any;
export type ExecutionContextState = any;
export type Message = any;
export type LLMConfig = any;
export declare enum JobStage {
    INIT = "INIT",
    PLAN = "PLAN",
    BUILD = "BUILD",
    DEPLOY = "DEPLOY",
    VALIDATE = "VALIDATE",
    EVALUATE = "EVALUATE",
    FAILED = "FAILED"
}
export declare enum MissionStatus {
    PENDING = "PENDING",
    RUNNING = "RUNNING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED"
}
export declare class Queue<T = any> extends BullQueue<T> {
    constructor(name: string, opts?: any);
}
export declare class Worker extends BullWorker {
    constructor(name: string, cb: any, opts?: any);
}
export type Job<T = any> = BullJob<T>;
export declare const getSafeEnv: (input: any, def?: string) => any;
export declare const watchdog: any;
export declare const StrategyConfig: any;
export declare const patchEngine: any;
export declare class SemanticCacheService {
    get(): Promise<null>;
    set(): Promise<void>;
}
export declare const previewManager: any;
export interface Mission {
    id: string;
    status: string;
    projectId?: string;
    previewId?: string;
    runtimeVersion?: string;
    executionId?: string;
    userId?: string;
    previewUrl?: string;
    restartDisabled?: boolean;
    ports?: any;
    pids?: any;
    [key: string]: any;
}
export interface BaseTask {
    id: string;
    type: string;
    [key: string]: any;
}
export interface JobPayload {
    id: string;
    [key: string]: any;
}
export interface Metadata {
    userId: string;
    [key: string]: any;
}
export type TaskGraph = any;
export type BuildEvent = any;
declare const bridge: any;
export default bridge;
//# sourceMappingURL=server.d.ts.map
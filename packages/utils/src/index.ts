/**
 * @packages/utils
 */
export const QUEUE_FREE = 'free-tier';
export const QUEUE_PRO = 'pro-tier';

export * from './server.js';
export * from './policy.js';
export * as research from './policy-research.js';
export * from './vfs-lock.js';
export * from './lifecycle.js';
export * from './health.js';
export * from './middleware/security.js';
export * from './context.js';
export * from './request-context.js';
export * from './audit.js';
export * from './idempotency.js';
export * from './errors.js';
export * from './side-effect-journal.js';
export * from './control-plane.js';
export * from './validation.js';
export * from './build-cache.js';
export * from './global-sync.js';
export { supabaseAdmin } from './server.js';
export * from './certification.js';
export * from './confidence-engine.js';
export * from './llm.js';
export * from './recovery-history.js';
export * from './governance-ledger.js';
export * from './canonicalizer.js';
export * from './rehearsal.js';
export * from './chaos.js';
export * from './transparency/gossip-registry.js';
export * from './transparency/equivocation-detector.js';
export * from './transparency/witness-federation.js';
export * from './transparency/merkle.js';
export {
    PreviewServerManager,
    runtimeStartupDuration,
    runtimeCrashesTotal,
    runtimeActiveTotal,
    runtimeProxyErrorsTotal,
    getSafeEnv, patchVerifier,
    previewManager,
    BaseAgent,
    ResumeAgent,
    runtimeEvictionsTotal,
    RuntimeCapacity,
    RuntimeHeartbeat,
    nodeMemoryUsage,
    nodeCpuUsage,
    RuntimeMetrics,
    ReliabilityMonitor,
    ProcessManager,
    ContainerManager,
    PortManager,
    ArtifactValidator,
    createActivities,
    connection,
    runPipeline,
    updatePipeline,
    deployPipeline,
    rateLimitMiddleware,
    createBreaker,
    createBackpressureMiddleware,
    createOutboundClient,
    kafkaManager,
    ThresholdBls,
    Canonical,
    DatabaseAgent,
    BackendAgent,
    FrontendAgent,
    DeploymentAgent,
    SecurityAgent,
    MonitoringAgent,
    SaaSMonetizationAgent,
    PlannerAgent,
    ResearchAgent,
    DebugAgent,
    ArchitectureAgent,
    RankingAgent,
    RepairAgent,
    VirtualFileSystem,
    Worker,
    Job,
    Queue,
    QUEUE_VALIDATE,
    QUEUE_ARCH,
    dockerQueue,
    repairQueue,
    CriticAgent,
    subscriber,
    env,
    RedisRecovery,
    NodeRegistry,
    FailoverManager,
    WorkerClusterManager,
    BuildGraphEngine,
    EvolutionManager,
    queueWaitTimeSeconds,
    stuckBuildsTotal,
    runWithTracing,
    PreviewOrchestrator,
    RuntimeCleanup,
    plannerQueue,
    architectureQueue,
    generatorQueue,
    validatorQueue,
    deployQueue,
    retryCountTotal,
    PreviewWatchdog,
    QUEUE_DOCKER,
    QUEUE_SUPERVISOR,
    QUEUE_REFACTOR,
    QUEUE_EVOLUTION,
    TenantService,
    InfraProvisioner,
    CICDManager,
    CommitManager,
    BlueprintManager,
    IS_PRODUCTION,
    SLOService,
    SandboxPodController,
    QUEUE_PLANNER,
    QUEUE_GENERATOR,
    QUEUE_META,
    QUEUE_REPAIR,
    supervisorQueue,
    ANALYTICS_QUEUE,
    QUEUE_BILLING,
    QUEUE_PATTERN,
    QUEUE_ROLLBACK,
    QUEUE_SELF_MODIFICATION,
    QUEUE_STRATEGY,
    QUEUE_EVALUATION,
    usageService,
    supervisorService
} from './mocks.js';
export type { RuntimeRecord, ManagedContainer, AgentResult, ExecutionContextType } from './mocks.js';

export const QUEUE_DEPLOY = 'deploy-queue';

export type JobPayload = Record<string, any> & {
    missionId?: string;
    taskId?: string;
    executionId?: string;
    projectId?: string;
};
export const JobPayload = {} as any;

export { HSMVault, HSMErrorCode } from './hsm-vault.js';
export type { HSMAttestation, HSMState } from './hsm-vault.js';

import bridge from './server.js';


export default bridge;
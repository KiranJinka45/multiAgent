// Server-only entry point to avoid leaking Node.js deps to browser
export { env, getSafeEnv } from './config/env';
export { logger, getExecutionLogger } from './config/logger';
export { getCorrelationId, runWithTracing } from './config/tracing';
export { withObservability } from './config/api-wrapper';
export { 
    registry, 
    stripeWebhookEventsTotal, 
    apiRequestDurationSeconds, 
    workerTaskDurationSeconds, 
    queueLengthGauge,
    activeBuildsGauge,
    queueWaitTimeSeconds,
    stuckBuildsTotal,
    executionSuccessTotal,
    executionFailureTotal
} from './config/metrics';
export { redis, default as redisClient, DEPLOYMENT_QUEUE } from './services/redis';
export { eventBus } from './services/event-bus';
export { projectMemory } from './services/project-memory';
export { projectService } from './services/project-service';
export { stateManager as stateManagerService } from './services/state-manager';
export { missionController } from './services/mission-controller';
export { commandGateway } from './services/command-gateway';
export { patchEngine, PatchEngine } from './services/patch-engine';
export { supervisorService } from './services/supervisor';
export { stripe, STRIPE_CONFIG, createPortalSession } from './config/billing';
export { PreviewManager } from './services/preview-manager';
export { patchVerifier } from './services/patch-verifier';
export { DistributedExecutionContext } from './services/execution-context';
export { memoryPlane } from './services/memory-plane';
export { RateLimiter } from './config/rate-limiter';
export { TenantService } from './services/tenant-service';
export { AuditLogger } from './services/audit-logger';
export { CostGovernanceService, DEFAULT_GOVERNANCE_CONFIG } from './config/governance';
export { VirtualFileSystem } from './services/vfs';
export { CommitManager } from './services/vfs/commit-manager';
export { StrategyEngine } from './strategy-engine';
export { ProjectGenerationSchema } from './config/schemas';
export { supabaseAdmin, getSupabaseAdmin } from './services/supabase-admin';
export { freeQueue, proQueue, QUEUE_FREE, QUEUE_PRO } from './services/build-queue';
export { usageService } from './services/usage-service';
export { InfraProvisioner } from './services/devops/infra-provisioner';
export { CICDManager } from './services/devops/cicd-manager';
export * from './types';
export * from './types';

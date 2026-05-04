"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployWorker = void 0;
// @ts-nocheck
const utils_1 = require("@packages/utils");
const utils_2 = require("@packages/utils");
const observability_1 = require("@packages/observability");
const db_1 = require("@packages/db");
const utils_3 = require("@packages/utils");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
if (!utils_2.QUEUE_DEPLOY)
    throw new Error("FATAL: QUEUE_DEPLOY name must be provided");
const logPath = path_1.default.join(process.cwd(), 'deploy_worker.log');
const log = (msg) => {
    const timestamp = new Date().toISOString();
    try {
        fs_1.default.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
    }
    catch (e) { }
};
exports.deployWorker = new utils_1.Worker(utils_2.QUEUE_DEPLOY, async (job) => {
    const { projectId, executionId, previewUrl, agentId, config } = job.data;
    if (agentId) {
        // --- ASYNC AGENT PROVISIONING PATH ---
        log(`[AgentDeploy] Job received for agent:${agentId}`);
        try {
            await db_1.db.agent.update({
                where: { id: agentId },
                data: { status: 'busy', lastActive: new Date() }
            });
            // Simulate provisioning steps
            await new Promise(r => setTimeout(r, 2000));
            await db_1.db.agent.update({
                where: { id: agentId },
                data: { status: 'standby', lastActive: new Date() }
            });
            log(`[AgentDeploy] Agent ${agentId} is now online.`);
            // Signal completion to the mesh
            await utils_2.eventBus.publish(agentId, 'agent_provisioned', {
                agentId,
                status: 'standby',
                message: `Agent ${agentId} is ready for deployment.`
            });
            return { success: true };
        }
        catch (error) {
            log(`[AgentDeploy] ERROR for agent:${agentId}: ${error}`);
            await db_1.db.agent.update({
                where: { id: agentId },
                data: { status: 'offline' }
            }).catch(() => { });
            await utils_2.eventBus.publish(agentId, 'agent_failed', {
                agentId,
                status: 'offline',
                error: error.message || 'Provisioning failed'
            });
            throw error;
        }
    }
    const sandboxDir = path_1.default.join(process.cwd(), '.generated-projects', projectId || 'unknown');
    log(`[Deploy] Job received for ${executionId}`);
    observability_1.logger.info({ projectId, executionId }, '[Deploy Worker] Finalizing Deployment');
    try {
        await utils_2.eventBus.stage(executionId, 'cicd', 'in_progress', 'Deployment Agent: Finalizing project lifecycle...', 95);
        const context = new utils_3.DistributedExecutionContext(executionId);
        const data = await context.get();
        const allFiles = data?.finalFiles || [];
        const intent = data?.metadata?.intent;
        // 1. Initialize Project Memory
        await utils_3.projectMemory.initializeMemory(projectId, { framework: intent?.templateId || 'nextjs', styling: 'tailwind', backend: 'api-routes', database: 'supabase' }, allFiles);
        // 2. Provision Infrastructure (Production)
        const tenant = await utils_3.TenantService.getTenantForUser(data?.userId || 'unknown');
        if (tenant && utils_2.IS_PRODUCTION) {
            log('[Deploy Worker] Production Mode: Provisioning resources...');
            const infra = await utils_3.InfraProvisioner.provisionResources(projectId, tenant.plan);
            await utils_3.CICDManager.setupPipeline(projectId, sandboxDir, intent?.templateId || 'nextjs');
            await context.atomicUpdate(ctx => {
                ctx.metadata.infra = infra;
                ctx.metadata.deploymentStatus = 'deployed';
            });
        }
        else {
            log('[Deploy Worker] Dev Mode: Skipping infrastructure provisioning');
        }
        // 3. Finalize Status
        await context.atomicUpdate(ctx => {
            ctx.status = 'completed';
            ctx.locked = true;
        });
        await utils_2.eventBus.stage(executionId, 'deployment', 'completed', 'Build success! Preview online.', 100);
        await utils_2.eventBus.complete(executionId, previewUrl, {
            taskCount: allFiles.length,
            autonomousCycles: 1
        });
        const mem = process.memoryUsage();
        const memMb = Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100;
        log(`[Deploy] Memory usage: ${memMb} MB (Heap Used)`);
        observability_1.logger.info({ executionId, memoryMb: memMb }, '[Deploy Worker] Memory Usage');
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`[Deploy] ERROR: ${errorMessage}`);
        observability_1.logger.error({ error, executionId }, '[Deploy Worker] Failed');
        const context = new utils_3.DistributedExecutionContext(executionId);
        await context.atomicUpdate(ctx => {
            ctx.status = 'failed';
            ctx.agentResults['DeployAgent'] = {
                agentName: 'DeployAgent',
                status: 'failed',
                error: errorMessage,
                attempts: (ctx.agentResults['DeployAgent']?.attempts || 0) + 1,
                startTime: new Date().toISOString()
            };
        });
        await utils_2.eventBus.error(executionId, `Deployment Error: ${errorMessage}`);
        throw error;
    }
}, {
    connection: utils_2.redis,
    concurrency: 5
});
log(`Deployment Worker online. Redis: ${utils_2.redis.options.port}`);
observability_1.logger.info('Deployment Worker online');
setInterval(() => {
    const mem = process.memoryUsage();
    const memMb = Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100;
    log(`Heartbeat... Memory: ${memMb} MB`);
}, 30000);
new Promise(() => { });
//# sourceMappingURL=deploy-worker.js.map
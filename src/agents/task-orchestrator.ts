import { PlannerAgent } from './planner-agent';
import { DatabaseAgent } from './database-agent';
import { BackendAgent } from './backend-agent';
import { FrontendAgent } from './frontend-agent';
import { DeploymentAgent } from './deployment-agent';
import { TestingAgent } from './testing-agent';
import { TaskGraph, TaskExecutor } from '../lib/task-engine';
import { agentRegistry } from '../lib/task-engine/agent-registry';
import { VirtualFileSystem, PatchEngine, CommitManager, RollbackManager } from '../lib/vfs';
import { DiffUtils } from '../lib/vfs/diff-utils';
import { patchVerifier } from '../lib/patch-verifier';
import { projectService } from '../lib/project-service';
import { projectMemory } from '../lib/project-memory';
import { DistributedExecutionContext } from '../lib/execution-context';
import { TenantService } from '../lib/tenant-service';
import { InfraProvisioner } from '../lib/devops/infra-provisioner';
import { CICDManager } from '../lib/devops/cicd-manager';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import logger, { getExecutionLogger } from '../lib/logger';
import path from 'path';

// Pre-register agents for the Execution Engine
agentRegistry.register('DatabaseAgent', new DatabaseAgent());
agentRegistry.register('BackendAgent', new BackendAgent());
agentRegistry.register('FrontendAgent', new FrontendAgent());
agentRegistry.register('DeploymentAgent', new DeploymentAgent());
agentRegistry.register('TestingAgent', new TestingAgent());

export class TaskOrchestrator {
    private plannerAgent = new PlannerAgent();
    private taskExecutor = new TaskExecutor();
    private rollbackManager = new RollbackManager();

    async run(prompt: string, userId: string, projectId: string, executionId: string, signal: AbortSignal) {
        const context = new DistributedExecutionContext(executionId);
        const elog = getExecutionLogger(executionId);
        const sandboxDir = path.join(process.cwd(), '.sandboxes', projectId);

        try {
            await context.init(userId, projectId, prompt, executionId);
            elog.info('Starting Multi-Agent Build Pipeline (SaaS Platform Edition)');

            // ── 0. Multi-Tenant: Quota Check ─────────────────────────────
            const tenant = await TenantService.getTenantForUser(userId);
            if (!tenant) {
                throw new Error('No active tenant found for user. Please set up an organization.');
            }

            const hasQuota = await TenantService.checkQuota(tenant.id);
            if (!hasQuota) {
                throw new Error(`Quota Exceeded: Your plan (${tenant.plan}) has reached its monthly AI token limit.`);
            }
            elog.info({ tenantId: tenant.id, plan: tenant.plan }, 'Tenant quota verified.');

            // ── 1. Planning Phase (Task Graph Generation) ─────────────────
            elog.info('Decomposing prompt via PlannerAgent...');
            const planResult = await this.plannerAgent.execute({ prompt }, {} as any);

            if (!planResult.success || !planResult.data) {
                throw new Error('PlannerAgent failed to generate a task graph.');
            }

            const plan = planResult.data;
            const graph = new TaskGraph();

            // Setup SSE tracking (Mocked mapping to legacy stages for UI compatibility)
            // Realistically, the UI would read the dynamic task graph directly.
            const uiStages = ['database', 'backend', 'frontend', 'testing', 'deployment'];
            for (const stage of uiStages) {
                await this.updateLegacyUiStage(executionId, stage, 'pending', 'Waiting for dependencies...');
            }

            for (const step of plan.steps) {
                graph.addTask({
                    id: String(step.id),
                    type: step.agent,
                    title: step.title,
                    description: step.description,
                    dependsOn: step.dependencies.map(String),
                    payload: { prompt, schema: '', allFiles: [] } // Payload will be enriched dynamically via context
                });
            }

            // ── 2. Execution Phase (Multi-Agent Parallel Execution) ───────
            elog.info(`Task Graph built with ${graph.getAllTasks().length} nodes. Initiating Execution Engine...`);

            // We pass the context to the executor so agents can read/write shared context
            await this.taskExecutor.evaluateGraph(graph, {
                getExecutionId: () => executionId,
                get: () => context.get(),
                setAgentResult: (n: string, r: any) => context.setAgentResult(n, r),
                updateUiStage: (stage: string, status: string, msg: string) => this.updateLegacyUiStage(executionId, stage, status, msg)
            });

            // Check if vital tasks failed
            const failedTasks = graph.getAllTasks().filter(t => t.status === 'failed');
            if (failedTasks.length > 0) {
                elog.error({ failedCount: failedTasks.length }, 'Some agents failed their tasks.');
            }

            // ── 3. File System Synchronization (VFS Integration) ──────────
            elog.info('Merging agent outputs into Virtual File System (VFS)...');
            const finalData = await context.get();
            const allFiles: { path: string; content: string }[] = [];

            ['DatabaseAgent', 'BackendAgent', 'FrontendAgent', 'TestingAgent', 'DeploymentAgent'].forEach(agentName => {
                const res = finalData?.agentResults?.[agentName]?.data as any;
                if (res?.files) allFiles.push(...res.files);
            });

            // Map all generated files onto the VFS
            const vfs = new VirtualFileSystem();
            vfs.loadFromDiskState(allFiles); // Start empty, treat everything generated as dirty

            // Create a pre-edit snapshot for safety
            this.rollbackManager.saveSnapshot('pre-verify', vfs);

            // ── 4. Safe Write to Sandbox (CommitManager) ──────────────────
            // We write to sandbox for validation, NOT the final project root yet
            elog.info('Committing to validation sandbox...');
            await CommitManager.commit(vfs, sandboxDir);

            // ── 5. Auto-Healer & Patch Validation ─────────────────────────
            elog.info('Applying predictive verification and Auto-Healer loop...');
            const verification = await patchVerifier.verify(sandboxDir, vfs);

            if (verification.passed) {
                elog.info({ healed: verification.healed }, 'Codebase successfully passed validation bounds!');

                // Generate and record diffs for transparency
                const diffs = DiffUtils.generateDiffs(vfs.getAllFiles(), sandboxDir);
                elog.info({ changeCount: diffs.length }, 'VFS Diff calculation complete.');

                // In a real platform, we might store these diffs for a PR-style review
                await context.atomicUpdate(ctx => {
                    ctx.metadata.diffs = diffs.map(d => ({
                        path: d.path,
                        type: d.type,
                        oldContent: d.oldContent,
                        newContent: d.newContent
                    }));
                });
            } else {
                elog.warn('Validation failed. Rolling back VFS to stable state.');
                this.rollbackManager.rollback('pre-verify', vfs);
                // Optionally: prevent CommitManager from writing anything further
            }

            // ── 6. Preview Container Isolation ────────────────────────────
            elog.info('Containerizing output for preview router...');
            let previewUrl = 'http://localhost:3001';
            try {
                const manager = require('../lib/preview-manager');
                const flushedFiles = await projectService.getProjectFiles(projectId, supabaseAdmin);
                previewUrl = await manager.previewManager.launchPreview(projectId, flushedFiles || allFiles);
            } catch (e) {
                elog.warn('Preview manager sandbox failed fallback isolation route.');
            }

            // ── 7. Finalization ───────────────────────────────────────────
            await context.atomicUpdate(ctx => {
                ctx.status = 'completed';
                ctx.locked = true;
                ctx.finalFiles = allFiles;
                ctx.metadata.previewUrl = previewUrl;
            });

            // Initialize Project Memory for future chat editing!
            await projectMemory.initializeMemory(
                projectId,
                { framework: plan.techStack.framework, styling: plan.techStack.styling, backend: plan.techStack.backend, database: plan.techStack.database },
                allFiles
            );

            await this.updateLegacyUiStage(executionId, 'deployment', 'completed', 'Project ready!', 100);

            // ── 7. Autonomous AI DevOps Phase ─────────────────────────────
            elog.info('Initiating Autonomous DevOps pipeline...');
            try {
                // 7a. Provision Infrastructure
                const infra = await InfraProvisioner.provisionResources(projectId, tenant.plan);
                elog.info({ deploymentUrl: infra.deploymentUrl }, 'Production infrastructure provisioned.');

                // 7b. Setup CI/CD
                const workflowFiles = await CICDManager.setupPipeline(projectId, sandboxDir, plan.techStack.framework);
                elog.info({ workflowCount: workflowFiles.length }, 'CI/CD pipelines injected into repository.');

                await context.atomicUpdate(ctx => {
                    ctx.metadata.infra = infra;
                    ctx.metadata.deploymentStatus = 'deployed';
                });
            } catch (e) {
                elog.warn({ error: e }, 'DevOps pipeline encountered a non-fatal error.');
            }

            // ── 8. Multi-Tenant: Record Usage ─────────────────────────────
            // Rough estimation: 1000 tokens per agent task + base cost
            const taskCount = graph.getAllTasks().length;
            const estimatedTokens = (taskCount * 2500) + 5000;
            await TenantService.recordTokenUsage(tenant.id, estimatedTokens);
            elog.info({ tokens: estimatedTokens }, 'Resource usage recorded.');

            elog.info('Pipeline Complete. App generated successfully.');
            return {
                success: true,
                files: allFiles,
                previewUrl
            };

        } catch (error) {
            elog.error({ error }, 'Fatal orchestration breakdown.');
            await context.atomicUpdate(ctx => { ctx.status = 'failed'; });
            throw error;
        }
    }

    private async updateLegacyUiStage(executionId: string, stageId: string, status: string, message: string, progress = 0) {
        // Pseudo-method bridging the gap between dynamic graphs and legacy frontend stages
        try {
            const redis = require('../lib/redis').default;
            const state = JSON.parse(await redis.get(`build:state:${executionId}`) || '{}');
            state.stages = state.stages || {};
            state.stages[stageId] = { id: stageId, status, message, progressPercent: progress };
            await redis.setex(`build:state:${executionId}`, 86400, JSON.stringify(state));

            // Trigger SSE via Supabase/Redis channel if configured
            const pusher = require('../lib/pusher');
            pusher.triggerBuildUpdate(executionId, state.stages[stageId]);
        } catch (e) { }
    }
}

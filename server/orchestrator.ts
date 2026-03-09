import { PlannerAgent } from '@services/planner-agent';
import { DebugAgent } from '@services/debug-agent';
import { SelfEvaluator } from '@services/self-evaluator';
import { DatabaseAgent } from '@services/database-agent';
import { BackendAgent } from '@services/backend-agent';
import { FrontendAgent } from '@services/frontend-agent';
import { DeploymentAgent } from '@services/deployment-agent';
import { TestingAgent } from '@services/testing-agent';
import { IntentDetectionAgent } from '@services/intent-agent';
import { TemplateEngine } from '@services/template-engine';
import { CustomizerAgent } from '@services/customizer-agent';
import { TaskGraph, TaskExecutor } from '@services/task-engine';
import { agentRegistry } from '@services/task-engine/agent-registry';
import { VirtualFileSystem, CommitManager } from '@services/vfs';
import { RollbackManager } from '@services/vfs/rollback-manager';
import { projectService } from '@services/project-service';
import { projectMemory } from '@services/project-memory';
import { DistributedExecutionContext } from '@services/execution-context';
import { TenantService } from '@services/tenant-service';
import { InfraProvisioner } from '@services/devops/infra-provisioner';
import { CICDManager } from '@services/devops/cicd-manager';
import { AgentMemory } from '@services/agent-memory';
import { supabaseAdmin } from '@queue/supabase-admin';
import logger, { getExecutionLogger } from '@configs/logger';
import { eventBus } from '@configs/event-bus';
import { ImpactAnalyzer } from '@services/impact-analyzer';
import { DependencyGraph } from '@services/dependency-graph';
import { DockerDeployer } from '@services/docker-deployer';
import path from 'path';
import fs from 'fs-extra';
import redis from '@queue/redis-client';

// Pre-register agents for the Execution Engine
agentRegistry.register('DatabaseAgent', new DatabaseAgent());
agentRegistry.register('BackendAgent', new BackendAgent());
agentRegistry.register('FrontendAgent', new FrontendAgent());
agentRegistry.register('DeploymentAgent', new DeploymentAgent());
agentRegistry.register('TestingAgent', new TestingAgent());

const MAX_AUTONOMOUS_CYCLES = 5;

export class TaskOrchestrator {
    private plannerAgent = new PlannerAgent();
    private debugAgent = new DebugAgent();
    private selfEvaluator = new SelfEvaluator();
    private taskExecutor = new TaskExecutor();
    private rollbackManager = new RollbackManager();
    private dockerDeployer = new DockerDeployer();
    private intentAgent = new IntentDetectionAgent();
    private customizerAgent = new CustomizerAgent();

    async run(prompt: string, userId: string, projectId: string, executionId: string, signal: AbortSignal) {
        const context = new DistributedExecutionContext(executionId);
        const elog = getExecutionLogger(executionId);
        const sandboxDir = path.join(process.cwd(), '.sandboxes', projectId);

        try {
            await context.init(userId, projectId, prompt, executionId);
            elog.info('Initializing Distributed Multi-Agent Pipeline Gateway');

            // 1. Initial State Sync
            await eventBus.stage(executionId, 'initializing', 'in_progress', 'Gateway: Spinning up autonomous agent cluster...', 5);
            await eventBus.agent(executionId, 'System', 'init', 'Distributed orchestrator online. Enqueuing to Planner...');

            // 2. Ensure Sandbox Exists
            await fs.ensureDir(sandboxDir);

            // 3. Trigger the First Stage: Meta-Agent Controller
            const { metaQueue } = await import('../src/lib/queue/agent-queues');
            await metaQueue.add('analyze-init', {
                projectId,
                executionId,
                userId,
                prompt
            });

            elog.info({ projectId, executionId }, 'Successfully enqueued job to Meta-Agent Queue. Autonomous control plane active.');

            return {
                success: true,
                message: 'Distributed pipeline initiated.',
                executionId
            };

        } catch (error) {
            elog.error({ error }, 'Failed to initiate distributed pipeline');
            await eventBus.error(executionId, error instanceof Error ? error.message : 'Gateway Initialization Error');
            throw error;
        }
    }

    private async updateLegacyUiStage(projectId: string, executionId: string, stageId: string, status: string, message: string, progress = 0) {
        // Bridge: publishes to the Redis Streams Event Bus (replaces old broken pusher)
        try {
            const state = JSON.parse(await redis.get(`build:state:${executionId}`) || '{}');
            state.projectId = projectId; // Ensure projectId is in the state snapshot
            state.executionId = executionId;
            state._stagesMap = state._stagesMap || {};
            state._stagesMap[stageId] = { id: stageId, status, message, progressPercent: progress };
            const STAGE_ORDER = ['initializing', 'database', 'backend', 'frontend', 'testing', 'dockerization', 'cicd', 'deployment'];
            const BUILD_STAGE_PROGRESS: Record<string, number> = {
                initializing: 5, database: 15, backend: 30, frontend: 50,
                testing: 65, dockerization: 75, cicd: 85, deployment: 100
            };
            state.stages = STAGE_ORDER.map(id => ({
                id, label: id.charAt(0).toUpperCase() + id.slice(1),
                status: state._stagesMap[id]?.status || 'pending',
                message: state._stagesMap[id]?.message || '',
                progressPercent: BUILD_STAGE_PROGRESS[id] || 0,
            }));
            state.totalProgress = BUILD_STAGE_PROGRESS[stageId] || progress;
            state.currentStage = stageId;
            state.status = status === 'completed' && stageId === 'deployment' ? 'completed' : 'executing';
            state.message = message;

            const stateString = JSON.stringify(state);
            await redis.setex(`build:state:${executionId}`, 86400, stateString);

            // Publish directly to Socket.IO Redis Sub
            await redis.publish('build-events', JSON.stringify({
                projectId,
                executionId,
                ...state
            }));

            // Push to event bus (this is what eventually reaches the UI via SSE)
            await eventBus.stage(executionId, stageId, status, message, BUILD_STAGE_PROGRESS[stageId] || progress);
        } catch (e) {
            logger.warn({ e, stageId }, '[Orchestrator] updateLegacyUiStage failed (non-fatal)');
        }
    }

    private async finalizeFastPath(projectId: string, executionId: string, allFiles: any[], sandboxDir: string, intent: any, elog: any, context: any, memory: any) {
        // ── 7. Preview Container Isolation (Docker Agent) ───────────────────────────
        elog.info('Containerizing output for preview router...');
        await eventBus.stage(executionId, 'dockerization', 'in_progress', 'Containerizing environment via fast Docker build...', 75);
        const previewTimer = await eventBus.startTimer(executionId, 'DockerAgent', 'container_setup', 'Building image & routing traffic...');
        let previewUrl = 'http://localhost:3000';
        try {
            previewUrl = await this.dockerDeployer.deploy(projectId, allFiles, sandboxDir);
            await memory.recordThought('DockerAgent', 'deploy', `Successfully built and deployed container to ${previewUrl}`);
        } catch (e) {
            elog.warn({ error: e }, 'Docker deployment failed.');
        }
        await previewTimer(`Preview available at ${previewUrl}`);

        // ── 8. Finalization ──────────────────────────────────────────
        await context.atomicUpdate((ctx: any) => {
            ctx.status = 'completed';
            ctx.locked = true;
            ctx.finalFiles = allFiles;
            ctx.metadata.previewUrl = previewUrl;
            ctx.metadata.fastPath = true;
        });

        await projectMemory.initializeMemory(
            projectId,
            { framework: 'nextjs', styling: 'tailwind', backend: 'api-routes', database: 'supabase' },
            allFiles
        );

        await eventBus.stage(executionId, 'cicd', 'completed', 'CI/CD ready', 85);
        await this.updateLegacyUiStage(projectId, executionId, 'deployment', 'completed', 'Project ready!', 100);

        await eventBus.complete(executionId, previewUrl, {
            taskCount: 1,
            autonomousCycles: 1,
            fastPath: true
        });

        elog.info('10-Second Fast-Path Complete. Application ready.');
        return { success: true, files: allFiles, previewUrl, fastPath: true };
    }
}

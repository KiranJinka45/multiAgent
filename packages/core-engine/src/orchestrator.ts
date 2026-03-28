import { PlannerAgent, TaskPlan, TaskStep } from '@packages/brain/planner-agent';
import { DebugAgent } from '@packages/brain/debug-agent';
import { CoderAgent } from '@packages/brain/coder-agent';
import { DatabaseAgent } from '@packages/brain/database-agent';
import { BackendAgent } from '@packages/brain/backend-agent';
import { FrontendAgent } from '@packages/brain/frontend-agent';
import { DeploymentAgent } from '@packages/brain/deploy-agent';
import { TestingAgent } from '@packages/brain/testing-agent';
import { IntentDetectionAgent } from '@packages/brain/intent-agent';
import { ResearchAgent } from '@packages/brain/research-agent';
import { RepairAgent } from '@packages/brain/repair-agent';
import { HealingAgent } from '@packages/brain/healing-agent';
import { TaskGraph, TaskExecutor, BuildWatchdog } from './task-engine';
import { agentRegistry } from './task-engine/agent-registry';
import { 
    projectMemory, 
    eventBus, 
    memoryPlane, 
    DistributedExecutionContext, 
    ErrorKnowledgeBase, 
    logger, 
    getExecutionLogger, 
    DockerDeployer,
    freeQueue,
    missionController,
    KnowledgeService,
    templateService,
    guardrailService,
    patchEngine,
    RateLimiter,
    StrategyEngine,
    StrategyConfig,
    redis
} from '@packages/utils/server';
type ExecutionLogger = ReturnType<typeof getExecutionLogger>;

import path from 'path';
import * as fs from 'fs-extra';
import { runtimeExecutor } from '@packages/runtime/executor';
import { ArchitectureAgent } from '@packages/brain/architecture-agent';
import { PreviewRegistry } from '@packages/registry';
import { swarmCoordinator } from './task-engine/swarm-coordinator';
import { RankingAgent } from '@packages/brain/ranking-agent';
import { ExecutionResult, JobStage } from '@packages/contracts';
import { RuntimeScheduler } from '@packages/runtime/cluster/runtimeScheduler';
import { ArtifactValidator } from '@packages/validator';
import { AgentMemory } from '@packages/agents';
import { db } from '@packages/db';

async function trackEvent(type: string, metadata: any) {
    try {
        await db.event.create({
            data: { type, metadata: metadata || {} }
        });
    } catch (err) {
        logger.error({ err, type }, '[Orchestrator] Failed to track event');
    }
}

// Pre-register agents for the Execution Engine
agentRegistry.register('DatabaseAgent', new DatabaseAgent());
agentRegistry.register('RankingAgent', new RankingAgent());
agentRegistry.register('BackendAgent', new BackendAgent());
agentRegistry.register('FrontendAgent', new FrontendAgent());
agentRegistry.register('DeploymentAgent', new DeploymentAgent());
agentRegistry.register('TestingAgent', new TestingAgent());
agentRegistry.register('ArchitectureAgent', new ArchitectureAgent());
agentRegistry.register('CoderAgent', new CoderAgent());
agentRegistry.register('DebugAgent', new DebugAgent());
agentRegistry.register('PlannerAgent', new PlannerAgent());
agentRegistry.register('ResearchAgent', new ResearchAgent());
agentRegistry.register('RepairAgent', new RepairAgent());
agentRegistry.register('HealingAgent', new HealingAgent());





export enum StageState {
    IDLE = 'IDLE',
    RUNNING = 'RUNNING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED'
}

export class StageStateMachine {
    private currentStage: JobStage = JobStage.PLAN;
    private currentState: StageState = StageState.IDLE;
    private executionId: string;
    private projectId: string;

    constructor(executionId: string, projectId: string) {
        this.executionId = executionId;
        this.projectId = projectId;
    }

    async transition(stage: JobStage, state: StageState, message: string, progress: number) {
        this.currentStage = stage;
        this.currentState = state;
        
        logger.info({ executionId: this.executionId, stage, state, message }, `[StageStateMachine] Transitioning to ${stage}:${state}`);
        
        const uiStatus = state === StageState.RUNNING ? 'in_progress' : 
                         state === StageState.COMPLETED ? 'completed' : 
                         state === StageState.FAILED ? 'failed' : 'pending';

        // Emit to event bus
        await eventBus.stage(this.executionId, stage.toLowerCase(), uiStatus, message, progress, this.projectId);
    }

    getStage() { return this.currentStage; }
    getState() { return this.currentState; }
}

const MAX_BUILD_RUNTIME = 10 * 60 * 1000; 

export class Orchestrator {
    private plannerAgent = new PlannerAgent();
    private researchAgent = new ResearchAgent();
    private architectureAgent = new ArchitectureAgent();
    private debugAgent = new DebugAgent();
    private intentAgent = new IntentDetectionAgent();
    private repairAgent = new RepairAgent();
    private dockerDeployer = new DockerDeployer();
    private timeoutId: NodeJS.Timeout | null = null;

    async run(taskPrompt: string, userId: string, projectId: string, executionId: string, signal: AbortSignal, options: { isFastPreview?: boolean } = {}): Promise<ExecutionResult> {
        const elog = getExecutionLogger(executionId);
        const sandboxDir = path.join(process.cwd(), '.generated-projects', projectId);
        
        // --- 0. Global Build Timeout (Master Fix) ---
        this.timeoutId = setTimeout(async () => {
            elog.error(`GLOBAL_BUILD_TIMEOUT: Pipeline forcefully stopped after ${MAX_BUILD_RUNTIME/1000}s`);
            await missionController.updateMission(executionId, { status: 'failed' });
            await eventBus.agent(executionId, 'System', 'timeout', 'Pipeline timed out (10m limit)', projectId);
            // Optionally trigger a cleanup or stop workers here
        }, MAX_BUILD_RUNTIME);

        // Reliability Upgrade: Record build start
        await ReliabilityMonitor.recordStart();

        try {
            elog.info('Initializing Distributed Multi-Agent Pipeline Gateway');

            // 1. Initial State Sync
            await stateManager.transition(executionId, 'created', 'Autonomous cluster initialized. Preparing planner...', 5, projectId);
            await missionController.updateMission(executionId, { status: 'init' });
            await eventBus.agent(executionId, 'System', 'init', 'Distributed orchestrator online. Enqueuing to Planner...', projectId);

            // 2. Ensure Sandbox Exists
            await fs.ensureDir(sandboxDir);

            // 3. Trigger the Central Orchestrator Pipeline
            const jobData = {
                projectId,
                executionId,
                userId,
                prompt: taskPrompt,
                isFastPreview: options.isFastPreview ?? true 
            };

            // NEW: Explicitly create mission if it doesn't exist
            await missionController.createMission({
                id: executionId,
                projectId,
                userId,
                prompt: taskPrompt,
                status: 'init',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                metadata: { isFastPreview: options.isFastPreview ?? true }
            });

            await freeQueue.add('build-init', jobData);

            elog.info({ projectId, executionId }, 'Successfully created mission and enqueued job.');

            return {
                success: true,
                message: 'Distributed pipeline initiated.',
                executionId,
                error: undefined
            };

        } catch (error) {
            elog.error({ error }, 'Failed to initiate distributed pipeline');
            const errorMsg = error instanceof Error ? error.message : String(error);
            await eventBus.error(executionId, errorMsg, projectId);
            return {
                success: false,
                message: 'Failed to initiate distributed pipeline',
                executionId,
                error: errorMsg
            };
        }
    }

    async execute(taskPrompt: string, userId: string, projectId: string, executionId: string, signal: AbortSignal, options: { isFastPreview?: boolean, isSpeculative?: boolean } = {}): Promise<ExecutionResult> {
        console.log(`[DEBUG] Orchestrator.execute started for ${executionId}`);
        const context = new DistributedExecutionContext(executionId);
        const elog = getExecutionLogger(executionId);
        const sandboxDir = path.join(process.cwd(), '.generated-projects', projectId);
        const memory = await AgentMemory.create(executionId);
        
        const fsm = new StageStateMachine(executionId, projectId);
        await trackEvent('build_started', { projectId, userId, executionId });

        try {
            // Check for existing context to enable resume
            const existing = await context.get();
            if (existing) {
                elog.info('Resuming autonomous execution from existing context');
                await context.sync();
            } else {
                await context.init(userId, projectId, taskPrompt, executionId);
                // Propagate options to metadata for persistence
                if (options.isFastPreview) {
                    await context.atomicUpdate(ctx => {
                        const c = (ctx as unknown) as Record<string, unknown>;
                        const metadata = (c.metadata as Record<string, unknown>) || {};
                        metadata.isFastPreview = true;
                        c.metadata = metadata;
                    });
                }
                elog.info('Autonomous Execution Engine: Starting build locally on worker');
            }

            // 0. Swarm Activation (Devin-Level Autonomy)
            await swarmCoordinator.supervise(executionId, projectId);
            await eventBus.agent(executionId, 'SwarmCoordinator', 'supervision_active', 'Mission supervision initialized. Reactive coordination enabled.', projectId);
            
            // Activate High-Performance Speculative Mode if requested
            if (options.isSpeculative) {
                await eventBus.agent(executionId, 'SwarmCoordinator', 'speculative_mode', 'Speculative Parallel Development engaged. Multi-agent competition active.', projectId);
            }

            // 0. MVP Lean Path Detection
            const meta = (await context.get())?.metadata || {};
            const isFastPath = options.isFastPreview === true || meta.isFastPreview === true || meta.fastPath === true;

            // 1. Research & Knowledge Retrieval
            let findings: ResearchFindings | undefined = (await context.get())?.metadata?.findings as ResearchFindings;
            let augmentedPrompt = taskPrompt;

            if (!findings && !isFastPath) {
                await fsm.transition(JobStage.PLAN, StageState.RUNNING, 'Analyzing requirements & architectural patterns...', 5);
                
                await missionController.updateMission(executionId, { status: 'planning' });
                augmentedPrompt = await KnowledgeService.augmentPrompt(taskPrompt, projectId);
                
                const researchResult = await this.researchAgent.execute({ prompt: augmentedPrompt }, context, signal);
                if (researchResult.success) {
                    findings = researchResult.data;
                    await context.atomicUpdate(ctx => {
                        const c = (ctx as unknown) as Record<string, unknown>;
                        const metadata = (c.metadata as Record<string, unknown>) || {};
                        metadata.findings = findings;
                        metadata.augmentedPrompt = augmentedPrompt;
                        c.metadata = metadata;
                    });
                }
            }

            // 2. Planning & Architecture
            let plan: TaskPlan | undefined = (await context.get())?.metadata?.plan as TaskPlan;
            if (!plan) {
                await fsm.transition(JobStage.GENERATE_CODE, StageState.RUNNING, 'Defining technical blueprint & project structure...', 10);
                
                let strategy: StrategyConfig | undefined = undefined;
                if (!isFastPath) {
                    strategy = await StrategyEngine.getOptimalStrategy('PlannerAgent', 'comprehensive_planning');
                }

                const archResult = await this.withTimeout(
                    this.architectureAgent.execute({ prompt: augmentedPrompt }, context, signal, strategy),
                    180000,
                    'ArchitectureAgent execution timed out'
                );
                
                if (archResult.success) {
                    await context.atomicUpdate(ctx => { ctx.metadata.architecture = archResult.data; });
                    await fsm.transition(JobStage.GENERATE_CODE, StageState.COMPLETED, 'Architecture defined.', 15);
                }

                await fsm.transition(JobStage.PLAN, StageState.RUNNING, 'Generating task graph and plan...', 15);
                await missionController.updateMission(executionId, { status: 'planning' });
                
                const planResult = await this.withTimeout(
                    this.plannerAgent.execute({ prompt: augmentedPrompt }, context, signal),
                    180000,
                    'PlannerAgent execution timed out'
                );

                if (!planResult.success) {
                    await fsm.transition(JobStage.PLAN, StageState.FAILED, `Planning failed: ${planResult.error}`, 15);
                    throw new Error(planResult.error || 'Planning failed');
                }
                
                plan = planResult.data;
                const templateName = this.detectTemplate(taskPrompt, plan.templateId);
                await templateService.injectTemplate(templateName, context);
                
                await context.atomicUpdate(ctx => {
                    ctx.metadata.plan = plan;
                    ctx.metadata.techStack = plan.techStack;
                });
                
                await fsm.transition(JobStage.PLAN, StageState.COMPLETED, `Plan ready: ${plan.projectName}. Total steps: ${plan.steps?.length || 0}`, 20);
            } else {
                if (!context.getVFS().getFile('package.json')) {
                    elog.info('[Resume] Injecting template because package.json is missing from VFS.');
                    const templateName = this.detectTemplate(taskPrompt, plan.templateId);
                    await templateService.injectTemplate(templateName, context);
                }
            }

            // 3. Task Graph Execution
            const graph = new TaskGraph();
            const taskExecutor = new TaskExecutor();

            plan.steps?.forEach((step: TaskStep) => {
                const existingResult = context.agentResults[step.agent];
                graph.addTask({
                    id: String(step.id),
                    title: step.title,
                    type: step.agent,
                    dependsOn: step.dependencies.map(String),
                    inputs: step.inputs,
                    outputs: step.outputs,
                    payload: { 
                        prompt: augmentedPrompt, 
                        stepDescription: step.description, 
                        fileTargets: step.fileTargets,
                        isPatch: step.isPatch,
                        section: step.section
                    },
                    description: step.description,
                    status: existingResult?.status === 'completed' ? 'completed' : 'waiting'
                });
            });

            await fsm.transition(JobStage.GENERATE_CODE, StageState.RUNNING, 'Coordinating multi-agent swarm...', 20);
            await missionController.updateMission(executionId, { status: 'executing' });

            // --- 4. Watchdog Integration ---
            const watchdog = new BuildWatchdog(graph, executionId, projectId, 20000); // Strict 20s progress detection
            watchdog.start();

            const MAX_BUILD_RUNTIME = 600000; // 10 minutes global generation timeout (God-Mode)

            try {
                await this.withTimeout(
                    taskExecutor.evaluateGraph(graph, context),
                    MAX_BUILD_RUNTIME,
                    'ULTIMATE_TIMEOUT: Generation stage exceeded 10-minute global limit. Aborting pipeline.'
                );
                
                await fsm.transition(JobStage.GENERATE_CODE, StageState.COMPLETED, 'Generation complete.', 40);
            } catch (err) {
                await fsm.transition(JobStage.GENERATE_CODE, StageState.FAILED, `Generation failure: ${err instanceof Error ? err.message : String(err)}`, 40);
                throw err;
            } finally {
                watchdog.stop();
            }

            // 3. Verification & Finalization
            const allFiles = context.getVFS().getAllFiles();
            return await this.finalizeFastPath(taskPrompt, projectId, executionId, userId, allFiles, sandboxDir, plan, elog, context, memory, isFastPath, fsm);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            await trackEvent('build_failed', { projectId, executionId, error: errorMsg });
            elog.error({ error: errorMsg }, 'Autonomous execution failed');
            await eventBus.error(executionId, errorMsg, projectId);
            return { success: false, executionId, error: errorMsg };
        } finally {
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
                this.timeoutId = null;
            }
        }
    }

    private async updateLegacyUiStage(projectId: string, executionId: string, stageId: string, status: string, message: string, progress = 0, extras?: { previewUrl?: string; isPreviewReady?: boolean; previewPort?: number; files?: { path: string; content?: string }[] }) {
        // Bridge: publishes to the Redis Streams Event Bus (replaces old broken pusher)
        try {
            const state = JSON.parse(await redis.get(`build:state:${executionId}`) || '{}');
            state.projectId = projectId; // Ensure projectId is in the state snapshot
            state.executionId = executionId;
            state._stagesMap = state._stagesMap || {};
            state._stagesMap[stageId] = { id: stageId, status, message, progressPercent: progress };
            const STAGE_ORDER = ['planning', 'generating', 'patching', 'building', 'deployment'];
            const BUILD_STAGE_PROGRESS: Record<string, number> = {
                planning: 15, generating: 40, patching: 60, building: 80, deployment: 95
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
            
            // NEW: Inject VFS snapshot if available
            const files = extras?.files || [];
            if (files.length > 0) {
                state.files = files;
            }

            // Propagate preview data when available (critical for UI)
            if (extras?.previewUrl) {
                state.previewUrl = extras.previewUrl;
                state.isPreviewReady = true;
                state.previewPort = extras.previewPort;
            }

            const stateString = JSON.stringify(state);
            await redis.setex(`build:state:${executionId}`, 86400, stateString);

            // Publish directly to Socket.IO Redis Sub
            await redis.publish('build-events', JSON.stringify({
                projectId,
                executionId,
                ...state
            }));

            // Push to event bus (this is what eventually reaches the UI via SSE)
            await eventBus.stage(executionId, stageId, status, message, BUILD_STAGE_PROGRESS[stageId] || progress, projectId, files);
        } catch (e) {
            logger.warn({ e, stageId }, '[Orchestrator] updateLegacyUiStage failed (non-fatal)');
        }
    }

    private async finalizeFastPath(taskPrompt: string, projectId: string, executionId: string, userId: string, allFiles: { path: string, content: string }[], sandboxDir: string, intent: TaskPlan, elog: ExecutionLogger, context: DistributedExecutionContext, memory: AgentMemory, isFastPath: boolean, fsm: StageStateMachine): Promise<ExecutionResult> {
        // --- 6.5. Apply Guardrails ---
        await fsm.transition(JobStage.WRITE_ARTIFACTS, StageState.RUNNING, 'Applying reliability guardrails and sanitizing output...', 45);
        const originalFilesMap: Record<string, string> = (await context.get())?.metadata?.files as Record<string, string> || {};
        
        const validation = await this.withTimeout(
            Promise.resolve(guardrailService.validateOutput(allFiles, originalFilesMap)),
            300000, // 30s
            'Guardrail stage timed out'
        );
        
        const safeFiles = validation.sanitizedFiles;
        allFiles.splice(0, allFiles.length, ...safeFiles);

        // --- 6.6. Parallel File Persistence ---
        await fsm.transition(JobStage.WRITE_ARTIFACTS, StageState.RUNNING, 'Writing files to build sandbox...', 50);
        await Promise.all(allFiles.map(async (file) => {
            const fullPath = path.join(sandboxDir, file.path);
            const isNew = !(await fs.pathExists(fullPath));
            await fs.ensureDir(path.dirname(fullPath));
            await fs.writeFile(fullPath, file.content);
            
            await eventBus.agent(executionId, 'CoderAgent', isNew ? 'file.created' : 'file.updated', `${file.path} persists`, projectId);
        }));

        // ── 7. Build Runner Isolation (NPM & Environment) ───────────────────────────
        await fsm.transition(JobStage.WRITE_ARTIFACTS, StageState.RUNNING, 'Resolving dependencies in sandbox...', 60);
        await missionController.updateMission(executionId, { status: 'assembling' });
        
        let installSuccessful = false;
        if (isFastPath) {
            try {
                const templateName = intent.techStack?.framework === 'nextjs' ? 'nextjs-saas-premium' : 'nextjs-saas-premium';
                const masterNodeModules = path.join(process.cwd(), 'templates', templateName, 'node_modules');
                const targetNodeModules = path.join(sandboxDir, 'node_modules');

                if (await fs.pathExists(masterNodeModules)) {
                    await fs.symlink(masterNodeModules, targetNodeModules, 'junction');
                    installSuccessful = true;
                }
            } catch (linkErr) {
                elog.warn({ linkErr }, '[MVP] Fast-Path: Linking failed, falling back to fresh install.');
            }
        }

        if (!installSuccessful) {
            const installResult = await runtimeExecutor.execute('npm', ['install', '--no-audit', '--no-fund'], {
                cwd: sandboxDir,
                executionId,
                timeoutMs: 120000
            });
            installSuccessful = installResult.success;
        }
        
        if (!installSuccessful) {
            await fsm.transition(JobStage.WRITE_ARTIFACTS, StageState.FAILED, 'NPM install failed', 60);
            throw new Error('NPM install failed');
        }

        // ── 7.2. Autonomous Validation & Healing ───────────────────────────────
        await fsm.transition(JobStage.WRITE_ARTIFACTS, StageState.RUNNING, 'Running autonomous build validation & healing cycles...', 70);
        const buildSuccess = await this.withTimeout(
            this.validateAndHeal(projectId, executionId, sandboxDir, allFiles, elog, fsm),
            300000, 
            'Autonomous Build/Healing stage timed out'
        );
        
        if (!buildSuccess) {
            await fsm.transition(JobStage.WRITE_ARTIFACTS, StageState.FAILED, 'Build validation failed after multiple healing attempts.', 80);
        } else {
            await fsm.transition(JobStage.WRITE_ARTIFACTS, StageState.COMPLETED, 'Project validated and build successful.', 85);
        }

        // --- PHASE 2: VALIDATE ARTIFACTS GATE ---
        await fsm.transition(JobStage.VALIDATE_ARTIFACTS, StageState.RUNNING, 'Strict artifact validation in progress...', 86);
        const validationResult = await ArtifactValidator.validate(projectId);
        if (!validationResult.valid) {
            const error = `Artifact validation failed: Missing ${validationResult.missingFiles?.join(', ') || 'critical files'}`;
            await fsm.transition(JobStage.VALIDATE_ARTIFACTS, StageState.FAILED, error, 86);
            return { success: false, executionId, error };
        }
        await fsm.transition(JobStage.VALIDATE_ARTIFACTS, StageState.COMPLETED, 'Artifact integrity verified.', 88);

        // ── 7.5. Deployment / Preview
        await fsm.transition(JobStage.START_PREVIEW, StageState.RUNNING, 'Allocating isolated runtime container...', 90);
        await missionController.updateMission(executionId, { status: 'previewing' });

        // Explicitly trigger preview scheduling BEFORE waiting
        logger.info({ projectId, executionId }, '[Orchestrator] Scheduling preview runtime...');
        await RuntimeScheduler.schedule({
            projectId,
            executionId,
            userId: userId || 'unknown',
            requestedAt: new Date().toISOString()
        }).catch(err => {
            logger.error({ err, projectId }, '[Orchestrator] Failed to schedule preview runtime');
        });

        const reg = await PreviewRegistry.get(projectId);
        const pid = reg?.previewId;
        const previewUrl = `/preview/${pid || projectId}${reg?.accessToken ? `?token=${reg.accessToken}` : ''}`;
        
        await fsm.transition(JobStage.HEALTH_CHECK, StageState.RUNNING, 'Waiting for preview environment to become healthy...', 92);
        
        const previewReady = await this.withTimeout(
            this.waitForPreviewReady(projectId),
            60000, // 60s
            'Preview runtime failed to start'
        ).catch(() => false);

        if (!previewReady) {
            await fsm.transition(JobStage.HEALTH_CHECK, StageState.FAILED, 'Preview health check failed (Connection Refused).', 95);
            return { success: false, executionId, error: 'Preview environment unhealthy' };
        }
        await fsm.transition(JobStage.HEALTH_CHECK, StageState.COMPLETED, 'Preview environment is healthy.', 97);

        await fsm.transition(JobStage.REGISTER_PREVIEW, StageState.RUNNING, 'Finalizing deployment registration...', 98);
        // Ensure registry is updated one last time with RUNNING status if not already
        await PreviewRegistry.update(projectId, { status: 'RUNNING' });
        await fsm.transition(JobStage.REGISTER_PREVIEW, StageState.COMPLETED, 'Deployment registered successfully.', 99);

        // ── 8. Finalization ──────────────────────────────────────────
        await fsm.transition(JobStage.COMPLETE, StageState.COMPLETED, 'Project ready! Visit preview to see your site.', 100);
        
        await context.atomicUpdate((ctx: unknown) => {
            const c = ctx as Record<string, unknown>;
            c.status = 'completed';
            c.locked = true;
            c.finalFiles = allFiles;
            c.metadata = (c.metadata as Record<string, unknown>) || {};
            (c.metadata as Record<string, unknown>).previewUrl = previewUrl;
            (c.metadata as Record<string, unknown>).fastPath = true;
        });

        await projectMemory.initializeMemory(projectId, { 
            framework: 'nextjs', 
            styling: 'tailwind',
            backend: 'api-routes',
            database: 'supabase'
        }, allFiles);

        const metrics = context.metrics;
        await eventBus.complete(executionId, previewUrl, {
            taskCount: 1,
            autonomousCycles: 1,
            fastPath: true,
            tokensTotal: metrics.tokensTotal || 0,
            durationMs: Date.now() - new Date(metrics.startTime).getTime()
        }, projectId);

        await trackEvent('build_success', { 
            projectId, 
            executionId, 
            durationMs: Date.now() - new Date(metrics.startTime).getTime() 
        });

        return { success: true, executionId, files: allFiles, previewUrl, fastPath: true };
    }

    /**
     * Autonomous Self-Healing Loop
     * Detects build errors, repairs code, and retries.
     */
    private async validateAndHeal(projectId: string, executionId: string, sandboxDir: string, allFiles: { path: string, content: string }[], elog: ExecutionLogger, fsm: StageStateMachine) {
        const MAX_RETRIES = 3;
        let currentRetry = 0;
        let buildHealthy = false;

        while (currentRetry <= MAX_RETRIES && !buildHealthy) {
            const attemptLabel = currentRetry === 0 ? 'Initial Validation' : `Repair Attempt ${currentRetry}`;
            await fsm.transition(JobStage.WRITE_ARTIFACTS, StageState.RUNNING, `${attemptLabel}: Checking build stability...`, 72);
            await missionController.updateMission(executionId, { status: 'building' });

            // 1. Run Build Validation
            const buildResult = await runtimeExecutor.execute('npm', ['run', 'build'], {
                cwd: sandboxDir,
                executionId,
                timeoutMs: 180000
            });

            if (buildResult.success) {
                buildHealthy = true;
                elog.info('Build validation passed.');
                
                // Record recovery success
                await memoryPlane.recordLesson(projectId, {
                    action: 'Self-Healing Build',
                    outcome: 'success',
                    lesson: `Resolved build error on attempt ${currentRetry}`,
                    context: { executionId, retryCount: currentRetry }
                });

                break;
            }

            // 2. Engage Repair Flow
            const errorContext = buildResult.stderr || buildResult.error || 'Unknown build failure';
            elog.warn({ error: errorContext.substring(0, 200) }, 'Build failed. Initiating self-healing...');

            await eventBus.stage(executionId, 'repairing', 'in_progress', 'Repairing project build autonomously...', 73, projectId);
            await missionController.updateMission(executionId, { status: 'repairing' });

            // 2a. Attempt FIRST-TIER HEALING (Phase 13: Fast Pattern Matching)
            const healingResult = await HealingAgent.diagnoseAndFix({
                projectId,
                errorLogs: errorContext,
                lastAction: 'npm run build',
                filePath: 'unknown'
            });

            if (healingResult.fixed) {
                elog.info({ explanation: healingResult.explanation }, '[Orchestrator] First-tier healing successful. Applying fix...');
                await HealingAgent.applyFix(projectId, healingResult);
                currentRetry++;
                continue; // Retry the build with the fix
            }

            // 2b. Fallback to DEEP REPAIR (LLM-based)
            let solution = await ErrorKnowledgeBase.getSolution(errorContext);

            // 2b. If No Cache, Run Repair Agent
            if (!solution) {
                const repairResponse = await this.repairAgent.execute({
                    stderr: errorContext,
                    stdout: buildResult.stdout,
                    files: allFiles,
                    command: 'npm run build'
                }, {} as unknown as DistributedExecutionContext);

                if (repairResponse.success) {
                    solution = repairResponse.data;
                }
            }

            if (solution && (solution.patches?.length > 0 || solution.missingDependencies?.length > 0)) {
                elog.info({ 
                    patches: solution.patches?.length, 
                    deps: solution.missingDependencies?.length 
                }, 'Applying autonomous repairs...');

                // Apply dependencies
                if (solution.missingDependencies?.length > 0) {
                    await runtimeExecutor.execute('npm', ['install', ...solution.missingDependencies], { cwd: sandboxDir, executionId });
                }

                // Apply patches to disk
                for (const patch of solution.patches) {
                    const fullPath = path.join(sandboxDir, patch.path);
                    const isNew = !(await fs.pathExists(fullPath));
                    await fs.ensureDir(path.dirname(fullPath));

                    const existingFile = allFiles.find(f => f.path === patch.path);
                    let finalContent = patch.content;

                    if (patch.anchor && existingFile) {
                        finalContent = patchEngine.applyAnchorPatch(existingFile.content, patch.anchor, patch.content);
                    }

                    await fs.writeFile(fullPath, finalContent);

                    // Granular Activity Logging (Service 3 Requirement)
                    const eventType = isNew ? 'file.created' : 'file.updated';
                    await eventBus.agent(executionId, 'RepairAgent', eventType, `[Repair] ${patch.path} ${isNew ? 'created' : 'updated'}`, projectId);

                    // Update memory for next verification
                    if (existingFile) {
                        existingFile.content = finalContent;
                    } else {
                        allFiles.push({ path: patch.path, content: finalContent });
                    }
                }

                // Record solution if this was a fresh fix
                await ErrorKnowledgeBase.recordSolution(errorContext, solution);
            } else {
                elog.error('Repair Agent could not determine a fix.');
                break;
            }

            currentRetry++;
        }

        return buildHealthy;
    }
    private detectTemplate(prompt: string, plannerSuggestion?: string): string {
        const p = prompt.toLowerCase();
        
        // Priority 1: User explicit request in prompt
        // nextjs-admin-v1 doesn't physically exist yet, map to saas-premium
        if (p.includes('dashboard') || p.includes('admin') || p.includes('crm')) return 'nextjs-saas-premium';
        if (p.includes('landing') || p.includes('waitlist') || p.includes('portfolio')) return 'nextjs-landing-v1';
        if (p.includes('saas') || p.includes('product') || p.includes('subscription')) return 'nextjs-saas-premium';
        
        // Priority 2: Planner suggestion
        if (plannerSuggestion === 'nextjs-admin-v1') return 'nextjs-saas-premium';
        if (plannerSuggestion === 'nextjs-landing-v1') return 'nextjs-landing-v1';
        if (plannerSuggestion === 'nextjs-saas-premium') return 'nextjs-saas-premium';
        
        return 'nextjs-saas-premium';
    }

    private async withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
        let timeoutHandle: NodeJS.Timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(() => reject(new Error(errorMessage)), ms);
        });

        try {
            return await Promise.race([promise, timeoutPromise]);
        } finally {
            if (timeoutHandle) clearTimeout(timeoutHandle);
        }
    }

    /**
     * Polls Preview Registry and performs HTTP Health Checks until successful.
     * Retries up to 20 times (Service 2 constraint).
     */
    private async waitForPreviewReady(projectId: string): Promise<boolean> {
        const MAX_RETRIES = 60; // 3 minutes total with 3s interval
        const RETRY_INTERVAL = 3000;

        for (let i = 0; i < MAX_RETRIES; i++) {
            const currentReg = await PreviewRegistry.get(projectId);
            
            if (currentReg?.status === 'RUNNING') {
                logger.info({ projectId, attempt: i + 1 }, '[Orchestrator] Sandbox reported RUNNING. Health check passed at runtime layer.');
                return true;
            }

            if (currentReg?.status === 'FAILED') {
                logger.error({ projectId, reason: currentReg.failureReason }, '[Orchestrator] Sandbox failed at runtime layer.');
                return false;
            }

            logger.debug({ projectId, status: currentReg?.status, attempt: i + 1 }, '[Orchestrator] Waiting for sandbox RUNNING status...');
            await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
        }
        return false;
    }
}

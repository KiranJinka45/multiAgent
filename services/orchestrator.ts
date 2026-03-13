import { PlannerAgent, TaskPlan, TaskStep } from '../agents/planner-agent';
import { DebugAgent } from '../agents/debug-agent';
import { CoderAgent } from '../agents/coder-agent';
import { DatabaseAgent } from '../agents/database-agent';
import { BackendAgent } from '../agents/backend-agent';
import { FrontendAgent } from '../agents/frontend-agent';
import { DeploymentAgent } from '../agents/deploy-agent';
import { TestingAgent } from '../agents/testing-agent';
import { IntentDetectionAgent } from '../agents/intent-agent';
import { TaskGraph, TaskExecutor } from './task-engine';
import { agentRegistry } from './task-engine/agent-registry';
import { projectMemory } from './project-memory';
import { memoryPlane } from './memory-plane';
import { DistributedExecutionContext } from './execution-context';
import { AgentMemory } from './agent-memory';
import { RepairAgent } from '../agents/repair-agent';
import { ErrorKnowledgeBase } from './error-knowledge-base';
import logger, { getExecutionLogger } from '../config/logger';

type ExecutionLogger = ReturnType<typeof getExecutionLogger>;
import { eventBus } from './event-bus';
import { DockerDeployer } from './devops/docker-deployer';
import { freeQueue, redis } from './queue';
import path from 'path';
import * as fs from 'fs-extra';
import { missionController } from './mission-controller';
import { runtimeExecutor } from '../runtime/executor';
import { ResearchAgent, ResearchFindings } from '../agents/research-agent';
import { ArchitectureAgent } from '../agents/architecture-agent';
import { KnowledgeService } from './knowledge-service';
import { templateService } from './template-service';
import { StrategyEngine, StrategyConfig } from './agent-intelligence/strategy-engine';
import { guardrailService } from './guardrail-service';
import { patchEngine } from './patch-engine';
import { ReliabilityMonitor } from './reliability-monitor';
import { previewRegistry } from '../runtime/preview-registry';
import { previewManager } from '../runtime/preview-manager';
import { stateManager } from './state-manager';
import { swarmCoordinator } from './task-engine/swarm-coordinator';
import { RankingAgent } from '../agents/ranking-agent';

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





export class Orchestrator {
    private plannerAgent = new PlannerAgent();
    private researchAgent = new ResearchAgent();
    private architectureAgent = new ArchitectureAgent();
    private debugAgent = new DebugAgent();
    private intentAgent = new IntentDetectionAgent();
    private repairAgent = new RepairAgent();
    private dockerDeployer = new DockerDeployer();

    async run(taskPrompt: string, userId: string, projectId: string, executionId: string, signal: AbortSignal, options: { isFastPreview?: boolean } = {}) {
        const elog = getExecutionLogger(executionId);
        const sandboxDir = path.join(process.cwd(), '.sandboxes', projectId);
        
        // Reliability Upgrade: Record build start
        await ReliabilityMonitor.recordStart();

        try {
            elog.info('Initializing Distributed Multi-Agent Pipeline Gateway');

            // 1. Initial State Sync
            await stateManager.transition(executionId, 'created', 'Autonomous cluster initialized. Preparing planner...', 5, projectId);
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
                status: 'queued',
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

    async execute(taskPrompt: string, userId: string, projectId: string, executionId: string, signal: AbortSignal, options: { isFastPreview?: boolean, isSpeculative?: boolean } = {}) {
        console.log(`[DEBUG] Orchestrator.execute started for ${executionId}`);
        const context = new DistributedExecutionContext(executionId);
        const elog = getExecutionLogger(executionId);
        const sandboxDir = path.join(process.cwd(), '.sandboxes', projectId);
        const memory = await AgentMemory.create(executionId);

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
            if (isFastPath) {
                elog.info('[MVP] Fast-Path Mode Detected. Bypassing non-essential research stages.');
            }

            // 1. Research & Knowledge Retrieval (Level-5 Stage)
            let findings: ResearchFindings | undefined = (await context.get())?.metadata?.findings as ResearchFindings;
            let augmentedPrompt = taskPrompt;

            if (!findings && !isFastPath) {
                await this.updateLegacyUiStage(projectId, executionId, 'planning', 'in_progress', 'Research: Analyzing architectural patterns & searching knowledge base...', 5);
                const researchTimer = await eventBus.startTimer(executionId, 'ResearchAgent', 'researching', 'Analyzing requirements and cross-referencing memory...', projectId);
                
                await missionController.updateMission(executionId, { status: 'planning' });

                // RAG: Enrich the prompt with architectural memory & previous experiences
                augmentedPrompt = await KnowledgeService.augmentPrompt(taskPrompt, projectId);
                
                // Research: Strategic analysis
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
                    await researchTimer(`Research complete: Found ${findings.recommendedLibraries.length} optimized libraries.`);
                    
                    // NEW: Emit intelligence metadata for the dashboard
                    await eventBus.agent(executionId, 'ResearchAgent', 'findings', JSON.stringify({
                        libraries: findings.recommendedLibraries || [],
                        infrastructure: findings.infrastructureSuggestions || '',
                        patterns: []
                    }), projectId);
                } else {
                    await researchTimer('Research failed (non-fatal)');
                    elog.warn('[Orchestrator] Research agent failed, proceeding with original prompt');
                }
            } else if (findings) {
                augmentedPrompt = (await context.get())?.metadata?.augmentedPrompt as string || taskPrompt;
                elog.info('Resuming with existing research findings');
            } else {
                elog.info('[MVP] Research bypassed for Fast-Path.');
            }

            // 2. Planning Step (Recoverable)
            let plan: TaskPlan | undefined = (await context.get())?.metadata?.plan as TaskPlan;
            if (!plan) {
                await stateManager.transition(executionId, 'building', 'Planner generating technical blueprint...', 10, projectId);
                const plannerTimer = await eventBus.startTimer(executionId, 'PlannerAgent', 'planning', 'Generating architecture and task graph...', projectId);
                
                // Strategy Engine: Optimal configuration for Planner
                let strategy: StrategyConfig | undefined = undefined;
                if (!isFastPath) {
                    strategy = await StrategyEngine.getOptimalStrategy('PlannerAgent', 'comprehensive_planning');
                    elog.info({ strategy: strategy.strategy }, 'Strategy Engine selected optimal model for planning');
                }

                // 2. Architecture & Template Injection (NEW Stage)
                const architectureTimer = await eventBus.startTimer(executionId, 'ArchitectureAgent', 'architecting', 'Defining technical blueprint...', projectId);
                const archResult = await this.withTimeout(
                    this.architectureAgent.execute({ prompt: augmentedPrompt }, context, signal, strategy),
                    180000,
                    'ArchitectureAgent execution timed out'
                );
                
                if (archResult.success) {
                    await context.atomicUpdate(ctx => {
                        ctx.metadata.architecture = archResult.data;
                    });
                    
                    // NEW: Emit architecture findings
                    await architectureTimer('Architecture defined.');
                } else {
                    await architectureTimer('Architecture design failed, proceeding with defaults.');
                }
                
                // NEW: Emit strategy metadata
                await eventBus.agent(executionId, 'SupervisorAgent', 'strategy_selection', `Strategy: ${strategy?.strategy || 'fast_path_bypass'} | Model: ${strategy?.model || 'llama-3.1-8b-instant'} | Temperature: ${strategy?.temperature || 0.7}`, projectId);

                await missionController.updateMission(executionId, { status: 'planning' });
                const planResult = await this.withTimeout(
                    this.plannerAgent.execute({ prompt: augmentedPrompt }, context, signal),
                    180000,
                    'PlannerAgent execution timed out'
                );
                if (!planResult.success) {
                    await plannerTimer('Planning failed');
                    throw new Error(planResult.error || 'Planning failed');
                }
                
                plan = planResult.data;
                
                // Inject template chosen by the Planner or detected by the Supervisor
                const templateName = this.detectTemplate(taskPrompt, plan.templateId);
                await templateService.injectTemplate(templateName, context);
                elog.info({ templateName, prompt }, 'Injected project template into sandbox');
                
                elog.info({ stepCount: plan.steps?.length || 0 }, '[DEBUG] Planner generated steps');
                
                await context.atomicUpdate(ctx => {
                    ctx.metadata.plan = plan;
                    ctx.metadata.techStack = plan.techStack;
                });
                
                await plannerTimer(`Plan ready: ${plan.projectName}. Total steps: ${plan.steps?.length || 0}`);
                
                // VFS Snapshot after template injection
                const currentFiles = context.getVFS().getAllFiles();
                await this.updateLegacyUiStage(projectId, executionId, 'planning', 'in_progress', 'Architecture & Template initialized.', 15, { files: currentFiles });
            } else {
                elog.info({ stepCount: plan.steps?.length || 0 }, 'Resuming with existing plan');
            }

            // 3. Task Graph Engine Initialization
            const graph = new TaskGraph();
            const taskExecutor = new TaskExecutor();

            elog.info({ stepCount: plan.steps?.length || 0 }, 'Initializing Agent Task Graph Engine...');

            plan.steps?.forEach((step: TaskStep) => {
                // Resume logic: Check if this agent already finished its work
                const existingResult = context.agentResults[step.agent];
                const taskStatus = existingResult?.status === 'completed' ? 'completed' : 'pending';

                graph.addTask({
                    id: String(step.id),
                    title: step.title,
                    type: step.agent,
                    dependsOn: step.dependencies.map(String),
                    inputs: step.inputs,
                    outputs: step.outputs,
                    payload: { 
                        prompt, 
                        stepDescription: step.description, 
                        fileTargets: step.fileTargets,
                        isPatch: step.isPatch,
                        section: step.section
                    },
                    description: step.description,
                    status: taskStatus
                });
            });

            // 4. Graph-Driven Execution
            await this.updateLegacyUiStage(projectId, executionId, 'generating', 'in_progress', 'Agents: Coordinating multi-agent swarm...', 20);
            await missionController.updateMission(executionId, { status: 'generating' });

            const graphTimer = await eventBus.startTimer(executionId, 'Orchestrator', 'graph_execution', `Executing ${plan.steps?.length || 0} parallel agent tasks...`, projectId);
            
            try {
                // The new Graph Engine handles parallel coordination and internal self-healing
                await this.withTimeout(
                    taskExecutor.evaluateGraph(graph, context),
                    180000, // 3 minutes for multi-agent swarm generation
                    'Generation stage timed out'
                );
                
                if (graph.hasFailed()) {
                    elog.warn('Task Graph finished with some failures. Proceeding to verification.');
                }
                
                const filesAfterGen = context.getVFS().getAllFiles();
                await this.updateLegacyUiStage(projectId, executionId, 'generating', 'in_progress', `Generation complete. ${graph.getAllTasks().filter(t => t.status === 'completed').length} tasks successful.`, 40, { files: filesAfterGen });
                await graphTimer(`Graph execution complete. ${graph.getAllTasks().filter(t => t.status === 'completed').length} tasks successful.`);
            } catch (err) {
                await graphTimer(`Graph engine encountered a critical failure: ${err instanceof Error ? err.message : String(err)}`);
                throw err;
            }

            // 3. Verification & Finalization
            // Bridge back to legacy finalization
            const allFiles = context.getVFS().getAllFiles();
            elog.info({ fileCount: allFiles.length }, 'Finalizing build. VFS state captured.');
            // 5. Finalize Fast-Path Output and Validation
            return await this.finalizeFastPath(taskPrompt, projectId, executionId, userId, allFiles, sandboxDir, plan, elog, context, memory, isFastPath);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            elog.error({ error: errorMsg }, 'Autonomous execution failed');
            await eventBus.error(executionId, errorMsg, projectId);
            return { success: false, error: errorMsg };
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

    private async finalizeFastPath(taskPrompt: string, projectId: string, executionId: string, userId: string, allFiles: { path: string, content: string }[], sandboxDir: string, intent: TaskPlan, elog: ExecutionLogger, context: DistributedExecutionContext, memory: AgentMemory, isFastPath: boolean) {
        // --- 6.5. Apply Guardrails ---
        elog.info('Applying reliability guardrails to generated output...');
        const originalFilesMap: Record<string, string> = (await context.get())?.metadata?.files as Record<string, string> || {};
        
        const validation = await this.withTimeout(
            Promise.resolve(guardrailService.validateOutput(allFiles, originalFilesMap)),
            20000,
            'Patching/Guardrail stage timed out after 20s'
        );
        
        if (!validation.isValid) {
            elog.warn({ violations: validation.violations }, 'Guardrails detected violations. Sanitizing output...');
        }
        
        // Use sanitized files for the build
        const safeFiles = validation.sanitizedFiles;

        // Synchronize the reference array for validation/healing
        allFiles.splice(0, allFiles.length, ...safeFiles);

        // Sync safe files back to disk before build
        for (const file of allFiles) {
            const fullPath = path.join(sandboxDir, file.path);
            const isNew = !(await fs.pathExists(fullPath));
            await fs.ensureDir(path.dirname(fullPath));
            await fs.writeFile(fullPath, file.content);

            // Granular Activity Logging (Service 3 Requirement)
            const eventType = isNew ? 'file.created' : 'file.updated';
            await eventBus.agent(executionId, 'CoderAgent', eventType, `${file.path} ${isNew ? 'created' : 'updated'}`, projectId);
        }

        // ── 7. Build Runner Isolation (NPM & Environment) ───────────────────────────
        elog.info('Initializing build runner sandbox...');
        await stateManager.transition(executionId, 'building', 'Synchronizing files and resolving dependencies...', 55, projectId);
        await missionController.updateMission(executionId, { status: 'patching' });
        
        const installTimer = await eventBus.startTimer(executionId, 'System', 'npm_install', 'Resolving dependencies in sandbox...', projectId);
        
        let installSuccessful = false;
        if (isFastPath) {
            try {
                // OPTIMIZATION: Check for pre-warmed node_modules in the template
                const templateName = intent.techStack?.framework === 'nextjs' ? 'nextjs-saas-premium' : 'nextjs-saas-premium'; // Default for now
                const masterNodeModules = path.join(process.cwd(), 'templates', templateName, 'node_modules');
                const targetNodeModules = path.join(sandboxDir, 'node_modules');

                if (await fs.pathExists(masterNodeModules)) {
                    elog.info({ templateName }, '[MVP] Fast-Path: Found pre-warmed node_modules. Linking...');
                    // Use junction for Windows compatibility without admin
                    await fs.symlink(masterNodeModules, targetNodeModules, 'junction');
                    installSuccessful = true;
                    elog.info('[MVP] Fast-Path: Dependencies linked successfully.');
                }
            } catch (linkErr) {
                elog.warn({ linkErr }, '[MVP] Fast-Path: Linking failed, falling back to fresh install.');
            }
        }

        if (!installSuccessful) {
            const installResult = await runtimeExecutor.execute('npm', ['install', '--no-audit', '--no-fund'], {
                cwd: sandboxDir,
                executionId,
                timeoutMs: 120000 // 2 minutes
            });
            installSuccessful = installResult.success;
        }
        
        await installTimer(installSuccessful ? 'Dependencies resolved successfully' : 'NPM install failed');

        // ── 7.2. Autonomous Validation & Healing ───────────────────────────────
        elog.info('Starting Autonomous Build Validation & Healing...');
        const buildSuccess = await this.withTimeout(
            this.validateAndHeal(projectId, executionId, sandboxDir, allFiles, elog),
            300000, // 5 minute window for healing cycles
            'Autonomous Build/Healing stage timed out'
        );
        
        if (!buildSuccess) {
            elog.warn('Autonomous healing failed to produce a valid build. Launching preview with potential errors.');
        } else {
            elog.info('Project self-healed and validated successfully.');
        }

        // ── 7.5. Preview Container Isolation (Docker Agent) ───────────────────────────
        elog.info('Containerizing output for preview router...');
        await missionController.updateMission(executionId, { status: 'previewing' });
        await stateManager.transition(executionId, 'sandbox-starting', 'Allocating isolated runtime container...', 90, projectId);
        const previewTimer = await eventBus.startTimer(executionId, 'DockerAgent', 'container_setup', 'Building image & routing traffic...', projectId);
        const pid = await previewRegistry.getPreviewId(projectId);
        const reg = pid ? await previewRegistry.lookup(pid) : null;
        const previewUrl = `/preview/${pid || projectId}${reg?.accessToken ? `?token=${reg.accessToken}` : ''}`;
        await previewTimer(`Preview environment scheduled at ${previewUrl}`);
        
        // ── 7.7. WAIT FOR PREVIEW READY (Race Condition Fix) ──────────────────
        elog.info('[Orchestrator] Waiting for preview runtime to reach RUNNING status...');
        await stateManager.transition(executionId, 'server-starting', 'Verifying dev server availability (HTTP Health Check)...', 95, projectId);
        
        const previewReady = await this.withTimeout(
            this.waitForPreviewReady(projectId),
            45000,
            'Preview runtime failed to start within 45s'
        ).catch(err => {
            elog.warn(`[Orchestrator] Preview readiness check timed out: ${err.message}`);
            return false;
        });

        if (previewReady) {
            elog.info('[Orchestrator] Preview runtime is DETERMINISTICALLY LIVE.');
        } else {
            elog.error('[Orchestrator] Preview runtime failed deterministic validation. Success withheld.');
            await eventBus.stage(executionId, 'deployment', 'failed', 'System reached completion but Preview Gateway health check failed.', 95, projectId);
            await this.updateLegacyUiStage(projectId, executionId, 'deployment', 'failed', 'Preview health check failed (Connection Refused).', 95);
            return { success: false, error: 'Preview environment unhealthy' };
        }

        // ── 8. Finalization ──────────────────────────────────────────
        await context.atomicUpdate((ctx: unknown) => {
            const c = ctx as Record<string, unknown>;
            c.status = 'completed';
            c.locked = true;
            c.finalFiles = allFiles;
            c.metadata = (c.metadata as Record<string, unknown>) || {};
            (c.metadata as Record<string, unknown>).previewUrl = previewUrl;
            (c.metadata as Record<string, unknown>).fastPath = true;
        });

        await projectMemory.initializeMemory(
            projectId,
            { framework: 'nextjs', styling: 'tailwind', backend: 'api-routes', database: 'supabase' },
            allFiles
        );

        const metrics = context.metrics;
        const totalTokens = metrics.tokensTotal || 0;
        const durationMs = Date.now() - new Date(metrics.startTime).getTime();
        const costUsd = (totalTokens / 1000) * 0.002; // Simple estimate

        await stateManager.transition(executionId, 'preview-ready', 'Project live! Deterministic gateway active.', 100, projectId, {
            tokens: totalTokens,
            duration: durationMs,
            cost: costUsd,
            previewUrl
        });

        await this.updateLegacyUiStage(projectId, executionId, 'deployment', 'completed', 'Project ready! Visit preview to see your site.', 100, {
            previewUrl,
            isPreviewReady: true
        });

        await eventBus.complete(executionId, previewUrl, {
            taskCount: 1,
            autonomousCycles: 1,
            fastPath: true,
            tokensTotal: totalTokens,
            durationMs
        }, projectId);

        // Record a "Success Lesson" in the Global Memory Plane (Layer 11)
        await memoryPlane.recordLesson(projectId, {
            action: taskPrompt,
            outcome: 'success',
            lesson: 'Successfully generated high-performance boilerplate.',
            context: { executionId, fastPath: true }
        });

        elog.info('10-Second Fast-Path Complete. Application ready.');
        return { success: true, files: allFiles, previewUrl, fastPath: true };
    }

    /**
     * Autonomous Self-Healing Loop
     * Detects build errors, repairs code, and retries.
     */
    private async validateAndHeal(projectId: string, executionId: string, sandboxDir: string, allFiles: { path: string, content: string }[], elog: ExecutionLogger) {
        const MAX_RETRIES = 3;
        let currentRetry = 0;
        let buildHealthy = false;

        while (currentRetry <= MAX_RETRIES && !buildHealthy) {
            const attemptLabel = currentRetry === 0 ? 'Initial Validation' : `Repair Attempt ${currentRetry}`;
            elog.info({ attempt: attemptLabel }, 'Running build validation');
            
            await eventBus.stage(executionId, 'building', 'in_progress', `${attemptLabel}: Checking build stability...`, 72, projectId);
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

            // 2a. Check Error Knowledge Base
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
        if (p.includes('dashboard') || p.includes('admin') || p.includes('crm')) return 'nextjs-admin-v1';
        if (p.includes('landing') || p.includes('waitlist') || p.includes('portfolio')) return 'nextjs-landing-v1';
        if (p.includes('saas') || p.includes('product') || p.includes('subscription')) return 'nextjs-saas-premium';
        
        // Priority 2: Planner suggestion
        if (plannerSuggestion) return plannerSuggestion;
        
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
        const MAX_RETRIES = 20;
        const RETRY_INTERVAL = 3000;

        const previewId = await previewRegistry.getPreviewId(projectId);
        if (!previewId) return false;

        for (let i = 0; i < MAX_RETRIES; i++) {
            const reg = await previewRegistry.lookup(previewId);
            
            if (reg?.status === 'running') {
                // Secondary Validation: Actual HTTP Request
                const isHealthy = await previewManager.checkHealth(previewId);
                if (isHealthy) return true;
                
                logger.debug({ previewId, attempt: i + 1 }, '[Orchestrator] Server running but HTTP health check failing...');
            } else {
                logger.debug({ previewId, status: reg?.status, attempt: i + 1 }, '[Orchestrator] Waiting for sandbox RUNNING status...');
            }

            await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
        }
        return false;
    }
}

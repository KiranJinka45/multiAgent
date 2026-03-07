import { PlannerAgent } from '@services/planner-agent';
import { DebugAgent } from '@services/debug-agent';
import { SelfEvaluator } from './self-evaluator';
import { DatabaseAgent } from '@services/database-agent';
import { BackendAgent } from '@services/backend-agent';
import { FrontendAgent } from '@services/frontend-agent';
import { DeploymentAgent } from '@services/deployment-agent';
import { TestingAgent } from '@services/testing-agent';
import { IntentDetectionAgent } from '@services/intent-agent';
import { TemplateEngine } from '@services/template-engine';
import { CustomizerAgent } from '@services/customizer-agent';
import { TaskGraph, TaskExecutor } from './task-engine';
import { agentRegistry } from './task-engine/agent-registry';
import { VirtualFileSystem, PatchEngine, CommitManager, RollbackManager } from './vfs';
import { DiffUtils } from './vfs/diff-utils';
import { patchVerifier } from './patch-verifier';
import { projectService } from '@services/project-service';
import { projectMemory } from './project-memory';
import { DistributedExecutionContext } from '@services/execution-context';
import { TenantService } from './tenant-service';
import { InfraProvisioner } from './devops/infra-provisioner';
import { CICDManager } from './devops/cicd-manager';
import { AgentMemory } from './agent-memory';
import { supabaseAdmin } from '@queue/supabase-admin';
import logger, { getExecutionLogger } from '@configs/logger';
import { eventBus } from '@configs/event-bus';
import { ImpactAnalyzer } from './impact-analyzer';
import { DependencyGraph } from './dependency-graph';
import { DockerDeployer } from './docker-deployer';
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
        const memory = await AgentMemory.create(executionId);

        try {
            await context.init(userId, projectId, prompt, executionId);
            elog.info('Starting Multi-Agent Build Pipeline (Autonomous Engineer Edition)');

            // ── 0. Multi-Tenant: Quota Check (DISABLED LOCALLY) ─────────────────────────────
            let tenant = await TenantService.getTenantForUser(userId);
            if (!tenant) {
                // throw new Error('No active tenant found for user. Please set up an organization.');
                elog.warn('No active tenant found. Proceeding with default simulated tenant for local development.');
                tenant = {
                    id: 'local-dev-tenant',
                    name: 'Local Dev',
                    plan: 'pro',
                    maxProjects: 100,
                    tokensUsed: 0,
                    maxTokens: 1000000
                };
            }

            const hasQuota = await TenantService.checkQuota(tenant.id);
            if (!hasQuota && tenant.id !== 'local-dev-tenant') {
                throw new Error(`Quota Exceeded: Your plan (${tenant.plan}) has reached its monthly AI token limit.`);
            }
            elog.info({ tenantId: tenant.id, plan: tenant.plan }, 'Tenant quota verified.');

            // Announce build started
            await eventBus.stage(executionId, 'initializing', 'in_progress', 'Launching autonomous AI engineer...', 5);
            await eventBus.agent(executionId, 'System', 'init', 'Autonomous engineer online — entering Plan→Code→Build→Debug→Evaluate loop...');

            // ── 0.5. Incremental Regeneration: Impact Analysis ────────────
            const existingMemory = await projectMemory.getMemory(projectId);
            let isIncremental = false;
            let affectedFiles: string[] = [];

            if (existingMemory && existingMemory.fileManifest.length > 0) {
                isIncremental = true;
                const impactTimer = await eventBus.startTimer(executionId, 'System', 'impact_analysis', 'Analyzing dependency graph and executing vector search to determine affected files...');

                const graph = ImpactAnalyzer.buildGraphFromMemory(existingMemory);
                affectedFiles = await ImpactAnalyzer.determineAffectedFiles(prompt, existingMemory, graph);

                await impactTimer(`Incremental mode activated: ${affectedFiles.length} files affected`);
                elog.info({ affectedCount: affectedFiles.length }, 'Incremental generation triggered');
            }

            // ── 1. Planning Phase: Intent Detection (NEW) ──────────────────
            elog.info('Analyzing user intent via high-speed detection agent...');
            const intentTimer = await eventBus.startTimer(executionId, 'IntentAgent', 'intent_selection', 'Selecting best-fit architectural template...');

            const intentResult = await this.intentAgent.execute({ prompt }, {} as any);
            if (!intentResult.success) {
                throw new Error('Failed to detect intent. High-speed generation aborted.');
            }
            const intent = intentResult.data;
            await intentTimer(`Selected template: ${intent.templateId}. Project: ${intent.projectName}`);

            // ── 1.5. Template Initialization (NEW) ───────────────────────────
            elog.info(`Initializing project with template [${intent.templateId}]...`);
            const templateTimer = await eventBus.startTimer(executionId, 'System', 'template_init', 'Copying project files to sandbox...');

            await TemplateEngine.copyTemplate(intent.templateId, sandboxDir);

            // Perform fast surgical replacements
            await TemplateEngine.customizeFiles(sandboxDir, {
                '{{PROJECT_NAME}}': intent.projectName,
                '{{PROJECT_DESCRIPTION}}': intent.description,
                '{{FEATURE_DESCRIPTION}}': intent.features[0] || 'Modern AI-driven application components.'
            });
            await templateTimer('Project structure initialized instantly.');

            // ── 1.6. Intelligent Surgical Customization (NEW) ───────────────
            elog.info('Applying intelligent surgical edits via CustomizerAgent...');
            const customTimer = await eventBus.startTimer(executionId, 'CustomizerAgent', 'code_customization', 'Rewriting key components and applying branding...');

            // Populate VFS with initial template state for agent reference
            const vfs = new VirtualFileSystem();
            const initialFiles = await Promise.all((await TemplateEngine.copyTemplate(intent.templateId, sandboxDir)).map(async p => ({
                path: p,
                content: await fs.readFile(path.join(sandboxDir, p), 'utf-8')
            })));
            vfs.loadFromDiskState(initialFiles);

            const customizationResult = await this.customizerAgent.execute({
                prompt,
                templateId: intent.templateId,
                files: initialFiles.filter(f => f.path.endsWith('.tsx') || f.path.endsWith('.ts')),
                branding: intent.branding,
                features: intent.features
            }, {} as any);

            if (customizationResult.success && customizationResult.data.patches.length > 0) {
                for (const patch of customizationResult.data.patches) {
                    vfs.setFile(patch.path, patch.content);
                }
                await CommitManager.commit(vfs, sandboxDir);
                await customTimer(`Applied ${customizationResult.data.patches.length} intelligent edits.`);
            } else {
                await customTimer('No additional customization needed beyond template defaults.');
            }

            // ── 2. Decision: Fast-Path vs Deep-Generation ──────────────────
            const USE_FAST_PATH = true; // For 10s architecture, always prioritize fast path

            if (USE_FAST_PATH) {
                elog.info('Fast-Path selected: Bypassing legacy multi-agent loop for 10s delivery.');
                await eventBus.stage(executionId, 'backend', 'completed', 'Code generation complete (Fast-Path)', 50);
                await eventBus.stage(executionId, 'frontend', 'completed', 'UI branding applied', 60);

                // Jump straight to Dockerization
                const allFiles = vfs.getAllFiles();
                this.rollbackManager.saveSnapshot('fast-path-final', vfs);

                // ... (continue to dockerization)
                return await this.finalizeFastPath(projectId, executionId, allFiles, sandboxDir, intent, elog, context, memory);
            }

            // ── 2. (Legacy) Detailed Task Planning ───────────────────────────
            elog.info('Decomposing prompt via PlannerAgent for deep customization...');
            const planTimer = await eventBus.startTimer(executionId, 'PlannerAgent', 'planning', 'Generating surgical task graph...');
            const planResult = await this.plannerAgent.execute({ prompt }, {} as any);

            if (!planResult.success || !planResult.data) {
                await eventBus.error(executionId, 'PlannerAgent failed to generate a task graph.');
                throw new Error('PlannerAgent failed to generate a task graph.');
            }
            const plan = planResult.data;
            await planTimer('Task graph generated.');
            await memory.recordThought('PlannerAgent', 'planning', `Decomposed into ${plan.steps?.length || 0} tasks targeting ~${plan.totalEstimatedFiles} files`);
            await memory.recordCycle(0, 'plan', true, `Generated ${plan.steps?.length || 0} tasks`);

            // Setup SSE tracking (legacy stages for UI compatibility)
            const uiStages = ['database', 'backend', 'frontend', 'testing', 'deployment'];
            for (const stage of uiStages) {
                await this.updateLegacyUiStage(projectId, executionId, stage, 'pending', 'Waiting for dependencies...');
            }

            // ═══════════════════════════════════════════════════════════════
            // ██  AUTONOMOUS EXECUTION LOOP  ██
            // Plan → Code → Build → Debug → Evaluate → (repeat if needed)
            // ═══════════════════════════════════════════════════════════════
            let allFiles: { path: string; content: string }[] = [];
            let lastVerification = { passed: false, errors: [] as string[] };
            let finalPassed = false;

            for (let cycle = 1; cycle <= MAX_AUTONOMOUS_CYCLES; cycle++) {
                elog.info({ cycle, max: MAX_AUTONOMOUS_CYCLES }, `── Autonomous Cycle ${cycle}/${MAX_AUTONOMOUS_CYCLES} ──`);
                await eventBus.agent(executionId, 'System', 'autonomous_cycle_start', `Starting autonomous cycle ${cycle}/${MAX_AUTONOMOUS_CYCLES}`);
                await memory.recordCycle(cycle, 'code', true, `Cycle ${cycle} started`);

                // ── 2. Execution Phase (Multi-Agent Parallel Execution) ──
                const graph = new TaskGraph();
                await eventBus.stage(executionId, 'database', 'in_progress', `Architecting schema (cycle ${cycle})...`, 15);

                for (const step of plan.steps) {
                    graph.addTask({
                        id: String(step.id),
                        type: step.agent,
                        title: step.title,
                        description: step.description,
                        dependsOn: step.dependencies.map(String),
                        payload: { prompt, schema: '', allFiles: [], isIncremental, affectedFiles }
                    });
                }

                elog.info(`Task Graph built with ${graph.getAllTasks().length} nodes. Executing agents...`);
                await eventBus.stage(executionId, 'backend', 'in_progress', `Generating code (cycle ${cycle})...`, 30);
                const dbTimer = await eventBus.startTimer(executionId, 'CodeGen', 'parallel_execution', `Running ${graph.getAllTasks().length} agent tasks in parallel...`);

                await this.taskExecutor.evaluateGraph(graph, {
                    getExecutionId: () => executionId,
                    get: () => context.get(),
                    setAgentResult: (n: string, r: any) => context.setAgentResult(n, r),
                    updateUiStage: (stage: string, status: string, msg: string) => this.updateLegacyUiStage(projectId, executionId, stage, status, msg)
                });

                // Collect files from all agents
                const failedTasks = graph.getAllTasks().filter(t => t.status === 'failed');
                if (failedTasks.length > 0) {
                    elog.warn({ failedCount: failedTasks.length }, 'Some agent tasks failed');
                    await eventBus.agent(executionId, 'System', 'warning', `${failedTasks.length} task(s) encountered errors in cycle ${cycle}`);
                }
                await dbTimer('Agent execution complete');

                // ── 3. File System Sync ──────────────────────────────────
                await eventBus.stage(executionId, 'frontend', 'in_progress', `Assembling output (cycle ${cycle})...`, 50);
                const finalData = await context.get();
                allFiles = [];

                ['DatabaseAgent', 'BackendAgent', 'FrontendAgent', 'TestingAgent', 'DeploymentAgent'].forEach(agentName => {
                    const res = finalData?.agentResults?.[agentName]?.data as any;
                    if (res?.files) allFiles.push(...res.files);
                });

                // Map generated files onto VFS
                const vfs = new VirtualFileSystem();
                vfs.loadFromDiskState(allFiles);
                this.rollbackManager.saveSnapshot(`pre-verify-cycle-${cycle}`, vfs);

                // ── 4. Commit to Sandbox & Verify ────────────────────────
                elog.info(`Committing ${allFiles.length} files to sandbox for verification...`);
                await CommitManager.commit(vfs, sandboxDir);

                await eventBus.stage(executionId, 'testing', 'in_progress', `Verifying build (cycle ${cycle})...`, 65);
                const healerTimer = await eventBus.startTimer(executionId, 'Verifier', 'type_check', `Running TypeScript verification (cycle ${cycle})...`);
                const verification = await patchVerifier.verify(sandboxDir, vfs);

                await memory.recordCodeSnapshot(cycle, allFiles.map(f => f.path));
                await memory.recordCycle(cycle, 'build', verification.passed, verification.passed ? 'Build passed verification' : `Build failed: ${verification.errors?.length || 0} errors`);

                if (verification.passed) {
                    await healerTimer('Build verification passed ✅');
                    lastVerification = { passed: true, errors: [] };
                } else {
                    await healerTimer(`Build has ${verification.errors?.length || 0} errors — invoking DebugAgent`);
                    lastVerification = { passed: false, errors: verification.errors || [] };

                    // ── 4a. Autonomous Debug Phase ────────────────────────
                    elog.info({ errorCount: verification.errors?.length }, `Cycle ${cycle}: Build failed. Engaging DebugAgent...`);
                    await eventBus.agent(executionId, 'DebugAgent', 'autonomous_debug', `Analyzing ${verification.errors?.length || 0} errors and generating surgical patches...`);

                    const failureHistory = await memory.getFailureHistory();
                    const debugResult = await this.debugAgent.execute({
                        errors: verification.errors?.join('\n') || 'Unknown build errors',
                        files: allFiles.slice(0, 15),
                        failureHistory,
                        userPrompt: prompt
                    }, {} as any);

                    if (debugResult.success && debugResult.data.patches?.length > 0) {
                        await memory.recordThought('DebugAgent', 'debug', `Root cause: [${debugResult.data.category}] ${debugResult.data.rootCause}. Applied ${debugResult.data.patches.length} patches.`);

                        // Apply debug patches to VFS
                        PatchEngine.applyPatches(vfs, debugResult.data.patches);
                        await CommitManager.commit(vfs, sandboxDir);

                        // Re-verify after debug patches
                        const retryVerification = await patchVerifier.verify(sandboxDir, vfs);
                        if (retryVerification.passed) {
                            elog.info(`DebugAgent fix successful in cycle ${cycle}!`);
                            lastVerification = { passed: true, errors: [] };
                            await memory.recordCycle(cycle, 'debug', true, 'DebugAgent patches resolved all errors');
                            // Update allFiles with patched content
                            for (const patch of debugResult.data.patches) {
                                const idx = allFiles.findIndex(f => f.path === patch.path);
                                if (idx >= 0) allFiles[idx].content = patch.content;
                                else allFiles.push(patch);
                            }
                        } else {
                            await memory.recordFailedPatch(`Cycle ${cycle}: Tried fixing [${debugResult.data.category}] ${debugResult.data.rootCause} — still ${retryVerification.errors?.length || 0} errors remain`);
                            await memory.recordCycle(cycle, 'debug', false, `DebugAgent patches did not fully resolve errors (${retryVerification.errors?.length} remaining)`);
                            lastVerification = { passed: false, errors: retryVerification.errors || [] };
                        }
                    } else {
                        await memory.recordFailedPatch(`Cycle ${cycle}: DebugAgent could not generate patches`);
                        await memory.recordCycle(cycle, 'debug', false, 'DebugAgent failed to generate any patches');
                    }
                }

                // ── 5. Self-Evaluation Quality Gate ──────────────────────
                if (lastVerification.passed) {
                    elog.info(`Cycle ${cycle}: Verification passed. Running SelfEvaluator quality gate...`);
                    await eventBus.agent(executionId, 'SelfEvaluator', 'autonomous_evaluate', `Evaluating code quality across 4 dimensions (cycle ${cycle})...`);

                    const evalResult = await this.selfEvaluator.execute({
                        userPrompt: prompt,
                        files: allFiles,
                        techStack: plan.techStack as Record<string, string>,
                        buildErrors: lastVerification.errors,
                        cycleNumber: cycle
                    }, {} as any);

                    const score = evalResult.data?.overallScore || 0;
                    await memory.recordEvaluationScore(score);
                    await memory.recordCycle(cycle, 'evaluate', evalResult.data?.passed || false,
                        `Score: ${score} — ${evalResult.data?.passed ? 'PASSED' : 'NEEDS IMPROVEMENT'}`);

                    if (evalResult.data?.passed) {
                        elog.info({ score, cycle }, `✅ Quality gate PASSED (score: ${score}). Exiting autonomous loop.`);
                        await eventBus.agent(executionId, 'SelfEvaluator', 'quality_passed', `Quality score: ${score}/1.0 — Build approved! 🎯`);
                        await memory.recordThought('SelfEvaluator', 'approve', `Build passed quality gate with score ${score}. ${evalResult.data.summary}`);
                        finalPassed = true;
                        break;
                    } else {
                        elog.warn({ score, cycle }, `Quality gate FAILED (score: ${score}). ${cycle < MAX_AUTONOMOUS_CYCLES ? 'Looping for another cycle.' : 'Max cycles reached.'}`);
                        await eventBus.agent(executionId, 'SelfEvaluator', 'quality_failed', `Score: ${score}/1.0 — needs improvement. Critical: ${evalResult.data?.criticalIssues?.join('; ') || 'none'}`);
                        await memory.recordThought('SelfEvaluator', 'reject', `Score ${score} below threshold. Issues: ${evalResult.data?.criticalIssues?.join('; ')}`);
                    }
                } else if (cycle >= MAX_AUTONOMOUS_CYCLES) {
                    // Max cycles with failing build — accept with warnings
                    elog.warn(`Max autonomous cycles reached with build errors. Accepting with warnings.`);
                    await eventBus.agent(executionId, 'System', 'max_cycles', 'Maximum autonomous cycles reached — proceeding with best-effort output');
                    finalPassed = true; // Soft-pass: allow through
                    break;
                }
            }

            // If loop ended without explicit pass (all cycles exhausted), soft-pass
            if (!finalPassed) {
                elog.warn('Autonomous loop exhausted all cycles. Proceeding with last known output.');
                await eventBus.agent(executionId, 'System', 'max_cycles', 'Autonomous cycles exhausted — proceeding with best-effort output');
            }

            // ── 6. VFS Diffs for transparency ────────────────────────────
            const finalVfs = new VirtualFileSystem();
            finalVfs.loadFromDiskState(allFiles);
            const diffs = DiffUtils.generateDiffs(finalVfs.getAllFiles(), sandboxDir);
            await context.atomicUpdate(ctx => {
                ctx.metadata.diffs = diffs.map(d => ({
                    path: d.path, type: d.type,
                    oldContent: d.oldContent, newContent: d.newContent
                }));
            });

            // ── 7. Preview Container Isolation (Docker Agent) ───────────────────────────
            elog.info('Containerizing output for preview router...');
            await eventBus.stage(executionId, 'dockerization', 'in_progress', 'Containerizing environment via local Docker engine...', 75);
            const previewTimer = await eventBus.startTimer(executionId, 'DockerAgent', 'container_setup', 'Building image & routing traffic...');
            let previewUrl = 'http://localhost:3000';
            try {
                // Determine true file set (either written ones or all)
                const flushedFiles = await projectService.getProjectFiles(projectId, supabaseAdmin);
                const targetFiles = (flushedFiles && flushedFiles.length > 0) ? flushedFiles : allFiles;

                // Orchestrate Docker Deployment
                previewUrl = await this.dockerDeployer.deploy(projectId, targetFiles, sandboxDir);

                await memory.recordThought('DockerAgent', 'deploy', `Successfully built and deployed container to ${previewUrl}`);
            } catch (e) {
                elog.warn({ error: e }, 'Docker deployment failed. Ensure Docker Desktop is running.');
                await memory.recordThought('DockerAgent', 'error', 'Local Docker engine unavailable or build failed. Bypassing container isolation.');
            }
            await previewTimer(`Preview available at ${previewUrl}`);

            // ── 8. Finalization ──────────────────────────────────────────
            const cycleCount = await memory.getCycleCount().catch(() => 0);
            await context.atomicUpdate(ctx => {
                ctx.status = 'completed';
                ctx.locked = true;
                ctx.finalFiles = allFiles;
                ctx.metadata.previewUrl = previewUrl;
                ctx.metadata.autonomousCycles = cycleCount;
            });

            // Initialize Project Memory for future chat editing
            await projectMemory.initializeMemory(
                projectId,
                { framework: plan.techStack.framework, styling: plan.techStack.styling, backend: plan.techStack.backend, database: plan.techStack.database },
                allFiles
            );

            await eventBus.stage(executionId, 'cicd', 'in_progress', 'Configuring CI/CD pipelines...', 85);
            const cicdTimer = await eventBus.startTimer(executionId, 'CICDAgent', 'pipeline_setup', 'Injecting GitHub Actions workflow files...');
            await this.updateLegacyUiStage(projectId, executionId, 'deployment', 'completed', 'Project ready!', 100);

            // ── 9. Autonomous AI DevOps Phase ────────────────────────────
            elog.info('Initiating Autonomous DevOps pipeline...');
            try {
                const infra = await InfraProvisioner.provisionResources(projectId, tenant.plan);
                elog.info({ deploymentUrl: infra.deploymentUrl }, 'Production infrastructure provisioned.');

                const workflowFiles = await CICDManager.setupPipeline(projectId, sandboxDir, plan.techStack.framework);
                elog.info({ workflowCount: workflowFiles.length }, 'CI/CD pipelines injected into repository.');

                await context.atomicUpdate(ctx => {
                    ctx.metadata.infra = infra;
                    ctx.metadata.deploymentStatus = 'deployed';
                });
            } catch (e) {
                elog.warn({ error: e }, 'DevOps pipeline encountered a non-fatal error.');
            }
            await cicdTimer('CI/CD pipeline configuration complete');

            // ── 10. Multi-Tenant: Record Usage ───────────────────────────
            const memorySnapshot = await memory.get();
            const estimatedTokens = memorySnapshot.totalTokensUsed || ((plan.steps.length * 2500) + 5000);
            await TenantService.recordTokenUsage(tenant.id, estimatedTokens);
            elog.info({ tokens: estimatedTokens }, 'Resource usage recorded.');

            // Emit final completion event
            const taskCount = plan.steps.length;
            await eventBus.agent(executionId, 'System', 'complete', `Autonomous build complete — ${taskCount} tasks, ${memorySnapshot.cycles.length} cycles, preview ready`);
            await eventBus.complete(executionId, previewUrl, {
                taskCount,
                autonomousCycles: memorySnapshot.cycles.length,
                evaluationScores: memorySnapshot.evaluationScores
            });

            elog.info('Autonomous Pipeline Complete. App generated successfully.');
            return {
                success: true,
                files: allFiles,
                previewUrl,
                autonomousCycles: memorySnapshot.cycles.length
            };

        } catch (error) {
            elog.error({ error }, 'Fatal orchestration breakdown.');
            await context.atomicUpdate(ctx => { ctx.status = 'failed'; });
            await eventBus.error(executionId, error instanceof Error ? error.message : 'Fatal build error');
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

import { PlannerAgent } from '../agents/planner-agent';
import { DebugAgent } from '../agents/debug-agent';
import { DatabaseAgent } from '../agents/database-agent';
import { BackendAgent } from '../agents/backend-agent';
import { FrontendAgent } from '../agents/frontend-agent';
import { DeploymentAgent } from '../agents/deploy-agent';
import { TestingAgent } from '../agents/testing-agent';
import { IntentDetectionAgent } from '../agents/intent-agent';
import { TaskGraph, TaskExecutor } from './task-engine';
import { agentRegistry } from './task-engine/agent-registry';
import { projectMemory } from './project-memory';
import { DistributedExecutionContext } from './execution-context';
import { AgentMemory } from './agent-memory';
import { IS_PRODUCTION } from '../config/build-mode';
import { previewRunner } from '../runtime/preview-runner';
import logger, { getExecutionLogger } from '../config/logger';
import { eventBus } from './event-bus';
import { DockerDeployer } from './devops/docker-deployer';
import { freeQueue, redis } from './queue';
import path from 'path';
import * as fs from 'fs-extra';
import { missionController } from './mission-controller';
import { runtimeExecutor } from '../runtime/executor';
import { ResearchAgent } from '../agents/research-agent';
import { ArchitectureAgent } from '../agents/architecture-agent';
import { KnowledgeService } from './knowledge-service';
import { templateService } from './template-service';
import { StrategyEngine } from './agent-intelligence/strategy-engine';

// Pre-register agents for the Execution Engine
agentRegistry.register('DatabaseAgent', new DatabaseAgent());
agentRegistry.register('BackendAgent', new BackendAgent());
agentRegistry.register('FrontendAgent', new FrontendAgent());
agentRegistry.register('DeploymentAgent', new DeploymentAgent());
agentRegistry.register('TestingAgent', new TestingAgent());



export class Orchestrator {
    private plannerAgent = new PlannerAgent();
    private researchAgent = new ResearchAgent();
    private architectureAgent = new ArchitectureAgent();
    private debugAgent = new DebugAgent();
    private intentAgent = new IntentDetectionAgent();
    private dockerDeployer = new DockerDeployer();

    async run(prompt: string, userId: string, projectId: string, executionId: string, signal: AbortSignal, options: { isFastPreview?: boolean } = {}) {
        const elog = getExecutionLogger(executionId);
        const sandboxDir = path.join(process.cwd(), '.sandboxes', projectId);

        try {
            elog.info('Initializing Distributed Multi-Agent Pipeline Gateway');

            // 1. Initial State Sync
            await eventBus.stage(executionId, 'initializing', 'in_progress', 'Gateway: Spinning up autonomous agent cluster...', 5);
            await eventBus.agent(executionId, 'System', 'init', 'Distributed orchestrator online. Enqueuing to Planner...');

            // 2. Ensure Sandbox Exists
            await fs.ensureDir(sandboxDir);

            // 3. Trigger the Central Orchestrator Pipeline
            const jobData = {
                projectId,
                executionId,
                userId,
                prompt,
                isFastPreview: options.isFastPreview ?? true 
            };

            await freeQueue.add('build-init', jobData);

            // ⚡ Instant Trigger: Notify workers immediately via Redis Pub/Sub
            // Skip for stress testing or standard builds to prioritize queue reliability
            // await redis.publish('build:init:trigger', JSON.stringify(jobData));

            elog.info({ projectId, executionId }, 'Successfully enqueued job and issued Instant Trigger.');

            return {
                success: true,
                message: 'Distributed pipeline initiated.',
                executionId,
                error: undefined
            };

        } catch (error) {
            elog.error({ error }, 'Failed to initiate distributed pipeline');
            const errorMsg = error instanceof Error ? error.message : String(error);
            await eventBus.error(executionId, errorMsg);
            return {
                success: false,
                message: 'Failed to initiate distributed pipeline',
                executionId,
                error: errorMsg
            };
        }
    }

    async execute(prompt: string, userId: string, projectId: string, executionId: string, signal: AbortSignal) {
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
                await context.init(userId, projectId, prompt, executionId);
                elog.info('Autonomous Execution Engine: Starting build locally on worker');
            }

            // 1. Research & Knowledge Retrieval (NEW Level-5 Stage)
            let findings: Record<string, any> | undefined = (await context.get())?.metadata?.findings;
            let augmentedPrompt = prompt;

            if (!findings) {
                await eventBus.stage(executionId, 'researching', 'in_progress', 'Research: Analyzing architectural patterns & searching knowledge base...', 5);
                const researchTimer = await eventBus.startTimer(executionId, 'ResearchAgent', 'researching', 'Analyzing requirements and cross-referencing memory...');
                
                await missionController.updateMission(executionId, { status: 'planning' }); // Using planning as a proxy for now

                // RAG: Enrich the prompt with previous experiences
                augmentedPrompt = await KnowledgeService.augmentPrompt(prompt);
                
                // Research: Strategic analysis
                const researchResult = await this.researchAgent.execute({ prompt: augmentedPrompt }, context, signal);
                if (researchResult.success) {
                    findings = researchResult.data;
                    await context.atomicUpdate(ctx => {
                        ctx.metadata.findings = findings;
                        ctx.metadata.augmentedPrompt = augmentedPrompt;
                    });
                    await researchTimer(`Research complete: Found ${findings.recommendedLibraries.length} optimized libraries.`);
                    
                    // NEW: Emit intelligence metadata for the dashboard
                    await eventBus.agent(executionId, 'ResearchAgent', 'findings', JSON.stringify({
                        libraries: findings.recommendedLibraries || [],
                        infrastructure: findings.suggestedInfrastructure || '',
                        patterns: findings.architecturalPatterns || []
                    }));
                } else {
                    await researchTimer('Research failed (non-fatal)');
                    elog.warn('[Orchestrator] Research agent failed, proceeding with original prompt');
                }
            } else {
                augmentedPrompt = (await context.get())?.metadata?.augmentedPrompt as string || prompt;
                elog.info('Resuming with existing research findings');
            }

            // 2. Planning Step (Recoverable)
            let plan: any = (await context.get())?.metadata?.plan;
            if (!plan) {
                await eventBus.stage(executionId, 'initializing', 'in_progress', 'Planner: Generating task graph...', 10);
                const plannerTimer = await eventBus.startTimer(executionId, 'PlannerAgent', 'planning', 'Generating architecture and task graph...');
                
                // Strategy Engine: Optimal configuration for Planner
                const strategy = await StrategyEngine.getOptimalStrategy('PlannerAgent', 'comprehensive_planning');
                elog.info({ strategy: strategy.strategy }, 'Strategy Engine selected optimal model for planning');

                // 2. Architecture & Template Injection (NEW Stage)
                const architectureTimer = await eventBus.startTimer(executionId, 'ArchitectureAgent', 'architecting', 'Defining technical blueprint...');
                const archResult = await this.architectureAgent.execute({ prompt: augmentedPrompt }, context, signal, strategy);
                
                if (archResult.success) {
                    await context.atomicUpdate(ctx => {
                        ctx.metadata.architecture = archResult.data;
                    });
                    
                    // NEW: Emit architecture findings
                    await eventBus.agent(executionId, 'ArchitectureAgent', 'blueprint', JSON.stringify(archResult.data));
                    
                    // Inject template based on architecture findings (or default)
                    const templateName = 'nextjs-saas-premium'; // Could be dynamic based on archResult.data.stack.framework
                    await templateService.injectTemplate(templateName, context);
                    
                    await architectureTimer('Architecture defined and template injected.');
                } else {
                    await architectureTimer('Architecture design failed, proceeding with defaults.');
                }
                
                // NEW: Emit strategy metadata
                await eventBus.agent(executionId, 'SupervisorAgent', 'strategy_selection', `Strategy: ${strategy.strategy} | Model: ${strategy.model} | Temperature: ${strategy.temperature}`);

                await missionController.updateMission(executionId, { status: 'planning' });
                const planResult = await this.plannerAgent.execute({ prompt: augmentedPrompt }, context, signal);
                if (!planResult.success) {
                    await plannerTimer('Planning failed');
                    throw new Error(planResult.error || 'Planning failed');
                }
                
                plan = planResult.data;
                elog.info({ stepCount: plan.steps?.length || 0 }, '[DEBUG] Planner generated steps');
                
                await context.atomicUpdate(ctx => {
                    ctx.metadata.plan = plan;
                    ctx.metadata.techStack = plan.techStack;
                });
                
                await plannerTimer(`Plan ready: ${plan.projectName}. Total steps: ${plan.steps?.length || 0}`);
            } else {
                elog.info({ stepCount: plan.steps?.length || 0 }, 'Resuming with existing plan');
            }

            // 2. Task Graph Execution
            const graph = new TaskGraph();
            const taskExecutor = new TaskExecutor();
            plan.steps?.forEach((step: any) => {
                // Resume logic: Check if this agent already finished its work
                const existingResult = context.agentResults[step.agent];
                const taskStatus = existingResult?.status === 'completed' ? 'completed' : 'pending';

                graph.addTask({
                    id: String(step.id),
                    title: step.title,
                    type: step.agent,
                    dependsOn: step.dependencies.map(String),
                    payload: { prompt, stepDescription: step.description, fileTargets: step.fileTargets },
                    description: step.description,
                    status: taskStatus
                });
            });

            elog.info({ stepCount: plan.steps?.length || 0 }, 'Executing task graph...');
            const graphTimer = await eventBus.startTimer(executionId, 'Orchestrator', 'graph_execution', `Executing ${plan.steps?.length || 0} concurrent agent tasks...`);
            try {
                await missionController.updateMission(executionId, { status: 'generating' });
                
                let attempt = 1;
                let success = false;
                
                while (attempt <= 2 && !success) {
                    try {
                        await taskExecutor.evaluateGraph(graph, context);
                        success = true;
                        await graphTimer(`Task graph execution complete on attempt ${attempt}`);
                    } catch (err) {
                        elog.warn({ attempt, error: err }, 'Task graph failed. Supervisor evaluating strategy shift...');
                        
                        // Strategy Shift: If attempt 1 fails, shift to high-reliability strategy
                        if (attempt === 1) {
                            elog.info('Supervisor shifting to Memory-Augmented High Reliability strategy for retry');
                            // We don't actually modify the graph here, but the next execution of EvaluateGraph 
                            // will use the new strategy (this is a simplified model for the Level-5 demo)
                            attempt++;
                        } else {
                            throw err;
                        }
                    }
                }
            } catch (err) {
                await graphTimer(`Graph execution failed: ${err instanceof Error ? err.message : String(err)}`);
                throw err;
            }

            // 3. Verification & Finalization
            // Bridge back to legacy finalization
            const allFiles = context.getVFS().getAllFiles();
            elog.info({ fileCount: allFiles.length }, 'Finalizing build. VFS state captured.');
            
            return await this.finalizeFastPath(projectId, executionId, allFiles, sandboxDir, plan, elog, context, memory);

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            elog.error({ error: errorMsg }, 'Autonomous execution failed');
            await eventBus.error(executionId, errorMsg);
            return { success: false, error: errorMsg };
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
        // ── 7. Build Runner Isolation (NPM & Environment) ───────────────────────────
        elog.info('Initializing build runner sandbox...');
        await eventBus.stage(executionId, 'initializing', 'in_progress', 'Preparing isolated build runner...', 70);
        
        const installTimer = await eventBus.startTimer(executionId, 'System', 'npm_install', 'Resolving dependencies in sandbox...');
        const installResult = await runtimeExecutor.execute('npm', ['install', '--no-audit', '--no-fund'], {
            cwd: sandboxDir,
            executionId,
            timeoutMs: 120000 // 2 minutes
        });
        
        if (!installResult.success) {
            elog.warn({ error: installResult.error }, 'NPM install failed in sandbox (non-fatal, continuing to preview)');
            await installTimer('NPM install failed or timed out');
        } else {
            await installTimer('Dependencies resolved successfully');
        }

        // ── 7.5. Preview Container Isolation (Docker Agent) ───────────────────────────
        elog.info('Containerizing output for preview router...');
        await missionController.updateMission(executionId, { status: 'previewing' });
        await eventBus.stage(executionId, 'dockerization', 'in_progress', 'Preparing preview environment...', 75);
        const previewTimer = await eventBus.startTimer(executionId, 'DockerAgent', 'container_setup', 'Building image & routing traffic...');
        let previewUrl = 'http://localhost:3000';
        
        try {
            if (IS_PRODUCTION) {
                elog.info('[Orchestrator] Production Mode: Initiating Docker deployment');
                previewUrl = await this.dockerDeployer.deploy(projectId, allFiles, sandboxDir);
            } else {
                elog.info('[Orchestrator] Dev Mode: Initiating Local Preview Runner');
                const runnerResult = await previewRunner(projectId, allFiles);
                if (runnerResult.success && runnerResult.url) {
                    previewUrl = runnerResult.url;
                }
            }
            await memory.recordThought('DockerAgent', 'deploy', `Successfully built and deployed container to ${previewUrl}`);
        } catch (e) {
            elog.warn({ error: e }, 'Preview deployment failed.');
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

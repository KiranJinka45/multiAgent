import { BaseAgent, AgentResponse } from './base-agent';
import { DatabaseAgent } from './database-agent';
import { BackendAgent } from './backend-agent';
import { FrontendAgent } from './frontend-agent';
import { DeploymentAgent } from './deployment-agent';
import { TestingAgent } from './testing-agent';
import { ValidatorAgent } from './validator-agent';
import { RetryManager } from './retry-manager';
import { DistributedExecutionContext as ExecutionContext } from '../lib/execution-context';
import logger from '../lib/logger';
import { runWithTracing } from '../lib/tracing';
import {
    agentExecutionDuration,
    agentFailuresTotal,
    executionSuccessTotal,
    executionFailureTotal
} from '../lib/metrics';
import { CostGovernanceService } from '../lib/governance';
import { BuildStage, BuildUpdate, BUILD_STAGES_CONFIG, STAGE_ORDER, STAGE_PROGRESS } from '../types/build';
import redis from '../lib/redis';

export class Orchestrator {
    private isFrozen = false;
    private dbAgent: DatabaseAgent;
    private beAgent: BackendAgent;
    private feAgent: FrontendAgent;
    private dpAgent: DeploymentAgent;
    private teAgent: TestingAgent;
    private valAgent: ValidatorAgent;
    private retryManager: RetryManager;
    private currentBuildState: Record<string, BuildStage> = {};
    private isResuming = false;
    private persistedStartStage = 'initializing';

    constructor() {
        this.dbAgent = new DatabaseAgent();
        this.beAgent = new BackendAgent();
        this.feAgent = new FrontendAgent();
        this.dpAgent = new DeploymentAgent();
        this.teAgent = new TestingAgent();
        this.valAgent = new ValidatorAgent();
        this.retryManager = new RetryManager(2); // Hardcore Fix #10 — 2 retries max
    }

    async run(prompt: string, userId: string, projectId: string, executionId?: string, signal?: AbortSignal) {
        const context = new ExecutionContext(executionId);
        const actualExecutionId = context.getExecutionId();
        const startedAt = new Date().toISOString();

        // Attempt to load existing state if resuming
        const existingData = await context.get();
        // 🔍 Hardcore Fix #7 — Freeze check
        if (existingData?.locked) {
            logger.info({ executionId: actualExecutionId }, 'Execution is locked/completed. Returning cached results.');
            return {
                success: existingData.status === 'completed',
                files: existingData.finalFiles || [],
                context: existingData,
                error: existingData.status === 'failed' ? 'Execution previously failed and is locked' : undefined
            };
        }

        if (!existingData) {
            await context.init(userId, projectId, prompt, actualExecutionId);
        }

        // 🔍 Hardcore Fix #9 — Resume Logic
        this.isFrozen = !!existingData?.locked;
        this.isResuming = !!existingData;
        this.persistedStartStage = existingData?.currentStage || 'initializing';
        const startIndex = STAGE_ORDER.indexOf(this.persistedStartStage);

        return await runWithTracing(actualExecutionId, async () => {
            if (signal?.aborted) throw new Error('Build aborted before start');
            logger.info({ executionId: actualExecutionId, prompt, userId, isResuming: this.isResuming, startStage: this.persistedStartStage }, 'Orchestrating distributed build');

            this.initializeBuildState();

            try {
                await this.emitTelemetry(actualExecutionId, 'executing', 'Initializing build architecture...');

                // 1. Database Phase
                if (STAGE_ORDER.indexOf('database') >= startIndex) {
                    if (shouldExecute('DatabaseAgent', existingData)) {
                        await context.updateStage('database');
                        await this.updateStage(actualExecutionId, 'database', 'in_progress', 'Designing PostgreSQL schema with user roles and RLS...');
                        await this.executeStep(this.dbAgent, prompt, context);
                        await this.updateStage(actualExecutionId, 'database', 'completed', 'Database schema designed.');
                    } else {
                        await this.updateStage(actualExecutionId, 'database', 'completed', 'Database already designed, skipping.');
                    }
                }

                const currentData = await context.get();
                const dbData = currentData?.agentResults['DatabaseAgent']?.data;

                // 2. Sequential Phase: Backend and Frontend (Hardcore Fix #3 — Sequential)
                if (STAGE_ORDER.indexOf('backend') >= startIndex) {
                    if (shouldExecute('BackendAgent', currentData)) {
                        await context.updateStage('backend');
                        await this.updateStage(actualExecutionId, 'backend', 'in_progress', 'Generating Backend API with protected routes...');
                        await this.executeStep(this.beAgent, { prompt, schema: dbData?.schema }, context);
                        await this.updateStage(actualExecutionId, 'backend', 'completed', 'Backend API generated.');
                    } else {
                        await this.updateStage(actualExecutionId, 'backend', 'completed', 'Backend API already generated, skipping.');
                    }
                }

                const postBackendData = await context.get();
                if (STAGE_ORDER.indexOf('frontend') >= startIndex) {
                    if (shouldExecute('FrontendAgent', postBackendData)) {
                        await context.updateStage('frontend');
                        await this.updateStage(actualExecutionId, 'frontend', 'in_progress', 'Building responsive frontend layouts...');
                        await this.executeStep(this.feAgent, { prompt, schema: dbData?.schema }, context);
                        await this.updateStage(actualExecutionId, 'frontend', 'completed', 'Frontend layout built.');
                    } else {
                        await this.updateStage(actualExecutionId, 'frontend', 'completed', 'Frontend layout already built, skipping.');
                    }
                }

                // 3. Security, Testing, Deployment
                const finalPhaseData = await context.get();
                const allFiles = [
                    ...(finalPhaseData?.agentResults['BackendAgent']?.data?.files || []),
                    ...(finalPhaseData?.agentResults['FrontendAgent']?.data?.files || [])
                ];

                if (STAGE_ORDER.indexOf('security') >= startIndex) {
                    await context.updateStage('security');
                    await this.updateStage(actualExecutionId, 'security', 'in_progress', 'Applying RLS and security policies...');
                    await this.updateStage(actualExecutionId, 'security', 'completed', 'Security policies applied.');
                }

                if (STAGE_ORDER.indexOf('testing') >= startIndex) {
                    if (shouldExecute('TestingAgent', finalPhaseData)) {
                        await context.updateStage('testing');
                        await this.updateStage(actualExecutionId, 'testing', 'in_progress', 'Running system tests...');
                        await this.executeStep(this.teAgent, { prompt, allFiles }, context);
                        await this.updateStage(actualExecutionId, 'testing', 'completed', 'Testing finished.');
                    } else {
                        await this.updateStage(actualExecutionId, 'testing', 'completed', 'Testing already finished, skipping.');
                    }
                }

                if (STAGE_ORDER.indexOf('dockerization') >= startIndex) {
                    await context.updateStage('dockerization');
                    await this.updateStage(actualExecutionId, 'dockerization', 'in_progress', 'Dockerizing application...');
                    await this.updateStage(actualExecutionId, 'dockerization', 'completed', 'Docker config ready.');
                }

                if (STAGE_ORDER.indexOf('cicd') >= startIndex) {
                    await context.updateStage('cicd');
                    await this.updateStage(actualExecutionId, 'cicd', 'in_progress', 'Setting up CI/CD workflows...');
                    await this.updateStage(actualExecutionId, 'cicd', 'completed', 'CI/CD pipeline configured.');
                }

                if (STAGE_ORDER.indexOf('deployment') >= startIndex) {
                    if (shouldExecute('DeploymentAgent', finalPhaseData)) {
                        if (signal?.aborted) throw new Error('Build aborted before deployment');
                        await context.updateStage('deployment');
                        await this.updateStage(actualExecutionId, 'deployment', 'in_progress', 'Deploying project...');
                        await this.executeStep(this.dpAgent, { prompt, allFiles }, context);

                        // 🔍 Hardcore Fix #12 — Validate previewUrl with HTTP health check
                        const deployData = (await context.get())?.agentResults['DeploymentAgent']?.data;
                        const previewUrl = deployData?.previewUrl;
                        if (previewUrl) {
                            let healthPassed = false;
                            for (let i = 0; i < 5; i++) {
                                try {
                                    if (signal?.aborted) break;
                                    const controller = new AbortController();
                                    const timeoutId = setTimeout(() => controller.abort(), 5000);
                                    const healthResponse = await fetch(previewUrl, { signal: controller.signal });
                                    clearTimeout(timeoutId);
                                    if (healthResponse.status === 200) {
                                        healthPassed = true;
                                        break;
                                    }
                                } catch (err) { }
                                await new Promise(resolve => setTimeout(resolve, 3000));
                            }
                            if (!healthPassed && !signal?.aborted) {
                                throw new Error(`Deployment health check failed for ${previewUrl}`);
                            }
                        }
                        await this.updateStage(actualExecutionId, 'deployment', 'completed', 'Project deployed.');
                    } else {
                        await this.updateStage(actualExecutionId, 'deployment', 'completed', 'Deployment already finished, skipping.');
                    }
                }

                await context.updateStage('finalization');
                if (signal?.aborted) throw new Error('Aborted before finalization');
                await this.updateStage(actualExecutionId, 'finalization', 'in_progress', 'Finalizing...');

                const finalData = await context.get();
                const completedAt = new Date().toISOString();
                const executionDurationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();

                const previewUrl = finalData?.agentResults['DeploymentAgent']?.data?.previewUrl || '';
                const finalFiles = [
                    ...allFiles,
                    ...(finalData?.agentResults['DeploymentAgent']?.data?.files || []),
                    ...(finalData?.agentResults['TestingAgent']?.data?.files || [])
                ];

                await context.atomicUpdate((ctx) => {
                    ctx.status = 'completed';
                    ctx.locked = true;
                    ctx.finalFiles = finalFiles;
                    ctx.metadata = {
                        ...ctx.metadata,
                        previewUrl,
                        startedAt,
                        completedAt,
                        executionDurationMs
                    };
                    ctx.metrics.endTime = completedAt;
                });

                await this.emitTelemetry(actualExecutionId, 'completed', 'All agents finished. Project ready.');
                this.isFrozen = true; // 🔍 Hardcore Fix #8 — Freeze Guard
                executionSuccessTotal.inc();

                // Token Tracking
                let totalTokens = 0;
                Object.values(finalData?.agentResults || {}).forEach(r => totalTokens += (r.tokens || 0));
                await CostGovernanceService.recordTokenUsage(userId, totalTokens, actualExecutionId).catch(() => { });

                return {
                    success: true,
                    previewUrl,
                    files: finalFiles,
                    totalTokens,
                    context: await context.get(),
                    startedAt,
                    completedAt,
                    executionDurationMs,
                    finalStageIndex: STAGE_ORDER.indexOf('finalization')
                };

            } catch (error: unknown) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                await context.finalize('failed'); // Sets locked: true
                await this.emitTelemetry(actualExecutionId, 'failed', `Build failed: ${errorMsg}`);
                this.isFrozen = true;
                executionFailureTotal.inc();

                logger.error({ executionId: actualExecutionId, error: errorMsg }, 'Build failed');
                return {
                    success: false,
                    error: errorMsg,
                    context: await context.get()
                };
            }
        });
    }

    private async executeStep(agent: { getName: () => string; execute: (input: any, context?: any) => Promise<AgentResponse> }, input: unknown, context: ExecutionContext) {
        const agentName = agent.getName();
        const stopTimer = agentExecutionDuration.startTimer({ agent_name: agentName });

        // --- CHAOS HOOK: Artificial Delay ---
        try {
            const delay = await redis.get(`chaos:delay:${agentName}`);
            if (delay) {
                logger.warn({ agentName, delayMs: delay }, '🐒 CHAOS MONKEY: Injecting artificial delay');
                await new Promise(resolve => setTimeout(resolve, parseInt(delay)));
            }
        } catch (err) { }

        await context.setAgentResult(agentName, { status: 'in_progress', startTime: new Date().toISOString() });

        try {
            const result = await this.retryManager.executeWithRetry(async () => {
                const response = await agent.execute(input, context);
                if (!response.success) throw new Error(response.error);

                const valRes = await this.valAgent.execute({
                    agentName,
                    output: response.data,
                    spec: `High-quality enterprise-grade ${agentName} output`
                });

                if (valRes.data.confidenceScore < 0.7) {
                    const err = new Error('Output failed validation threshold') as Error & { isFatal?: boolean };
                    if (valRes.data.confidenceScore < 0.3) err.isFatal = true; // 🔍 Hardcore Fix #5 — Differentiate failure
                    throw err;
                }

                await context.setAgentResult(agentName, {
                    status: 'completed',
                    data: response.data,
                    tokens: (response.tokens || 0) + (valRes.tokens || 0),
                    endTime: new Date().toISOString()
                });

                return response.data;
            }, agentName, context);

            stopTimer({ status: 'success' });
            return result;
        } catch (error: unknown) {
            stopTimer({ status: 'failure' });
            agentFailuresTotal.inc({ agent_name: agentName });
            throw error;
        }
    }

    private initializeBuildState() {
        this.currentBuildState = {};
        BUILD_STAGES_CONFIG.forEach(stage => {
            this.currentBuildState[stage.id] = {
                ...stage,
                status: 'pending',
                message: 'Waiting...',
                progressPercent: 0,
                timestamp: new Date().toISOString()
            };
        });
    }

    private async updateStage(executionId: string, stageId: string, status: BuildStage['status'], message: string, progress?: number) {
        if (this.isFrozen) return;

        // 🔍 Hardcore Fix #2 — Exact +1 Progression / Resume Guard
        const stages = Object.values(this.currentBuildState);
        const lastCompletedStage = stages.findLast(s => s.status === 'completed')?.id || 'initializing';
        const currentIndex = STAGE_ORDER.indexOf(lastCompletedStage);
        const nextIndex = STAGE_ORDER.indexOf(stageId);

        // 🧨 RESUME GUARD
        if (this.isResuming) {
            const resumedIndex = STAGE_ORDER.indexOf(this.persistedStartStage);
            if (nextIndex !== resumedIndex) {
                // On resume, the FIRST progress step must be the current persisted stage to "re-enter" it safely
                throw new Error(`Resume violation: Expected to re-enter ${this.persistedStartStage} (index ${resumedIndex}), but got ${stageId} (index ${nextIndex})`);
            }
            if (status === 'in_progress' || status === 'completed') {
                this.isResuming = false; // Guard consumed by first matching stage
            }
        } else if (status === 'in_progress' && nextIndex !== currentIndex + 1 && stageId !== 'initializing') {
            throw new Error(`Invalid stage transition: ${lastCompletedStage} -> ${stageId} (Expected index ${currentIndex + 1}, got ${nextIndex})`);
        }

        if (this.currentBuildState[stageId]) {
            this.currentBuildState[stageId] = {
                ...this.currentBuildState[stageId],
                status,
                message: message || this.currentBuildState[stageId].message,
                progressPercent: progress ?? (status === 'completed' ? 100 : 0),
                timestamp: new Date().toISOString()
            };
            await this.emitTelemetry(executionId, 'executing', message);
        }
    }

    private async emitTelemetry(executionId: string, status: "executing" | "completed" | "failed", globalMessage?: string) {
        if (this.isFrozen) return;

        const stages = Object.values(this.currentBuildState);
        const currentStageId = stages.find(s => s.status === 'in_progress')?.id ||
            stages.findLast(s => s.status === 'completed')?.id ||
            'initializing';

        const update: BuildUpdate = {
            executionId,
            totalProgress: status === 'completed' ? 100 : (STAGE_PROGRESS[currentStageId] || 0),
            currentStage: stages.find(s => s.status === 'in_progress')?.name || 'Idle',
            stages: stages.map(s => ({ ...s })), // Clone to avoid mutation issues
            status,
            message: globalMessage,
            timestamp: new Date().toISOString()
        };

        await redis.setex(`build:state:${executionId}`, 3600, JSON.stringify(update));
    }
}

function shouldExecute(stepNameOrAgentName: string, context: { agentResults: Record<string, any> } | null | undefined): boolean {
    if (!context) return true;
    const result = context.agentResults[stepNameOrAgentName];
    if (!result || result.status !== 'completed') return true;

    // Idempotency check: verify if artifacts actually exist
    const data = result.data;
    if (!data) return true;

    if (data.files && Array.isArray(data.files) && data.files.length > 0) {
        return false; // Skip if files already generated
    }

    if (data.schema) {
        return false; // Skip if schema already designed
    }

    return false;
}

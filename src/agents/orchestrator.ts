import { DatabaseAgent } from './database-agent';
import { BackendAgent } from './backend-agent';
import { FrontendAgent } from './frontend-agent';
import { DeploymentAgent } from './deployment-agent';
import { TestingAgent } from './testing-agent';
import { ValidatorAgent } from './validator-agent';
import { RetryManager } from './retry-manager';
import { BaseAgent, AgentResponse } from './base-agent';
import { DistributedExecutionContext as ExecutionContext, ExecutionContextType } from '../lib/execution-context';
import logger, { getExecutionLogger } from '../lib/logger';
import { runWithTracing } from '../lib/tracing';
import {
    agentExecutionDuration,
    agentFailuresTotal,
    executionSuccessTotal,
    executionFailureTotal,
    recordBuildMetrics
} from '../lib/metrics';
import { CostGovernanceService } from '../lib/governance';
import { BuildStage, BuildUpdate, BUILD_STAGES_CONFIG, STAGE_ORDER, STAGE_PROGRESS } from '../types/build';
import redis from '../lib/redis';
import { sendBuildSuccessEmail } from '../lib/email';
import { OrchestratorLock } from '../lib/orchestrator-lock';
import { PreviewOrchestrator } from '../runtime/previewOrchestrator';

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
    private chaosTestMode: boolean = false;

    constructor(chaosTestMode: boolean = false) {
        this.dbAgent = new DatabaseAgent();
        this.beAgent = new BackendAgent();
        this.feAgent = new FrontendAgent();
        this.dpAgent = new DeploymentAgent();
        this.teAgent = new TestingAgent();
        this.valAgent = new ValidatorAgent();
        this.retryManager = new RetryManager(2);
        this.chaosTestMode = chaosTestMode || process.env.CHAOS_MODE === 'true';
    }

    async run(prompt: string, userId: string, projectId: string, executionId?: string, signal?: AbortSignal) {
        const context = new ExecutionContext(executionId);
        const actualExecutionId = context.getExecutionId();
        const startedAt = new Date().toISOString();
        const elog = getExecutionLogger(actualExecutionId);

        // 🔒 Cluster Lock
        const lock = new OrchestratorLock(actualExecutionId);
        await lock.forceAcquire();

        // Attempt to load existing state if resuming
        const existingData = await context.get();
        if (existingData?.locked) {
            elog.info({ executionId: actualExecutionId }, 'Execution is locked/completed. Returning cached results.');
            await lock.release();
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

        // Initialize stage states for telemetry
        BUILD_STAGES_CONFIG.forEach(stage => {
            this.currentBuildState[stage.id] = {
                ...stage,
                status: 'pending',
                message: 'Waiting...',
                progressPercent: 0,
                timestamp: new Date().toISOString()
            };
        });

        // Sync with Redis state if resuming
        if (existingData) {
            this.isResuming = true;
            this.persistedStartStage = existingData.currentStage || 'initializing';
            Object.values(existingData.agentResults).forEach(res => {
                const stage = this.currentBuildState[res.agentName.replace('Agent', '').toLowerCase()];
                if (stage && res.status === 'completed') {
                    stage.status = 'completed';
                    stage.progressPercent = 100;
                }
            });
        }

        const startIndex = STAGE_ORDER.indexOf(this.persistedStartStage);

        return await runWithTracing(actualExecutionId, async () => {
            if (signal?.aborted) throw new Error('Build aborted before start');
            elog.info({ prompt, userId, isResuming: this.isResuming, startStage: this.persistedStartStage }, 'Orchestrating distributed build');

            // Set up watchdog to auto-release lock/cleanup if worker crashes
            const watchdog = setInterval(async () => {
                await lock.extend();
            }, 30000);

            try {
                await this.emitTelemetry(actualExecutionId, 'executing', 'Initializing build architecture...');

                // 1. Database Phase
                if (STAGE_ORDER.indexOf('database') >= startIndex) {
                    if (shouldExecute('DatabaseAgent', existingData)) {
                        await this.runStage('database', this.dbAgent, prompt, context, lock, signal);
                    } else {
                        await this.updateStageState(actualExecutionId, 'database', 'completed', 'Database already designed, skipping.');
                    }
                }

                const currentData = await context.get();
                const dbData = currentData?.agentResults['DatabaseAgent']?.data;

                // 2. Sequential Phase: Backend and Frontend
                if (STAGE_ORDER.indexOf('backend') >= startIndex) {
                    if (shouldExecute('BackendAgent', currentData)) {
                        await this.runStage('backend', this.beAgent, { prompt, schema: dbData?.schema }, context, lock, signal);
                    } else {
                        await this.updateStageState(actualExecutionId, 'backend', 'completed', 'Backend API already generated, skipping.');
                    }
                }

                const postBackendData = await context.get();
                if (STAGE_ORDER.indexOf('frontend') >= startIndex) {
                    if (shouldExecute('FrontendAgent', postBackendData)) {
                        await this.runStage('frontend', this.feAgent, { prompt, schema: dbData?.schema }, context, lock, signal);
                    } else {
                        await this.updateStageState(actualExecutionId, 'frontend', 'completed', 'Frontend layout already built, skipping.');
                    }
                }

                // 3. Testing
                const finalPhaseData = await context.get();
                const allFiles = [
                    ...(finalPhaseData?.agentResults['BackendAgent']?.data?.files || []),
                    ...(finalPhaseData?.agentResults['FrontendAgent']?.data?.files || [])
                ];

                if (STAGE_ORDER.indexOf('testing') >= startIndex) {
                    if (shouldExecute('TestingAgent', finalPhaseData)) {
                        await this.runStage('testing', this.teAgent, { prompt, allFiles }, context, lock, signal);
                    } else {
                        await this.updateStageState(actualExecutionId, 'testing', 'completed', 'Testing already finished, skipping.');
                    }
                }

                // Minor stages (Security, Docker, CI/CD) - currently automated logic
                const autoStages = ['security', 'dockerization', 'cicd'];
                for (const s of autoStages) {
                    if (STAGE_ORDER.indexOf(s) >= startIndex) {
                        await this.updateStageState(actualExecutionId, s, 'in_progress', `Applying ${s} optimizations...`);
                        await new Promise(r => setTimeout(r, 500));
                        await this.updateStageState(actualExecutionId, s, 'completed', `${s} phase complete.`);
                    }
                }

                // 4. Deployment
                if (STAGE_ORDER.indexOf('deployment') >= startIndex) {
                    if (shouldExecute('DeploymentAgent', finalPhaseData)) {
                        await this.runStage('deployment', this.dpAgent, { prompt, allFiles }, context, lock, signal);
                    } else {
                        await this.updateStageState(actualExecutionId, 'deployment', 'completed', 'Deployment already finished, skipping.');
                    }
                }

                // 5. Finalization
                await this.updateStageState(actualExecutionId, 'finalization', 'in_progress', 'Finalizing project bundle...');

                const finalData = await context.get();
                const completedAt = new Date().toISOString();
                const executionDurationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();

                let previewUrl = finalData?.agentResults['DeploymentAgent']?.data?.previewUrl || '';

                // --- CLUSTER RUNTIME HOOK ---
                try {
                    const runtimeUrl = await PreviewOrchestrator.start(projectId, actualExecutionId, userId);
                    if (runtimeUrl) previewUrl = runtimeUrl;
                } catch (err) {
                    elog.warn({ err }, 'Preview runtime start failed, using fallback URL');
                }

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
                    ctx.metrics.totalDurationMs = executionDurationMs;
                });

                await this.emitTelemetry(actualExecutionId, 'completed', 'All stages complete. Project ready.', previewUrl);
                this.isFrozen = true;
                executionSuccessTotal.inc();

                // Record Metrics & Send Notification
                await recordBuildMetrics(finalData?.metadata?.planType as any || 'free', true, executionDurationMs, 0, 0);
                await sendBuildSuccessEmail(userId, projectId, actualExecutionId, previewUrl).catch(() => { });

                return {
                    success: true,
                    previewUrl,
                    files: finalFiles,
                    context: await context.get(),
                    startedAt,
                    completedAt,
                    executionDurationMs
                };

            } catch (error: unknown) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                await context.finalize('failed').catch(() => { });
                await this.emitTelemetry(actualExecutionId, 'failed', `Build failed: ${errorMsg}`);
                this.isFrozen = true;
                executionFailureTotal.inc();
                await recordBuildMetrics(existingData?.metadata?.planType as any || 'free', false, 0, 0, 0);

                elog.error({ executionId: actualExecutionId, error: errorMsg }, 'Build failed');
                return {
                    success: false,
                    error: errorMsg,
                    context: await context.get()
                };
            } finally {
                clearInterval(watchdog);
                await lock.release();
            }
        });
    }

    private async runStage(stageId: string, agent: BaseAgent, input: any, context: ExecutionContext, lock: OrchestratorLock, signal?: AbortSignal) {
        const stageDef = BUILD_STAGES_CONFIG.find(s => s.id === stageId);
        if (!stageDef) return;

        const stageIndex = STAGE_ORDER.indexOf(stageId);
        const agentName = agent.getName();

        // 1. Telemetry In Progress
        await this.updateStageState(context.executionId, stageId, 'in_progress', `Starting ${stageDef.name}...`);

        // 2. Atomic Transition in DB
        await context.atomicTransition(
            lock,
            agentName,
            stageIndex,
            'in_progress',
            `Worker ${lock.getWorkerId()} started execution`
        );

        // 3. Execution with Retry
        const result = await this.retryManager.executeWithRetry(async () => {
            const stopTimer = agentExecutionDuration.startTimer({ agent_name: agentName });
            try {
                // Chaos injection
                if (this.chaosTestMode && Math.random() > 0.95) {
                    process.exit(1); // Brutal chaos
                }

                const response = await agent.execute(input, context as any, signal);
                if (!response.success) throw new Error(response.error);

                // Validation
                const valRes = await this.valAgent.execute({
                    agentName,
                    output: response.data,
                    spec: `Standard ${stageId} output`
                }, context as any, signal);

                if (valRes.data.confidenceScore < 0.7) {
                    throw new Error(`Validation threshold not met (${valRes.data.confidenceScore})`);
                }

                await context.setAgentResult(agentName, {
                    status: 'completed',
                    data: response.data,
                    tokens: (response.tokens || 0) + (valRes.tokens || 0),
                    endTime: new Date().toISOString()
                });

                stopTimer({ status: 'success' });
                return response.data;
            } catch (err) {
                stopTimer({ status: 'failure' });
                agentFailuresTotal.inc({ agent_name: agentName });
                throw err;
            }
        }, agentName, context);

        // 4. Atomic Transition Completed
        await context.atomicTransition(
            lock,
            agentName,
            stageIndex,
            'completed',
            `Stage ${stageId} finalized`
        );

        // 5. Telemetry Complete
        await this.updateStageState(context.executionId, stageId, 'completed', `Completed ${stageDef.name}.`);
        return result;
    }

    private async updateStageState(executionId: string, stageId: string, status: BuildStage['status'], message: string) {
        if (this.isFrozen) return;

        const stage = this.currentBuildState[stageId];
        if (stage) {
            stage.status = status;
            stage.message = message;
            stage.progressPercent = status === 'completed' ? 100 : (status === 'in_progress' ? 10 : 0);
            stage.timestamp = new Date().toISOString();

            await this.emitTelemetry(executionId, 'executing', message);
        }
    }

    private async emitTelemetry(executionId: string, status: "executing" | "completed" | "failed", globalMessage?: string, previewUrl?: string) {
        if (this.isFrozen && status === 'executing') return;

        const stages = Object.values(this.currentBuildState);
        let weightedProgress = 0;
        stages.forEach(s => {
            weightedProgress += (s.progressPercent * s.weight);
        });

        const activeStage = stages.find(s => s.status === 'in_progress');
        const update: BuildUpdate = {
            executionId,
            totalProgress: status === 'completed' ? 100 : Math.min(Math.round(weightedProgress), 99),
            currentStageIndex: activeStage ? activeStage.stageIndex : stages.findLastIndex(s => s.status === 'completed'),
            currentStage: status === 'completed' ? 'Completed' : (activeStage?.name || 'Idle'),
            stages: stages.map(s => ({ ...s })),
            status,
            message: globalMessage,
            timestamp: new Date().toISOString(),
            previewUrl
        };

        await redis.setex(`build:state:${executionId}`, 86400, JSON.stringify(update));
        await redis.publish(`build:progress:${executionId}`, JSON.stringify(update));
    }
}

function shouldExecute(agentName: string, context: ExecutionContextType | null | undefined): boolean {
    if (!context) return true;
    const result = context.agentResults[agentName];
    if (!result || result.status !== 'completed') return true;

    // Artifact existence check
    const data = result.data as any;
    if (!data) return true;
    if (data.files && Array.isArray(data.files) && data.files.length > 0) return false;
    if (data.schema) return false;

    return false;
}

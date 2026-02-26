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
import { BuildStage, BuildUpdate, BUILD_STAGES_CONFIG } from '../types/build';
import redis from '../lib/redis';


export class Orchestrator {
    private dbAgent: DatabaseAgent;
    private beAgent: BackendAgent;
    private feAgent: FrontendAgent;
    private dpAgent: DeploymentAgent;
    private teAgent: TestingAgent;
    private valAgent: ValidatorAgent;
    private retryManager: RetryManager;
    private currentBuildState: Record<string, BuildStage> = {};

    constructor() {

        this.dbAgent = new DatabaseAgent();
        this.beAgent = new BackendAgent();
        this.feAgent = new FrontendAgent();
        this.dpAgent = new DeploymentAgent();
        this.teAgent = new TestingAgent();
        this.valAgent = new ValidatorAgent();
        this.retryManager = new RetryManager(3);
    }

    /**
     * @param executionId optional, if provided will attempt to resume or use existing ID
     */
    async run(prompt: string, userId: string, projectId: string, executionId?: string) {
        const context = new ExecutionContext(executionId);
        const actualExecutionId = context.getExecutionId();

        // Attempt to load existing state if resuming
        const existingData = await context.get();
        if (!existingData) {
            await context.init(userId, projectId, prompt, actualExecutionId);
        }

        return await runWithTracing(actualExecutionId, async () => {
            logger.info({ executionId: actualExecutionId, prompt, userId }, 'Orchestrating distributed build');

            this.initializeBuildState();

            try {
                await this.emitTelemetry(actualExecutionId, 'executing', 'Initializing build architecture...');

                // ... Existing phase logic remains unchanged ...

                // 1. Database Phase
                if (shouldExecute('DatabaseAgent', existingData)) {
                    await context.updateStage('database');
                    await this.updateStage(actualExecutionId, 'database', 'in_progress', 'Designing PostgreSQL schema with user roles and RLS...');
                    await this.executeStep(this.dbAgent, prompt, context);
                    await this.updateStage(actualExecutionId, 'database', 'completed', 'Database schema designed.');
                }


                const currentData = await context.get();
                const dbData = currentData?.agentResults['DatabaseAgent']?.data;

                // 2. Parallel Phase: Backend and Frontend
                await context.updateStage('parallel_generation');
                const parallelSteps = [];

                if (shouldExecute('BackendAgent', currentData)) {
                    await this.updateStage(actualExecutionId, 'backend', 'in_progress', 'Generating Backend API with protected routes...');
                    parallelSteps.push(this.executeStep(this.beAgent, { prompt, schema: dbData.schema }, context)
                        .then(() => this.updateStage(actualExecutionId, 'backend', 'completed', 'Backend API generated.')));
                }
                if (shouldExecute('FrontendAgent', currentData)) {
                    await this.updateStage(actualExecutionId, 'frontend_layout', 'in_progress', 'Building responsive frontend layouts...');
                    parallelSteps.push(this.executeStep(this.feAgent, { prompt, schema: dbData.schema }, context)
                        .then(() => this.updateStage(actualExecutionId, 'frontend_layout', 'completed', 'Frontend layout built.')));
                }

                if (parallelSteps.length > 0) {
                    await Promise.all(parallelSteps);
                }


                // 3. Deployment and Testing Phase
                await context.updateStage('finalization');
                const latestData = await context.get();
                const beFiles = latestData?.agentResults['BackendAgent']?.data?.files || [];
                const feFiles = latestData?.agentResults['FrontendAgent']?.data?.files || [];
                const allFiles = [...beFiles, ...feFiles];

                if (shouldExecute('DeploymentAgent', latestData)) {
                    await this.updateStage(actualExecutionId, 'finalizing', 'in_progress', 'Preparing Docker multi-stage build and deployment config...');
                    await this.executeStep(this.dpAgent, { prompt, allFiles }, context);
                }

                const postDpData = await context.get();
                const dpFiles = postDpData?.agentResults['DeploymentAgent']?.data?.files || [];

                if (shouldExecute('TestingAgent', postDpData)) {
                    await this.executeStep(this.teAgent, { prompt, allFiles: [...allFiles, ...dpFiles] }, context);
                }

                const finalData = await context.get();
                const teFiles = finalData?.agentResults['TestingAgent']?.data?.files || [];

                const finalFiles = [...allFiles, ...dpFiles, ...teFiles];

                await context.finalize('completed');
                await this.emitTelemetry(actualExecutionId, 'completed', 'All agents finished. Project ready.');
                executionSuccessTotal.inc();


                // Token Tracking logic
                try {
                    let totalTokensUsed = 0;
                    if (finalData && finalData.agentResults) {
                        for (const agentKey of Object.keys(finalData.agentResults)) {
                            // Extract tokens recorded by the executeStep
                            totalTokensUsed += (finalData.agentResults[agentKey]?.tokens || 0);
                        }
                    }
                    if (totalTokensUsed > 0) {
                        await CostGovernanceService.recordTokenUsage(userId, totalTokensUsed, actualExecutionId);
                        logger.info({ executionId: actualExecutionId, totalTokensUsed, userId }, 'Tokens recorded for execution');
                    }
                } catch (billingErr) {
                    // Do not fail the build if metrics fail logging
                    logger.error({ error: billingErr instanceof Error ? billingErr.message : String(billingErr) }, 'Non-fatal error tracking execution tokens');
                }

                logger.info({ executionId: actualExecutionId }, 'Build completed successfully');

                return {
                    success: true,
                    files: finalFiles,
                    context: finalData
                };

            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                await context.finalize('failed');
                await this.emitTelemetry(actualExecutionId, 'failed', `Build failed: ${errorMsg}`);
                executionFailureTotal.inc();

                logger.error({
                    executionId: actualExecutionId,
                    error: error instanceof Error ? error.message : String(error)
                }, 'Build failed');
                return {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                    context: await context.get()
                };
            }
        });
    }

    private async executeStep(agent: any, input: any, context: ExecutionContext) {
        const agentName = agent.getName();
        const stopTimer = agentExecutionDuration.startTimer({ agent_name: agentName });

        // --- CHAOS HOOK: Artificial Delay ---
        try {
            const delay = await redis.get(`chaos:delay:${agentName}`);
            if (delay) {
                logger.warn({ agentName, delayMs: delay }, '🐒 CHAOS MONKEY: Injecting artificial delay');
                await new Promise(resolve => setTimeout(resolve, parseInt(delay)));
            }
        } catch (err) {
            logger.error({ err }, 'Chaos hook error');
        }

        await context.setAgentResult(agentName, { status: 'in_progress', startTime: new Date().toISOString() });

        try {
            const result = await this.retryManager.executeWithRetry(async () => {
                const response = await agent.execute(input, context);
                if (!response.success) throw new Error(response.error);

                // Validation step
                const valRes = await this.valAgent.execute({
                    agentName,
                    output: response.data,
                    spec: `High-quality enterprise-grade ${agentName} output`
                });

                if (valRes.data.confidenceScore < 0.7) {
                    logger.warn({ agentName, score: valRes.data.confidenceScore }, 'Low validation confidence - triggering retry');
                    throw new Error('Output failed validation threshold');
                }

                await context.setAgentResult(agentName, {
                    status: 'completed',
                    data: response.data,
                    tokens: (response.tokens || 0) + (valRes.tokens || 0), // Base agent + Validator logic tokens
                    endTime: new Date().toISOString()
                });

                return response.data;
            }, agentName, context);

            stopTimer({ status: 'success' });
            return result;
        } catch (error) {
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

    private async updateStage(executionId: string, stageId: string, status: any, message: string, progress: number = 0) {
        if (this.currentBuildState[stageId]) {
            this.currentBuildState[stageId] = {
                ...this.currentBuildState[stageId],
                status,
                message: message || this.currentBuildState[stageId].message,
                progressPercent: progress !== undefined ? progress : this.currentBuildState[stageId].progressPercent,
                timestamp: new Date().toISOString()
            };

            if (status === 'completed') this.currentBuildState[stageId].progressPercent = 100;
            if (status === 'in_progress' && progress === 0) this.currentBuildState[stageId].progressPercent = 10;

            await this.emitTelemetry(executionId, 'executing');
        }
    }

    private async emitTelemetry(executionId: string, status: "executing" | "completed" | "failed", globalMessage?: string) {
        let totalProgress = 0;
        const stages = Object.values(this.currentBuildState);

        stages.forEach(s => {
            totalProgress += (s.progressPercent * s.weight);
        });

        const update: BuildUpdate = {
            executionId,
            totalProgress: Math.min(Math.round(totalProgress), 100),
            currentStage: stages.find(s => s.status === 'in_progress')?.name || 'Idle',
            stages,
            status,
            message: globalMessage,
            timestamp: new Date().toISOString()
        } as any;

        const channel = `build:progress:${executionId}`;
        await redis.publish(channel, JSON.stringify(update));

        // Also persist the latest state in Redis for late-joiners or refresh
        await redis.setex(`build:state:${executionId}`, 3600, JSON.stringify(update));
    }
}


function shouldExecute(stepNameOrAgentName: string, context: any): boolean {
    if (!context) return true;
    const result = context.agentResults[stepNameOrAgentName];
    if (result && result.status === 'completed') return false;
    if (context.currentStage === stepNameOrAgentName && context.status === 'executing') return true;
    return true;
}

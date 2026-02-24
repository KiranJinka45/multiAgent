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

export class Orchestrator {
    private dbAgent: DatabaseAgent;
    private beAgent: BackendAgent;
    private feAgent: FrontendAgent;
    private dpAgent: DeploymentAgent;
    private teAgent: TestingAgent;
    private valAgent: ValidatorAgent;
    private retryManager: RetryManager;

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

            try {
                // ... Existing phase logic remains unchanged ...

                // 1. Database Phase
                if (shouldExecute('DatabaseAgent', existingData)) {
                    await context.updateStage('database');
                    await this.executeStep(this.dbAgent, prompt, context);
                }

                const currentData = await context.get();
                const dbData = currentData?.agentResults['DatabaseAgent']?.data;

                // 2. Parallel Phase: Backend and Frontend
                await context.updateStage('parallel_generation');
                const parallelSteps = [];

                if (shouldExecute('BackendAgent', currentData)) {
                    parallelSteps.push(this.executeStep(this.beAgent, { prompt, schema: dbData.schema }, context));
                }
                if (shouldExecute('FrontendAgent', currentData)) {
                    parallelSteps.push(this.executeStep(this.feAgent, { prompt, schema: dbData.schema }, context));
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
                        await CostGovernanceService.recordTokenUsage(userId, totalTokensUsed);
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
                await context.finalize('failed');
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
}

function shouldExecute(stepNameOrAgentName: string, context: any): boolean {
    if (!context) return true;
    const result = context.agentResults[stepNameOrAgentName];
    if (result && result.status === 'completed') return false;
    if (context.currentStage === stepNameOrAgentName && context.status === 'executing') return true;
    return true;
}

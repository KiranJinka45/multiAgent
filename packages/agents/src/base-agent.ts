import { Groq } from 'groq-sdk';
import logger from '@libs/utils';
import { AgentRequest, AgentResponse } from '@libs/contracts';
import { breakers } from '@libs/utils';
import { eventBus } from '@libs/utils';
import { RetryManager } from '@libs/utils';
import { StrategyConfig } from '@libs/utils';
import { selectModel, RoutingContext, TaskType } from '@libs/ai';
import { CostGovernanceService, SemanticCacheService } from '@libs/utils';

const retry = new RetryManager(5, 3000); // 5 retries, 3s base delay

export abstract class BaseAgent {
    protected groq: Groq;
    protected logs: string[] = [];

    constructor() {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) throw new Error(`${this.getName()} requires GROQ_API_KEY`);
        this.groq = new Groq({ apiKey });
    }

    protected log(message: string, meta: Record<string, unknown> = {}) {
        const { executionId, ...rest } = meta;
        logger.info({ agent: this.getName(), ...rest }, message);
        
        if (executionId) {
            eventBus.thought(executionId as string, this.getName(), message);
        }
    }

    abstract getName(): string;

    abstract execute(request: AgentRequest, signal?: AbortSignal, strategy?: StrategyConfig): Promise<AgentResponse>;

    protected async promptLLM(
        system: string, 
        user: string, 
        request: AgentRequest,
        signal?: AbortSignal, 
        strategy?: StrategyConfig
    ) {
        const taskType = request.taskType || 'code-gen';
        const context: RoutingContext = {
            fileCount: request.context.fileCount,
            errorDepth: request.context.errorDepth,
        };

        const modelConfig = await selectModel(taskType as TaskType, context);
        const model = modelConfig.model;
        const temperature = strategy?.temperature ?? 0.7;

        // --- PRE-FLIGHT BUDGET CHECK ---
        const budgetStatus = await CostGovernanceService.checkTokenLimit(request.tenantId);
        if (!budgetStatus.allowed) {
            this.log(`Critical: Budget exceeded for tenant ${request.tenantId}. Halted.`);
            throw new Error(`BudgetExceeded: Monthly token limit reached for tenant ${request.tenantId}`);
        }

        // --- SEMANTIC CACHE LOOKUP ---
        const cachedResult = await SemanticCacheService.get(user, system, model);
        if (cachedResult) {
            this.log(`Semantic Cache HIT - Reusing result for ${taskType}`);
            return cachedResult;
        }

        this.log(`Invoking LLM (${model}) for task: ${taskType} [Tier: ${modelConfig.quality > 0.9 ? 'PREMIUM' : 'BALANCED'}]`);

        try {
            const llmResponse = await retry.executeWithRetry(async () => {
                return await breakers.llm.execute(async () => {
                    const response = await this.groq.chat.completions.create({
                        messages: [
                            { role: 'system', content: system },
                            { role: 'user', content: user }
                        ],
                        model,
                        temperature,
                        response_format: { type: 'json_object' }
                    }, { signal });

                    const content = response.choices[0].message.content;
                    const tokensUsed = response.usage?.total_tokens || 0;

                    if (!content) throw new Error('Empty response from LLM');

                    // --- COST GOVERNANCE & TRACKING ---
                    const executionId = (request.context as { executionId?: string })?.executionId || 'unknown';
                    await CostGovernanceService.recordTokenUsage(request.tenantId, tokensUsed, executionId);

                    const result = {
                        result: JSON.parse(content),
                        tokens: tokensUsed,
                        promptTokens: response.usage?.prompt_tokens || 0,
                        completionTokens: response.usage?.completion_tokens || 0
                    };

                    // --- PERSIST TO CACHE ---
                    await SemanticCacheService.set(user, result, system, model);

                    return result;
                });
            }, this.getName(), {});

            return llmResponse;
        } catch (error) {
            this.log(`LLM invocation failed: ${error}`);
            throw error;
        }
    }
}

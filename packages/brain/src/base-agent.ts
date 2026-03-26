import { Groq } from 'groq-sdk';
import { logger } from '@libs/observability';
import { AgentContext } from '@libs/contracts';
import { breakers, eventBus, RetryManager, StrategyConfig, usageService, SemanticCacheService } from '@libs/utils/server';

const retry = new RetryManager(5, 3000); // 5 retries, 3s base delay

export interface AgentResponse<T = unknown> {
    success: boolean;
    data: T;
    logs?: string[];
    error?: string;
    confidence?: number;
    tokens?: number;
    promptTokens?: number;
    completionTokens?: number;
}

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
            eventBus.thought(executionId, this.getName(), message);
        }
    }

    abstract getName(): string;

    protected abstract run(input: unknown, context: AgentContext, signal?: AbortSignal, strategy?: StrategyConfig): Promise<AgentResponse>;

    async execute(input: unknown, context: AgentContext, signal?: AbortSignal, strategy?: StrategyConfig): Promise<AgentResponse> {
        const start = Date.now();
        const { db } = await import('@libs/db');
        
        // 1. Resolve Active Strategy (Level 4 Adaptation)
        let activeStrategy = strategy;
        try {
            const persistedStrategy = await db.strategy.findFirst({
                where: { agent: this.getName(), isActive: true }
            });
            if (persistedStrategy) {
                activeStrategy = { 
                    ...strategy, 
                    ...(persistedStrategy.config as any) 
                };
            }
        } catch (err) {
            this.log('Failed to fetch active strategy, using default');
        }

        // 2. Governance Gate (Level 5 Safety)
        if (this.getName() === 'EvolutionAgent') {
            const { GovernanceEngine } = await import('@libs/core-engine');
            // Simplified check: we'll check governance inside EvolutionAgent.run or here.
            // For now, we ensure the engine is accessible.
        }

        try {
            const result = await this.run(input, context, signal, activeStrategy);

            // 2. Capture Execution Telemetry
            await db.executionLog.create({
                data: {
                    taskType: this.getName(),
                    input: input as any,
                    output: result as any,
                    success: result.success,
                    latency: Date.now() - start,
                    cost: result.tokens ? (result.tokens / 1000) * 0.01 : 0, // Simplified cost model
                }
            }).catch(err => logger.error({ err }, '[BaseAgent] Telemetry logging failed'));

            return result;

        } catch (err: any) {
            await db.executionLog.create({
                data: {
                    taskType: this.getName(),
                    input: input as any,
                    output: { error: err.message } as any,
                    success: false,
                    latency: Date.now() - start,
                    cost: 0,
                }
            }).catch(e => logger.error({ e }, '[BaseAgent] Telemetry error logging failed'));

            throw err;
        }
    }

    protected async promptLLM(system: string, user: string, modelOverride?: string, signal?: AbortSignal, strategy?: StrategyConfig, context?: AgentContext) {
        const model = strategy?.model || modelOverride || 'llama-3.3-70b-versatile';
        const temperature = strategy?.temperature ?? 0.7;
        this.log(`Invoking LLM (${model}) with temperature ${temperature}`);
        
        // --- CACHE CHECK ---
        const cached = await SemanticCacheService.get<unknown>(user, system, model);
        if (cached) {
            this.log(`Cache Hit: ${model}`);
            return {
                result: cached,
                tokens: 0, // Cached results effectively use 0 tokens for the current call
                promptTokens: 0,
                completionTokens: 0
            };
        }

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
                    const promptTokens = response.usage?.prompt_tokens || 0;
                    const completionTokens = response.usage?.completion_tokens || 0;

                    if (!content) throw new Error('Empty response from LLM');

                    const result = JSON.parse(content);

                    // --- USAGE TRACKING ---
                    if (context?.userId && context?.tenantId) {
                        // Asynchronous tracking to avoid blocking the agent response
                        usageService.recordAiUsage({
                            model,
                            promptTokens,
                            completionTokens,
                            totalTokens: tokensUsed,
                            userId: context.userId,
                            tenantId: context.tenantId,
                            metadata: {
                                executionId: context.executionId,
                                agent: this.getName(),
                                model
                            }
                        }).catch(err => logger.error({ err }, '[BaseAgent] Usage tracking failed'));
                    }

                    // --- CACHE STORAGE ---
                    await SemanticCacheService.set(user, result, system, model);

                    return {
                        result,
                        tokens: tokensUsed,
                        promptTokens,
                        completionTokens
                    };
                });
            }, this.getName(), {});
            return llmResponse;
        } catch (error) {
            this.log(`LLM invocation failed: ${error}`);
            throw error;
        }
    }
}

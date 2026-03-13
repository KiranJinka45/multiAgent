import { Groq } from 'groq-sdk';
import logger from '../config/logger';
import { AgentContext } from '../types/agent-context';
import { breakers } from '../config/circuit-breaker';
import { eventBus } from '../services/event-bus';
import { RetryManager } from '../services/retry-manager';
import { StrategyConfig } from '../services/agent-intelligence/strategy-engine';

const retry = new RetryManager(5, 3000); // 5 retries, 3s base delay

export interface AgentResponse<T = any> {
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

    protected log(message: string, meta: Record<string, any> = {}) {
        const { executionId, ...rest } = meta;
        logger.info({ agent: this.getName(), ...rest }, message);
        
        if (executionId) {
            eventBus.thought(executionId, this.getName(), message);
        }
    }

    abstract getName(): string;

    abstract execute(input: any, context: AgentContext, signal?: AbortSignal, strategy?: StrategyConfig): Promise<AgentResponse>;

    protected async promptLLM(system: string, user: string, model: string = 'llama-3.3-70b-versatile', signal?: AbortSignal, strategy?: StrategyConfig) {
        const temperature = strategy?.temperature ?? 0.7;
        this.log(`Invoking LLM (${model}) with temperature ${temperature}`);
        try {
            return await retry.executeWithRetry(async () => {
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

                    return {
                        result: JSON.parse(content),
                        tokens: tokensUsed,
                        promptTokens: response.usage?.prompt_tokens || 0,
                        completionTokens: response.usage?.completion_tokens || 0
                    };
                });
            }, this.getName(), {});
        } catch (error) {
            this.log(`LLM invocation failed: ${error}`);
            throw error;
        }
    }
}

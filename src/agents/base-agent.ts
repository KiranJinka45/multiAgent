import { Groq } from 'groq-sdk';
import logger from '../lib/logger';
import { ExecutionContext } from '../lib/execution-context';
import { breakers } from '../lib/circuit-breaker';

export interface AgentResponse<T = any> {
    success: boolean;
    data: T;
    logs: string[];
    error?: string;
    confidence?: number;
    tokens?: number;
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
        const timestamp = new Date().toISOString();
        this.logs.push(`[${this.getName()}] [${timestamp}] ${message}`);
        logger.info({ agent: this.getName(), ...meta }, message);
    }

    abstract getName(): string;
    abstract execute(input: any, context?: ExecutionContext): Promise<AgentResponse>;

    protected async promptLLM(system: string, user: string, model: string = 'llama-3.3-70b-versatile') {
        this.log(`Invoking LLM (${model})`);
        try {
            return await breakers.llm.execute(async () => {
                const response = await this.groq.chat.completions.create({
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user }
                    ],
                    model,
                    response_format: { type: 'json_object' }
                });

                const content = response.choices[0].message.content;
                const tokensUsed = response.usage?.total_tokens || 0;

                if (!content) throw new Error('Empty response from LLM');

                return {
                    result: JSON.parse(content),
                    tokens: tokensUsed
                };
            });
        } catch (error) {
            logger.error({
                agent: this.getName(),
                error: error instanceof Error ? error.message : String(error)
            }, 'LLM Prompt failed');
            throw error;
        }
    }
}

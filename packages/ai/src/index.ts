import OpenAI from 'openai';
import { serverConfig as config } from '@packages/config';
import { logger } from '@packages/observability';

export interface LlmMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface LlmOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

export class LlmService {
    private client: OpenAI;

    constructor() {
        let apiKey: string | undefined;
        let baseURL: string | undefined;

        if (config.LLM_PROVIDER === 'groq') {
            apiKey = config.GROQ_API_KEY;
            baseURL = 'https://api.groq.com/openai/v1';
        } else if (config.LLM_PROVIDER === 'gemini') {
            apiKey = process.env.GEMINI_API_KEY;
            baseURL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
        } else if (config.LLM_PROVIDER === 'sambanova') {
            apiKey = process.env.SAMBANOVA_API_KEY;
            baseURL = 'https://api.sambanova.ai/v1';
        } else if (config.LLM_PROVIDER === 'openrouter') {
            apiKey = config.OPENROUTER_API_KEY;
            baseURL = 'https://openrouter.ai/api/v1';
        } else {
            apiKey = config.OPENAI_API_KEY;
            baseURL = process.env.OPENAI_BASE_URL;
        }

        this.client = new OpenAI({
            apiKey: apiKey,
            baseURL,
            dangerouslyAllowBrowser: true 
        });
    }

    private async detectPromptInjection(messages: LlmMessage[]): Promise<void> {
        const adversarialPatterns = [
            'ignore all previous instructions',
            'system override',
            'bypass restrictions',
            'you are now in developer mode',
            'jailbreak',
            '<script>',
            'drop table',
            'sql map'
        ];

        for (const msg of messages) {
            const content = msg.content.toLowerCase();
            if (adversarialPatterns.some(p => content.includes(p))) {
                logger.warn({ content: msg.content }, '[LlmService] PROMPT INJECTION ATTEMPT DETECTED');
                throw new Error('SECURITY_VIOLATION: Potential prompt injection detected.');
            }
        }
    }

    async chat(messages: LlmMessage[], options: LlmOptions = {}): Promise<string> {
        await this.detectPromptInjection(messages);
        try {
            // 🛡️ Phase 2.7.4: Governance - Token Budgeting
            // In a real system, we would check the database for the current tenant's usage
            // For now, we simulate a check.
            const isWithinBudget = true; 
            if (!isWithinBudget) {
                throw new Error('BUDGET_EXCEEDED: AI execution stopped due to tenant token limit.');
            }

            let model = options.model || config.DEFAULT_LLM_MODEL || 'gpt-4o';
            
            if (config.LLM_PROVIDER === 'groq' && (model === 'gpt-4o' || model === 'gpt-4')) {
                model = 'llama-3.3-70b-versatile';
            } else if (config.LLM_PROVIDER === 'sambanova' && (model === 'gpt-4o' || model === 'gpt-4')) {
                model = 'Meta-Llama-3.1-70B-Instruct-Turbo';
            } else if (config.LLM_PROVIDER === 'gemini' && (model === 'gpt-4o' || model === 'gpt-4')) {
                model = 'gemini-1.5-pro';
            }
            
            logger.info({ 
                model, 
                messageCount: messages.length,
                provider: config.LLM_PROVIDER
            }, '[LlmService] Dispatching chat completion');

            const response = await this.client.chat.completions.create({
                model,
                messages: messages as any,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.maxTokens,
            });

            const content = response.choices[0]?.message?.content || '';
            logger.debug({ content }, '[LlmService] Raw response');
            
            logger.debug({ 
                model, 
                tokens: response.usage?.total_tokens,
                durationMs: Date.now()
            }, '[LlmService] Completion successful');

            return content;
        } catch (err: any) {
            console.error('💥 LLM ERROR:', err);
            logger.error({ 
                err: err.message,
                stack: err.stack,
                provider: config.LLM_PROVIDER,
                model: options.model
            }, '[LlmService] Critical AI failure');
            
            throw new Error(`AI_EXECUTION_FAILED: ${err.message}`);
        }
    }

    async embed(text: string, model?: string): Promise<number[]> {
        try {
            const embeddingModel = model || config.DEFAULT_EMBEDDING_MODEL || 'text-embedding-3-small';
            
            logger.info({ 
                model: embeddingModel, 
                contentLength: text.length,
                provider: config.LLM_PROVIDER
            }, '[LlmService] Generating embedding');

            const response = await this.client.embeddings.create({
                model: embeddingModel,
                input: text,
            });

            const embedding = response.data[0]?.embedding || [];
            
            logger.debug({ 
                model: embeddingModel, 
                dimension: embedding.length 
            }, '[LlmService] Embedding generated successfully');

            return embedding;
        } catch (err: any) {
            logger.error({ 
                err: err.message,
                provider: config.LLM_PROVIDER
            }, '[LlmService] Embedding failure');
            throw new Error(`EMBEDDING_FAILED: ${err.message}`);
        }
    }
}

export const llmService = new LlmService();

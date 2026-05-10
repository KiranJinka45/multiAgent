import OpenAI from 'openai';
import { serverConfig as config } from '@packages/config';
import { logger } from '@packages/observability';

/**
 * Unified LLM Service
 * Restores the "Liveness" of the multi-agent system by providing real
 * AI capabilities via OpenAI or OpenRouter.
 */

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

    /**
     * Dispatches a chat completion request to the configured provider.
     */
    async chat(messages: LlmMessage[], options: LlmOptions = {}): Promise<string> {
        try {
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
            
            // Fallback strategy: If real LLM fails, we could return a safe error message
            // or re-throw to trigger agent-level retries.
            throw new Error(`AI_EXECUTION_FAILED: ${err.message}`);
        }
    }
}

export const llmService = new LlmService();

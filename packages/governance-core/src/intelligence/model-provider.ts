import type { CommandExecutionProposal } from '../filters/command-filter.js';
import { LlmService } from '@packages/utils';

import type { ModelTier } from './complexity-router.js';

export interface ModelProviderInterface {
    /**
     * Sends a prompt to the model and strictly expects a proposal or set of proposals in return.
     * The model CANNOT execute actions directly.
     */
    generateProposals(prompt: string, tenantId: string, tier?: ModelTier): Promise<CommandExecutionProposal[]>;
}

/**
 * A real provider using the unified LlmService.
 */
export class LiveModelProvider implements ModelProviderInterface {
    private llmService: LlmService;

    constructor() {
        this.llmService = new LlmService();
    }

    async generateProposals(prompt: string, tenantId: string): Promise<CommandExecutionProposal[]> {
        const systemPrompt = `You are a trusted system agent executing within a secure multi-tenant environment.
Your tenantId is ${tenantId}.
Generate a list of action proposals in valid JSON array format.
Each object must have: "toolName", "tenantId", "payload" (string).`;

        const responseText = await this.llmService.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
        ], {
            // Bypass safety gate here because the AgentCoordinator runs SemanticInspector *after* generation.
            bypassSafetyGate: true 
        });

        try {
            // Extract json array
            const match = responseText.match(/\[.*\]/s);
            const jsonStr = match ? match[0] : responseText;
            const parsed = JSON.parse(jsonStr) as CommandExecutionProposal[];
            
            // Enforce tenant isolation in generation output
            return parsed.map(p => ({
                ...p,
                tenantId: tenantId
            }));
        } catch {
            console.error('[LiveModelProvider] Failed to parse model output as JSON array:', responseText);
            throw new Error('MODEL_OUTPUT_INVALID_FORMAT');
        }
    }
}

import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';

/**
 * A multi-provider implementation that routes generation to different SDKs 
 * based on the requested capability tier.
 */
export class AgnosticMultiProvider implements ModelProviderInterface {
    private googleClient?: GoogleGenerativeAI;
    private anthropicClient?: Anthropic;

    constructor() {
        if (process.env.GOOGLE_API_KEY) {
            this.googleClient = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        }
        if (process.env.ANTHROPIC_API_KEY) {
            this.anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        }
    }

    async generateProposals(prompt: string, tenantId: string, tier?: ModelTier): Promise<CommandExecutionProposal[]> {
        const systemPrompt = `You are a trusted system agent executing within a secure multi-tenant environment.
Your tenantId is ${tenantId}.
Generate a list of action proposals in valid JSON array format.
Each object must have: "toolName", "tenantId", "payload" (string).`;

        let responseText = '';

        if (tier === 'SMART_TIER' || tier === 'STRATEGIC_TIER') {
            if (!this.anthropicClient) throw new Error('Anthropic API key not configured for Claude tier');
            const model = tier === 'STRATEGIC_TIER' ? 'claude-3-opus-20240229' : 'claude-3-sonnet-20240229';
            
            const msg = await this.anthropicClient.messages.create({
                model,
                max_tokens: 2000,
                system: systemPrompt,
                messages: [{ role: 'user', content: prompt }]
            });
            const block = msg.content[0];
            if (block && 'text' in block && typeof block.text === 'string') {
                responseText = block.text;
            }
            
        } else {
            // Default to Google for FAST_TIER and BALANCED_TIER
            if (!this.googleClient) throw new Error('Google API key not configured for Gemini tier');
            const model = tier === 'BALANCED_TIER' ? 'gemini-1.5-pro-latest' : 'gemini-1.5-flash-latest';
            
            const generativeModel = this.googleClient.getGenerativeModel({
                model,
                systemInstruction: systemPrompt
            });
            
            const result = await generativeModel.generateContent(prompt);
            responseText = result.response.text();
        }

        try {
            const match = responseText.match(/\[.*\]/s);
            const jsonStr = match ? match[0] : responseText;
            const parsed = JSON.parse(jsonStr) as CommandExecutionProposal[];
            
            return parsed.map(p => ({
                ...p,
                tenantId: tenantId
            }));
        } catch {
            console.error('[AgnosticMultiProvider] Failed to parse model output as JSON array:', responseText);
            throw new Error('MODEL_OUTPUT_INVALID_FORMAT');
        }
    }
}

/**
 * A stubbed/mock provider used for testing and offline modes.
 */
export class StubbedModelProvider implements ModelProviderInterface {
    async generateProposals(prompt: string, tenantId: string): Promise<CommandExecutionProposal[]> {
        return [
            {
                toolName: 'stubbed-tool',
                tenantId,
                payload: `Mock proposal for: ${prompt}`
            }
        ];
    }
}

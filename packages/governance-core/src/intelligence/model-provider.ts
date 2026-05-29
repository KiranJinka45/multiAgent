import type { CommandExecutionProposal } from '../filters/command-filter.js';
import { LlmService } from '@packages/utils';

export interface ModelProviderInterface {
    /**
     * Sends a prompt to the model and strictly expects a proposal or set of proposals in return.
     * The model CANNOT execute actions directly.
     */
    generateProposals(prompt: string, tenantId: string): Promise<CommandExecutionProposal[]>;
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
        } catch (err) {
            console.error('[LiveModelProvider] Failed to parse model output as JSON array:', responseText);
            throw new Error('MODEL_OUTPUT_INVALID_FORMAT');
        }
    }
}

/**
 * A stubbed provider used for testing the governance and isolation layers 
 * without requiring real API keys.
 */
export class StubbedModelProvider implements ModelProviderInterface {
    async generateProposals(prompt: string, tenantId: string): Promise<CommandExecutionProposal[]> {
        return [
            {
                toolName: 'read-file',
                tenantId: tenantId,
                payload: JSON.stringify({ path: '/var/lib/ztan/data.txt' })
            }
        ];
    }
}

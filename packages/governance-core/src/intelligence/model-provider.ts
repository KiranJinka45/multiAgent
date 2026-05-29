import type { CommandExecutionProposal } from '../filters/command-filter.js';

export interface ModelProviderInterface {
    /**
     * Sends a prompt to the model and strictly expects a proposal or set of proposals in return.
     * The model CANNOT execute actions directly.
     */
    generateProposals(prompt: string, tenantId: string): Promise<CommandExecutionProposal[]>;
}

/**
 * A stubbed provider used for testing the governance and isolation layers 
 * without requiring real API keys.
 */
export class StubbedModelProvider implements ModelProviderInterface {
    async generateProposals(prompt: string, tenantId: string): Promise<CommandExecutionProposal[]> {
        // Mocking a model responding with a safe read operation
        return [
            {
                toolName: 'read-file',
                tenantId: tenantId,
                payload: JSON.stringify({ path: '/var/lib/ztan/data.txt' })
            }
        ];
    }
}

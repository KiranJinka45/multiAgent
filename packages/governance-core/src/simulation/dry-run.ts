import { SideEffectOntology, SideEffectClass } from '../ontology/side-effects.js';
import type { CommandExecutionProposal } from '../filters/command-filter.js';

export interface SimulationResult {
    isSafe: boolean;
    reason?: string;
    requiresHumanEscalation: boolean;
    forecastedEffects: string[];
}

export class DryRunSimulator {
    /**
     * Simulates a command execution proposal.
     * Blocks irreversible effects and forecasts dependencies.
     */
    static simulateProposal(proposal: CommandExecutionProposal): SimulationResult {
        let sideEffectClass: SideEffectClass;
        
        try {
            const operation = SideEffectOntology.getOperation(proposal.toolName);
            sideEffectClass = operation.sideEffectClass;
        } catch (e) {
            return {
                isSafe: false,
                reason: `Tool ${proposal.toolName} is unknown to ontology`,
                requiresHumanEscalation: false,
                forecastedEffects: []
            };
        }

        const forecastedEffects: string[] = [
            `Tool ${proposal.toolName} executed in isolated namespace`,
            `Tenant boundary enforced for ${proposal.tenantId}`
        ];

        if (sideEffectClass === SideEffectClass.IRREVERSIBLE || sideEffectClass === SideEffectClass.DANGEROUS) {
            return {
                isSafe: false,
                reason: `Tool ${proposal.toolName} produces irreversible or dangerous effects.`,
                requiresHumanEscalation: true,
                forecastedEffects
            };
        }

        if (sideEffectClass === SideEffectClass.APPROVAL_REQUIRED) {
            return {
                isSafe: false,
                reason: `Tool ${proposal.toolName} strictly requires human approval.`,
                requiresHumanEscalation: true,
                forecastedEffects
            };
        }

        return {
            isSafe: true,
            requiresHumanEscalation: false,
            forecastedEffects
        };
    }
}

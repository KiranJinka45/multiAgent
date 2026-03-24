import { BaseAgent, AgentResponse } from './index';
import { AgentContext } from '@libs/contracts';
import { db } from '@libs/db';

export interface EvolutionInput {
    optimizationFocus: 'performance' | 'security' | 'ux';
}

export class EvolutionAgent extends BaseAgent {
    getName() { return 'EvolutionAgent'; }

    /**
     * Conducts autonomous product optimization by proposing structured patches.
     */
    protected async run(
        input: EvolutionInput,
        _context: AgentContext,
        signal?: AbortSignal,
        strategy?: any
    ): Promise<AgentResponse> {
        this.log(`Initiating self-evolution sequence. Focus: ${input.optimizationFocus}`);

        // 1. Fetch failure patterns and code modules
        const patterns = await db.pattern.findMany({
            where: { type: 'failure_pattern' },
            orderBy: { weight: 'desc' },
            take: 3
        });

        const modules = await db.codeModule.findMany({
            where: { riskLevel: { in: ['low', 'medium'] } }, // Start with safe modules
            take: 5
        });

        const system = `You are a Principal Evolution Engineer.
        Your goal is to propose a SAFE, surgical code improvement to resolve a system bottleneck.
        
        PATTERNS TO ADAPT:
        ${JSON.stringify(patterns, null, 2)}
        
        AVAILABLE TARGETS:
        ${JSON.stringify(modules, null, 2)}

        RULES:
        1. Only propose changes to 'low' or 'medium' risk modules.
        2. Output a structured patch and a clear reason.
        3. Do NOT suggest infra removals or security changes.
        4. Focus on ${input.optimizationFocus}.

        Output JSON:
        {
            "targetPath": "relative/path/to/file.ts",
            "changeType": "optimization",
            "reason": "Technical justification",
            "patch": "Complete new content for the file",
            "impact": { "latency": -10, "risk": "low" }
        }`;

        try {
            const { result, tokens } = await this.promptLLM(system, "Propose the most impactful safe change.", 'llama-3.3-70b-versatile', signal, strategy, _context);

            // 2. Persist the proposal for simulation
            const proposal = await db.proposedChange.create({
                data: {
                    agentId: this.getName(),
                    targetPath: result.targetPath,
                    changeType: result.changeType,
                    reason: result.reason,
                    patch: result.patch,
                    expectedImpact: result.impact,
                    status: 'proposed'
                }
            });

            this.log(`Proposal [${proposal.id}] generated for ${result.targetPath}. Status: PROPOSED.`);

            return {
                success: true,
                data: proposal,
                tokens
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}

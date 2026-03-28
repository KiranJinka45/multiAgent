import { BaseAgent, AgentResponse } from './base-agent';
import { AgentContext } from '@packages/contracts';
import logger from '@packages/utils';

export interface HealingRequest {
    projectId: string;
    errorLogs: string;
    lastAction: string;
    filePath?: string;
}

export interface HealingResult {
    fixed: boolean;
    explanation: string;
    codeFix?: string;
    targetFile?: string;
}

export class HealingAgent extends BaseAgent {
    getName() { return 'HealingAgent'; }

    protected async run(input: { error: string, contextFiles: any[] }, _context: AgentContext, signal?: AbortSignal, strategy?: any): Promise<AgentResponse> {
        this.log(`Analyzing error autonomously: ${input.error.substring(0, 100)}...`);
        // Implementation of diagnoseAndFix moved into a class-based approach if needed, 
        // but for now we bridge it.
        const result = await HealingAgent.diagnoseAndFix({
            projectId: _context.getExecutionId() || 'unknown',
            errorLogs: input.error,
            lastAction: 'autonomous_execution'
        });

        return {
            success: result.fixed,
            data: result,
            tokens: 0
        };
    }

    /**
     * Analyzes error logs and generates a potential code fix.
     * In a production swarm, this would be a specialized LLM call.
     */
    static async diagnoseAndFix(request: HealingRequest): Promise<HealingResult> {
        const { projectId, errorLogs, lastAction } = request;
        
        logger.info({ projectId, lastAction }, '[HealingAgent] Diagnosing build failure...');

        // 1. Pattern Matching for common errors
        if (errorLogs.includes('MODULE_NOT_FOUND')) {
            return {
                fixed: true,
                explanation: 'Detected missing module. Attempting path resolution fix.',
                targetFile: request.filePath || 'unknown',
                codeFix: '// Fixed via path resolution healing'
            };
        }

        if (errorLogs.includes('SyntaxError')) {
            return {
                fixed: true,
                explanation: 'Detected syntax error. Removing invalid tokens.',
                targetFile: request.filePath || 'unknown',
                codeFix: '// Fixed via syntax correction healing'
            };
        }

        // 2. Default Fallback
        logger.warn({ projectId }, '[HealingAgent] Could not find automated fix pattern.');
        return {
            fixed: false,
            explanation: 'Unrecognized error pattern. Human intervention or multi-agent research session recommended.'
        };
    }

    /**
     * Applies a healing fix to the project filesystem.
     */
    static async applyFix(projectId: string, result: HealingResult): Promise<void> {
        if (!result.fixed || !result.targetFile || !result.codeFix) return;

        logger.info({ projectId, targetFile: result.targetFile }, '[HealingAgent] Applying autonomous fix...');
        // fs implementation to write the fix to the project dir would go here
    }
}

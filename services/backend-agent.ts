import { BaseAgent, AgentResponse } from '@services/base-agent';
import type { AgentContext } from '@shared-types/agent-context';

export class BackendAgent extends BaseAgent {
    getName() { return 'BackendAgent'; }

    async execute(input: { prompt: string, schema?: string, isIncremental?: boolean, affectedFiles?: string[] }, _context: AgentContext, signal?: AbortSignal): Promise<AgentResponse> {
        if (input.isIncremental) {
            const beFiles = input.affectedFiles?.filter(f => f.includes('api/') || f.includes('middleware') || f.includes('lib/'));
            if (!beFiles || beFiles.length === 0) {
                this.log(`Skipping Backend generation (no backend files affected in incremental build)`);
                return { success: true, data: { files: [] }, tokens: 0, logs: this.logs };
            }
        }
        void _context;
        this.log(`Generating Backend API and logic based on schema...`);
        try {
            const system = `You are a Senior Backend Engineer. 
            Design a robust AI-powered backend (API routes, controllers, middleware).
            Include proper error handling and input validation.
            Output JSON with "files" (array of {path: string, content: string}) for the backend.`;

            const { result, tokens } = await this.promptLLM(system, `Project: ${input.prompt}\nSchema: ${input.schema || 'No explicit schema provided'}`, 'llama-3.3-70b-versatile', signal);

            this.log(`Generated ${result.files?.length || 0} backend files`);
            return {
                success: true,
                data: result,
                tokens,
                logs: this.logs
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                logs: this.logs,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}

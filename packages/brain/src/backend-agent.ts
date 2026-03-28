import { BaseAgent, AgentResponse } from './base-agent';
import type { AgentContext } from '@packages/contracts';

export class BackendAgent extends BaseAgent {
    getName() { return 'BackendAgent'; }

    protected async run(input: { prompt: string, schema?: string, isIncremental?: boolean, affectedFiles?: string[] }, _context: AgentContext, signal?: AbortSignal, strategy?: any): Promise<AgentResponse> {
        if (input.isIncremental) {
            const beFiles = input.affectedFiles?.filter(f => f.includes('api/') || f.includes('middleware') || f.includes('lib/'));
            if (!beFiles || beFiles.length === 0) {
                this.log(`Skipping Backend generation (no backend files affected in incremental build)`);
                return { success: true, data: { files: [] }, tokens: 0 };
            }
        }
        void _context;
        this.log(`Generating Backend API and logic based on schema...`);
        try {
            const system = `You are a Senior Backend Engineer. 
            Design a robust AI-powered backend (API routes, controllers, middleware).
            Include proper error handling and input validation.
            Output JSON with "files" (array of {path: string, content: string}) for the backend.`;

            const { result, tokens } = await this.promptLLM(system, `Project: ${input.prompt}\nSchema: ${input.schema || 'No explicit schema provided'}`, 'llama-3.3-70b-versatile', signal, strategy, _context);

            const files = result.files || [];
            const vfs = _context.getVFS();
            
            for (const file of files) {
                vfs.setFile(file.path, file.content, true, this.getName());
            }

            this.log(`Generated and stored ${files.length} backend files in VFS`);
            return {
                success: true,
                data: {
                    fileCount: files.length,
                    paths: files.map((f: any) => f.path)
                },
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

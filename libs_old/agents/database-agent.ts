import { BaseAgent, AgentResponse } from '@agents/base-agent';
import { AgentContext } from '@shared-types/agent-context';

export class DatabaseAgent extends BaseAgent {
    getName() { return 'DatabaseAgent'; }

    async execute(input: { prompt: string; isIncremental?: boolean; affectedFiles?: string[] } | string, _context: AgentContext, signal?: AbortSignal, strategy?: any): Promise<AgentResponse> {
        // Handle both legacy string prompt or new incremental object payload
        const prompt = typeof input === 'string' ? input : input.prompt;

        if (typeof input === 'object' && input.isIncremental) {
            const dbFiles = input.affectedFiles?.filter((f: string) => f.includes('schema') || f.includes('migration') || f.includes('seed'));
            if (!dbFiles || dbFiles.length === 0) {
                this.log(`Skipping Database schema generation (no database files affected in incremental build)`);
                return { success: true, data: { schema: '', entities: [] }, tokens: 0 };
            }
        }
        void _context;
        this.log(`Designing schema for: ${prompt}`);
        try {
            const system = `You are a Senior Database Architect. 
            Analyze the project requirements and design a robust SQL schema.
            Output JSON with "schema" (SQL string) and "entities" (array of table names).`;

            const { result, tokens } = await this.promptLLM(system, `Project: ${prompt}`, 'llama-3.3-70b-versatile', signal, strategy);

            this.log(`Schema designed with tables: ${result.entities?.join(', ')}`);
            return {
                success: true,
                data: result,
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

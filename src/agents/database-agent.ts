import { BaseAgent, AgentResponse } from './base-agent';
import { ExecutionContext } from '../lib/execution-context';

export class DatabaseAgent extends BaseAgent {
    getName() { return 'DatabaseAgent'; }

    async execute(prompt: string, context?: ExecutionContext): Promise<AgentResponse> {
        this.log(`Designing schema for: ${prompt}`);
        try {
            const system = `You are a Senior Database Architect. 
            Analyze the project requirements and design a robust SQL schema.
            Output JSON with "schema" (SQL string) and "entities" (array of table names).`;

            const { result, tokens } = await this.promptLLM(system, `Project: ${prompt}`);

            this.log(`Schema designed with tables: ${result.entities?.join(', ')}`);
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

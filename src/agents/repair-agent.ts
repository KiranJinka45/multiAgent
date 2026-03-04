import { BaseAgent, AgentResponse } from './base-agent';
import { AgentContext } from '../types/agent-context';

export interface Patch {
    path: string;
    content: string;
}

export class RepairAgent extends BaseAgent {
    getName() { return 'RepairAgent'; }

    async execute(input: { error: string, stdout: string, files: any[] }, _context: AgentContext, signal?: AbortSignal): Promise<AgentResponse> {
        this.log(`Analyzing build/runtime error autonomously...`);
        try {
            const system = `You are a Senior Autonomous AI Software Healer (like Devin). 
A generative project hit a fatal compilation, dependency, or runtime error during sandboxed build. 

Your task is to deeply analyze the stderr logs and the current files, and output surgical patches to repair the codebase. 

Output strictly verifiable JSON matching this schema:
{
  "explanation": "Brief technical reasoning for why it failed and how you are fixing it",
  "patches": [
    {
      "path": "the file path relative to root (e.g. app/page.tsx or package.json)",
      "content": "the complete rewritten file content fixing the issue"
    }
  ]
}
Only output patches for files that strictly caused the dependency or syntax error. Ensure output is syntactically valid TypeScript or JSON. Prevent hallucinations.`;

            const prompt = `
ERROR (STDERR): 
${input.error.substring(0, 3000)}

STDOUT:
${input.stdout.substring(0, 1000)}

CURRENT FILE MAP:
${JSON.stringify(input.files)}
`;

            const { result, tokens } = await this.promptLLM(system, prompt, 'llama-3.3-70b-versatile', signal);

            this.log(`Emitted ${result.patches?.length || 0} autonomous patches. Diagnosis: ${result.explanation}`);

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

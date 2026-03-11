import { BaseAgent, AgentResponse } from './base-agent';
import { AgentContext } from '../types/agent-context';

export interface Patch {
    path: string;
    content: string;
}

export class RepairAgent extends BaseAgent {
    getName() { return 'RepairAgent'; }

    async execute(input: { stderr: string, stdout: string, files: any[], command?: string }, _context: AgentContext, signal?: AbortSignal, strategy?: any): Promise<AgentResponse> {
        this.log(`Analyzing build/runtime error autonomously...`);
        try {
            const system = `You are a Senior Autonomous AI Software Healer.
A generative project hit a fatal compilation, dependency, or runtime error during build validation.

Your task is to:
1. Identify the root cause from the stderr and build logs.
2. Determine if it's a missing npm dependency, a syntax error, or a configuration issue.
3. Output surgical patches to repair the codebase.

REPAIR STRATEGY:
- If a module is missing (e.g., "Module not found: react-hook-form"), include an update to 'package.json'.
- If there's a syntax error (e.g., "Unexpected token"), rewrite the specific file.
- If it's a Next.js/Tailwind config issue, fix the configuration file.

Output strictly verifiable JSON matching this schema:
{
  "explanation": "Root cause analysis and fix strategy",
  "missingDependencies": ["list", "of", "npm", "packages", "to", "install"],
  "patches": [
    {
      "path": "the file path relative to root",
      "content": "the complete rewritten file content"
    }
  ],
  "confidenceScore": 0.0-1.0
}
Ensure output is syntactically valid TypeScript or JSON. Prevent hallucinations.`;

            const prompt = `
FAILED COMMAND: ${input.command || 'unknown'}
ERROR (STDERR): 
${input.stderr.substring(0, 4000)}

STDOUT:
${input.stdout.substring(0, 1000)}

CURRENT FILE MAP:
${JSON.stringify(input.files.map(f => ({ path: f.path, size: f.content?.length || 0 })))}
`;

            const { result, tokens } = await this.promptLLM(system, prompt, 'llama-3.3-70b-versatile', undefined, strategy);

            this.log(`Emitted ${result.patches?.length || 0} patches and identified ${result.missingDependencies?.length || 0} missing deps. Diagnosis: ${result.explanation}`);

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

import { BaseAgent, AgentResponse, AgentRequest } from './base-agent';

export interface PolishResult {
  modifiedFiles: { path: string; content: string }[];
  summary: string;
}

/**
 * PolishAgent — Post-generation styling refiner.
 * 
 * Focues on:
 * - Fixing inconsistent spacing/padding.
 * - Improving typography hierarchy.
 * - Ensuring mobile responsiveness via Tailwind prefixes.
 * - Aligning colors to a premium palette.
 */
export class PolishAgent extends BaseAgent {
  getName() { return 'PolishAgent'; }

  async execute(
    request: AgentRequest<{
      files: { path: string; content: string }[];
    }>,
    signal?: AbortSignal
  ): Promise<AgentResponse<PolishResult>> {
    const { params } = request;
    const start = Date.now();
    this.log(`Polishing ${params.files.length} UI files...`);

    try {
      const system = `You are a World-Class Frontend UI/UX Engineer.
Your goal is to take existing React/Tailwind code and make it "Pixel Perfect" and "Premium".

DIRECTIONS:
1. IMPROVE SPACING: Ensure consistent padding (p-4, p-6, etc.) and margins (space-y-4).
2. TYPOGRAPHY: Ensure clear hierarchy (text-3xl font-bold for h1, text-sm text-gray-500 for subs). Use modern fonts.
3. RESPONSIVENESS: Ensure layouts work on small screens using sm:, md:, lg: prefixes.
4. VISUAL POLISH: Add subtle hover effects (hover:bg-gray-50), smooth transitions, and rounded corners (rounded-xl).
5. SHADOWS/BORDERS: Use subtle shadows (shadow-sm) and refined borders (border-gray-100).

RULES:
- Do NOT change any business logic or functionality.
- Do NOT add new components.
- Output ONLY the modified file contents.
- Return strictly valid JSON.

OUTPUT FORMAT:
{
  "modifiedFiles": [
    { "path": "src/App.tsx", "content": "..." }
  ],
  "summary": "Briefly describe the visual improvements made."
}`;

      const userPrompt = `PROJECT CONTENT:
${params.files.map(f => `--- ${f.path} ---\n${f.content.substring(0, 5000)}`).join('\n\n')}

Please apply high-end UI/UX polish to these files. Output JSON.`;

      request.taskType = 'code-gen';
      const { result, tokens } = await this.promptLLM(system, userPrompt, request, signal);
      
      const polishResult = result as PolishResult;
      this.log(`Polished ${polishResult.modifiedFiles.length} files. ${polishResult.summary}`);

      return {
        success: true,
        data: polishResult,
        artifacts: polishResult.modifiedFiles.map(f => ({ path: f.path, content: f.content, type: 'code' })),
        metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
      };
    } catch (error) {
       return {
        success: false,
        data: null as unknown as PolishResult,
        artifacts: [],
        metrics: { durationMs: 0, tokensTotal: 0 },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

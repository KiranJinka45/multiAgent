import { BaseAgent, AgentResponse } from '@libs/brain';
import { AgentContext } from '@libs/contracts';

export interface DimensionScore {
    score: number;         // 0-1
    feedback: string;      // What's good / what's lacking
    suggestions: string[]; // Specific improvements
}

export interface EvaluationResult {
    overallScore: number;  // Weighted average (0-1)
    passed: boolean;       // overallScore >= threshold
    dimensions: {
        completeness: DimensionScore; // Are all user requirements implemented?
        typeSafety: DimensionScore;   // Would tsc pass? Proper types?
        codeQuality: DimensionScore;  // Best practices, DRY, separation of concerns
        security: DimensionScore;     // Basic security checks (SQL injection, XSS, auth)
    };
    summary: string;       // One-paragraph executive summary
    criticalIssues: string[]; // Blockers that must be fixed
}

/**
 * SelfEvaluator — Multi-dimensional quality gate for autonomous builds.
 *
 * Evaluates generated code across 4 dimensions and returns a weighted
 * overall score. The autonomous orchestrator uses this to decide whether
 * the build is ready or needs another debug cycle.
 *
 * Gate threshold: overallScore >= 0.8 passes.
 */
export class SelfEvaluator extends BaseAgent {
    getName() { return 'SelfEvaluator'; }

    private static PASS_THRESHOLD = 0.8;

    async execute(
        input: {
            userPrompt: string;
            files: { path: string; content: string }[];
            techStack: Record<string, string>;
            buildErrors?: string[];
            cycleNumber?: number;
        },
        _context: AgentContext,
        signal?: AbortSignal
    ): Promise<AgentResponse<EvaluationResult>> {
        void _context;
        this.log(`Evaluating build quality (cycle ${input.cycleNumber || 1})...`);

        try {
            const system = `You are an elite AI Code Reviewer and Quality Auditor.
You must evaluate a generated codebase across 4 dimensions, each scored 0 to 1:

1. COMPLETENESS (weight 0.35): Does the code implement ALL features from the user's prompt?
   - Are all pages/routes/components present?
   - Is auth/payments/data handling implemented if requested?

2. TYPE SAFETY (weight 0.25): Would TypeScript compilation succeed?
   - Proper type annotations?
   - No implicit any?
   - Correct import paths?

3. CODE QUALITY (weight 0.25): Does it follow professional standards?
   - DRY principle, proper separation of concerns
   - Error handling, edge cases
   - Performance considerations

4. SECURITY (weight 0.15): Basic security hygiene?
   - Input validation on API routes
   - No hardcoded secrets
   - Proper authentication checks
   - SQL injection prevention

Scoring guide:
- 0.0-0.3: Critically broken / missing major features
- 0.4-0.6: Partially working, significant issues
- 0.7-0.8: Mostly good, minor issues
- 0.9-1.0: Production-quality

Output strictly valid JSON:
{
  "overallScore": 0.82,
  "passed": true,
  "dimensions": {
    "completeness": { "score": 0.9, "feedback": "...", "suggestions": ["..."] },
    "typeSafety": { "score": 0.85, "feedback": "...", "suggestions": ["..."] },
    "codeQuality": { "score": 0.75, "feedback": "...", "suggestions": ["..."] },
    "security": { "score": 0.7, "feedback": "...", "suggestions": ["..."] }
  },
  "summary": "One-paragraph executive summary of the evaluation",
  "criticalIssues": ["List of blockers that must be fixed, empty if none"]
}`;

            const filesSummary = input.files.slice(0, 20).map(f =>
                `--- ${f.path} ---\n${f.content.substring(0, 2500)}`
            ).join('\n\n');

            const userPrompt = `USER'S ORIGINAL REQUIREMENT:
${input.userPrompt}

TECH STACK: ${JSON.stringify(input.techStack)}

${input.buildErrors?.length ? `BUILD ERRORS (these must factor into type safety score):\n${input.buildErrors.join('\n')}` : 'BUILD STATUS: Clean (no errors)'}

GENERATED CODEBASE (${input.files.length} files):
${filesSummary}`;

            const { result, tokens } = await this.promptLLM(system, userPrompt, 'llama-3.3-70b-versatile', signal);

            const evaluation = result as EvaluationResult;

            // Recalculate overallScore with proper weights to avoid LLM math errors
            const weights = { completeness: 0.35, typeSafety: 0.25, codeQuality: 0.25, security: 0.15 };
            const recalculated =
                (evaluation.dimensions.completeness?.score || 0) * weights.completeness +
                (evaluation.dimensions.typeSafety?.score || 0) * weights.typeSafety +
                (evaluation.dimensions.codeQuality?.score || 0) * weights.codeQuality +
                (evaluation.dimensions.security?.score || 0) * weights.security;

            evaluation.overallScore = Math.round(recalculated * 100) / 100;
            evaluation.passed = evaluation.overallScore >= SelfEvaluator.PASS_THRESHOLD;

            this.log(`Quality Score: ${evaluation.overallScore} (${evaluation.passed ? 'PASSED ✅' : 'FAILED ❌'})`);
            this.log(`  Completeness: ${evaluation.dimensions.completeness?.score}`);
            this.log(`  Type Safety:  ${evaluation.dimensions.typeSafety?.score}`);
            this.log(`  Code Quality: ${evaluation.dimensions.codeQuality?.score}`);
            this.log(`  Security:     ${evaluation.dimensions.security?.score}`);

            if (evaluation.criticalIssues?.length) {
                this.log(`  Critical Issues: ${evaluation.criticalIssues.join('; ')}`);
            }

            return {
                success: true,
                data: evaluation,
                tokens,
                confidence: evaluation.overallScore,
                logs: this.logs
            };
        } catch (error) {
            return {
                success: false,
                data: {
                    overallScore: 0,
                    passed: false,
                    dimensions: {
                        completeness: { score: 0, feedback: 'Evaluation failed', suggestions: [] },
                        typeSafety: { score: 0, feedback: 'Evaluation failed', suggestions: [] },
                        codeQuality: { score: 0, feedback: 'Evaluation failed', suggestions: [] },
                        security: { score: 0, feedback: 'Evaluation failed', suggestions: [] },
                    },
                    summary: 'SelfEvaluator failed to complete evaluation.',
                    criticalIssues: ['Evaluator internal error']
                },
                logs: this.logs,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}

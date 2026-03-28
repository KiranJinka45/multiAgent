import { BaseAgent } from './base-agent';
import { AgentRequest, AgentResponse } from '@packages/contracts';
import { StrategyConfig } from '@packages/utils';

export class DeploymentAgent extends BaseAgent {
    getName() { return 'DeploymentAgent'; }

    async execute(
        request: AgentRequest<{ allFiles: { path: string; content: string }[] }>, 
        signal?: AbortSignal, 
        strategy?: StrategyConfig
    ): Promise<AgentResponse> {
        const { prompt, context } = request;
        const start = Date.now();

        this.log(`Generating Production-Ready Deployment configuration (Docker, CI/CD)...`, { executionId: context.executionId });
        try {
            const system = `You are a Senior DevOps Engineer and Cloud Architect.
Your goal is to make the application production-ready with one-click deployment capabilities.

REQUIREMENTS:
- Dockerize all services (multi-stage builds for optimization).
- CI/CD pipeline configuration (e.g., GitHub Actions, GitLab CI).
- Cloud deployment strategy (AWS, GCP, or Vercel) based on tech stack.
- Infrastructure as Code (IaC) or deployment scripts.

OUTPUT:
Respond ONLY with a JSON object:
{
  "files": [
    { "path": "infrastructure/docker/Dockerfile.web", "content": "..." },
    { "path": "infrastructure/docker/Dockerfile.api", "content": "..." },
    { "path": "infrastructure/ci-cd/github-actions.yml", "content": "..." },
    { "path": "infrastructure/terraform/main.tf", "content": "..." },
    { "path": "docker-compose.yml", "content": "..." }
  ],
  "summary": "Brief explanation of deployment strategy and one-click setup"
}`;

            const userPrompt = `PROJECT REQUIREMENTS:
${prompt}

PLANNER INPUT:
${JSON.stringify(context.metadata.plan || {})}

TECH STACK:
${JSON.stringify(context.metadata.techStack || {})}`;

            request.taskType = 'code-gen';
            const { result, tokens } = await this.promptLLM(system, userPrompt, request, signal, strategy);

            this.log(`Generated ${result.files?.length || 0} deployment config files`, { executionId: context.executionId });
            return {
                success: true,
                data: result,
                artifacts: result.files?.map((f: { path: string, content: string }) => ({ path: f.path, content: f.content, type: 'infrastructure' })) || [],
                metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                artifacts: [],
                metrics: { durationMs: 0, tokensTotal: 0 },
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}

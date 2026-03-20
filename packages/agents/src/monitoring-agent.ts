import { BaseAgent } from './base-agent';
import { AgentRequest, AgentResponse } from '@libs/contracts';
import { StrategyConfig } from '@libs/utils';

export class MonitoringAgent extends BaseAgent {
    getName() { return 'MonitoringAgent'; }

    async execute(
        request: AgentRequest, 
        signal?: AbortSignal, 
        strategy?: StrategyConfig
    ): Promise<AgentResponse> {
        const { prompt, context } = request;
        const start = Date.now();

        this.log(`Setting up observability and monitoring (Prometheus/Grafana/Alerts)...`, { executionId: context.executionId });
        
        try {
            const system = `You are a Senior SRE Engineer specialized in Prometheus and Grafana.
Your goal is to add comprehensive observability to the application.

REQUIREMENTS:
- Metrics collection for Latency, Errors, and Throughput using Prometheus (prom-client).
- Grafana dashboard JSON configurations for real-time visualization.
- Alerting rules and thresholds for critical failures.

OUTPUT:
Respond ONLY with a JSON object:
{
  "files": [
    { "path": "apps/api/src/monitoring/prometheus.ts", "content": "..." },
    { "path": "infrastructure/grafana/dashboards/main.json", "content": "..." },
    { "path": "infrastructure/prometheus/alerts.yml", "content": "..." },
    { "path": "apps/api/src/middleware/metrics.ts", "content": "..." }
  ],
  "summary": "Brief explanation of observability setup and tracked metrics"
}`;

            const userPrompt = `PROJECT REQUIREMENTS:
${prompt}

PLANNER INPUT:
${JSON.stringify(context.metadata.plan || {})}

TECH STACK:
${JSON.stringify(context.metadata.techStack || {})}`;

            request.taskType = 'code-gen';
            const { result, tokens } = await this.promptLLM(system, userPrompt, request, signal, strategy);

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
                error: String(error)
            };
        }
    }
}

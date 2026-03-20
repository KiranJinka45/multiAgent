import { BaseAgent } from '@agents/base-agent';
import { SandboxParams, AgentRequest, AgentResponse } from '@shared-types/agent-contracts';
import { StrategyConfig } from '@services/agent-intelligence/strategy-engine';

export interface SandboxEditorOutput {
    editorUrl: string;
    previewUrl: string;
    isReady: boolean;
    config: {
        resourceLimits: string;
        hotReload: boolean;
        securityPolicy: string;
    };
}

/**
 * SandboxEditorAgent
 * 
 * Enables users to edit generated apps safely in a browser-based environment.
 * Provides live previews and isolated runtimes.
 */
export class SandboxEditorAgent extends BaseAgent {
    getName() { return 'SandboxEditorAgent'; }

    async execute(
        request: AgentRequest<SandboxParams>,
        signal?: AbortSignal,
        strategy?: StrategyConfig
    ): Promise<AgentResponse<SandboxEditorOutput>> {
        const { prompt, context, params } = request;
        const start = Date.now();
        this.log(`Initializing safe sandbox editor for project: ${params.projectId}`, { executionId: context.executionId });

        const system = `You are a Sandbox Infrastructure Architect.
Your goal is to enable users to edit modular monolith apps safely and provide live previews for both Web and API services.

TASK:
- Define the configuration for a multi-service browser editor and isolated runtimes (sandbox containers).
- Support the new architecture where code is in apps/web/ and apps/api/.
- Ensure zero system access and strict resource limits.
- Support hot reload for a "live" developer experience across all services.

OUTPUT:
Respond ONLY with a JSON object:
{
  "editorUrl": "URL to the browser-based editor",
  "previewUrl": "URL to the main web preview",
  "apiPreviewUrl": "URL to the background API preview",
  "isReady": true,
  "config": {
    "resourceLimits": "CPU: 1.0, RAM: 1GB (Shared)",
    "hotReload": true,
    "securityPolicy": "Strict isolation, no host FS access"
  },
  "summary": "Brief explanation of the modular sandbox setup"
}`;

        try {
            request.taskType = 'code-gen';
            const { result, tokens } = await this.promptLLM(system, `User Prompt: ${prompt}\nProject ID: ${params.projectId}`, request, signal, strategy);
            const output = result as SandboxEditorOutput;

            return {
                success: true,
                data: output,
                artifacts: [],
                metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
            };
        } catch (error) {
            return {
                success: false,
                data: { 
                    editorUrl: '', 
                    previewUrl: '', 
                    isReady: false, 
                    config: { resourceLimits: '', hotReload: false, securityPolicy: '' } 
                },
                artifacts: [],
                metrics: { durationMs: 0, tokensTotal: 0 },
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}

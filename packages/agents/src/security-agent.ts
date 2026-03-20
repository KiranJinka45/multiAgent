import { BaseAgent } from './base-agent';
import { AgentRequest, AgentResponse, SecurityParams } from '@libs/contracts';
import { StrategyConfig } from '@libs/utils';

export class SecurityAgent extends BaseAgent {
    getName() { return 'SecurityAgent'; }

    async execute(
        request: AgentRequest<SecurityParams>, 
        signal?: AbortSignal, 
        strategy?: StrategyConfig
    ): Promise<AgentResponse> {
        const { prompt, context, params } = request;
        const start = Date.now();

        this.log(`Hardening application security (${params.authProvider})...`, { executionId: context.executionId });
        
        try {
            // Step 1: Generate Auth & Security Configs
            const authSystem = `You are a Senior Security Architect specializing in OAuth2, RBAC, and end-to-end system hardening.
Your goal is to secure the system based on the planner's input.

REQUIREMENTS:
- HTTPS enforcement (headers, redirects).
- OAuth2 authentication flow (e.g., Supabase Auth, Auth0, or NextAuth).
- Granular Role-Based Access Control (RBAC) with role definitions.
- Input sanitization (XSS prevention, SQLi guards).
- API Rate Limiting middleware.

BEST PRACTICES:
- No sensitive data exposure in client-side code.
- Secure token handling (HttpOnly cookies, secure storage).

OUTPUT:
Respond ONLY with a JSON object:
{
  "files": [
    { "path": "apps/api/src/middleware/auth.ts", "content": "..." },
    { "path": "apps/api/src/middleware/rate-limit.ts", "content": "..." },
    { "path": "apps/api/config/security.ts", "content": "..." },
    { "path": "apps/api/lib/auth/roles.ts", "content": "..." }
  ],
  "summary": "Brief explanation of security architecture and RBAC flow"
}`;

            const userPrompt = `PROJECT REQUIREMENTS:
${prompt}

PLANNER INPUT:
${JSON.stringify(context.metadata.plan || {})}

ROLES:
${(params.roles || []).join(', ')}`;

            request.taskType = 'security-scan';
            const authResult = await this.promptLLM(authSystem, userPrompt, request, signal, strategy);

            // Step 2: Simulate Security Scan
            this.log(`Running autonomous security scan on generated VFS...`, { executionId: context.executionId });
            const vfsSummary = Object.keys(context.vfs).join(', ');
            const scanSystem = `You are a DevSecOps Engineer.
            Analyze the following files for security vulnerabilities (SQLi, XSS, CSRF, insecure imports).
            Files: ${vfsSummary}
            Output JSON with "isValid" (boolean), "vulnerabilities" (array), and "fixInstructions" (string).`;

            request.taskType = 'security-scan';
            const scanResult = await this.promptLLM(scanSystem, `Analyze: ${JSON.stringify(context.vfs)}`, request, signal, strategy);

            return {
                success: true,
                data: {
                    auth: authResult.result,
                    scan: scanResult.result
                },
                artifacts: authResult.result.files?.map((f: { path: string, content: string }) => ({ path: f.path, content: f.content, type: 'infrastructure' })) || [],
                metrics: { 
                    durationMs: Date.now() - start, 
                    tokensTotal: authResult.tokens + scanResult.tokens 
                }
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

import { z } from 'zod';
import { llmService } from '@packages/ai';
import { logger } from '@packages/observability';
import { CoderTools, SecurityTools } from '@packages/tools';

export type AgentResponse<T = any> = {
    success: boolean;
    data: T;
    error?: string;
    metrics?: {
        tokensTotal: number;
        durationMs: number;
    };
};

export class BaseAgent {
    public logs: any[] = [];
    constructor(...args: any[]) { }
    async execute(payload: any, ...args: any[]): Promise<AgentResponse> {
        return { success: true, data: { status: 'mocked', score: 100, patches: [], confidence: 1, ...payload } };
    }
    log(message: string, context?: any) {
        this.logs.push({ message, context, timestamp: new Date().toISOString() });
        console.log(`[Agent] ${message}`);
    }
    async promptLLM(system: string, user: string, model?: string, signal?: any) {
        const response = await llmService.chat([
            { role: 'system', content: system },
            { role: 'user', content: user }
        ], { model });
        return { result: response, tokens: { total: response.length / 4 } };
    }
}

const CoderSchema = z.object({
    files: z.array(z.object({
        path: z.string(),
        content: z.string()
    }))
});

export class CoderAgent extends BaseAgent {
    async execute(payload: any, context?: any): Promise<AgentResponse> {
        try {
            const prompt = payload.taskDescription || payload.prompt || 'Generate code';
            const techStack = JSON.stringify(payload.techStack || {});
            
            const systemPrompt = `You are an expert full-stack developer. 
            Generate high-quality, production-ready code based on the user's requirements.
            Output ONLY a JSON object in this format: 
            { "files": [ { "path": "string", "content": "string" } ] }
            Do not include any other text or markdown formatting outside the JSON.`;

            const userPrompt = `Task: ${prompt}\nTech Stack: ${techStack}\nFile Targets: ${JSON.stringify(payload.fileTargets || [])}`;

            const response = await llmService.chat([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ], { temperature: 0.2 });

            const data = CoderSchema.parse(JSON.parse(response));
            return { 
                success: true, 
                data, 
                metrics: { tokensTotal: response.length / 4, durationMs: 0 } 
            };
        } catch (err: any) {
            logger.error({ err: err.message, payload }, '[CoderAgent] Schema validation or LLM failure');
            return { success: false, error: `AGENT_SCHEMA_VIOLATION: ${err.message}`, data: { files: [] } };
        }
    }
}

const PlannerSchema = z.object({
    steps: z.array(z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        agentType: z.enum(['coder', 'architect']),
        dependsOn: z.array(z.string())
    }))
});

export class PlannerAgent extends BaseAgent {
    async execute(payload: any, context?: any): Promise<AgentResponse> {
        try {
            const prompt = payload.prompt || 'Plan a project';
            
            const systemPrompt = `You are a Technical Architect. 
            Decompose a project request into a set of discrete, sequential development steps.
            Output ONLY a JSON object in this format:
            { "steps": [ { "id": "string", "title": "string", "description": "string", "agentType": "coder|architect", "dependsOn": ["id1", "id2"] } ] }
            Do not include any other text or markdown formatting outside the JSON.`;

            const response = await llmService.chat([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Project Prompt: ${prompt}` }
            ], { temperature: 0.3 });

            const data = PlannerSchema.parse(JSON.parse(response));
            return { 
                success: true, 
                data, 
                metrics: { tokensTotal: response.length / 4, durationMs: 0 } 
            };
        } catch (err: any) {
            logger.error({ err: err.message, payload }, '[PlannerAgent] Schema validation or LLM failure');
            return { success: false, error: `AGENT_SCHEMA_VIOLATION: ${err.message}`, data: { steps: [] } };
        }
    }
}

export class SecurityAgent extends BaseAgent {
    async execute(payload: any): Promise<AgentResponse> {
        const { code, context } = payload;
        const systemPrompt = `You are a Senior Security Engineer. 
        Audit the provided code for vulnerabilities:
        1. SQL Injection
        2. XSS / CSRF
        3. Sandbox Escapes (syscall manipulation, path traversal)
        4. Prompt Injection (for AI systems)
        5. Hardcoded secrets.
        
        Output ONLY a JSON object:
        { "vulnerabilities": [{ "severity": "low|medium|high|critical", "description": "string", "location": "string", "remediation": "string" }], "score": 0-100 }`;

        const response = await llmService.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Code to Audit:\n${code}\nContext:\n${JSON.stringify(context)}` }
        ], { temperature: 0.1 });

        try {
            const data = JSON.parse(response);
            return { success: true, data };
        } catch (e) {
            return { success: false, error: 'FAILED_TO_PARSE_SECURITY_REPORT', data: null };
        }
    }
}

export class ValidatorAgent extends BaseAgent {
    async execute(payload: any): Promise<AgentResponse> {
        const { targetCode, requirements } = payload;
        const systemPrompt = `You are a QA Lead. 
        Validate that the target code satisfies all requirements.
        Perform a "Chain of Verification":
        1. Verify syntax.
        2. Verify logic against requirements.
        3. Verify edge cases.
        Output ONLY a JSON object:
        { "valid": boolean, "violations": ["string"], "confidence": 0-1.0 }`;

        const response = await llmService.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Code:\n${targetCode}\nRequirements: ${requirements}` }
        ], { temperature: 0.1 });

        try {
            const data = JSON.parse(response);
            return { success: true, data };
        } catch (e) {
            return { success: false, error: 'FAILED_TO_PARSE_VALIDATION', data: null };
        }
    }
}

export class AuditorAgent extends BaseAgent {
    async execute(payload: any): Promise<AgentResponse> {
        const { executionLineage, auditCriteria } = payload;
        const systemPrompt = `You are a Senior Institutional Auditor. 
        Analyze the execution lineage for non-deterministic behavior, governance breaches, or drift.
        Output ONLY a JSON object:
        { "compliant": boolean, "findings": ["string"], "trustScore": 0-100 }`;

        const response = await llmService.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Lineage: ${JSON.stringify(executionLineage)}\nCriteria: ${auditCriteria}` }
        ], { temperature: 0.1 });

        try {
            const data = JSON.parse(response);
            return { success: true, data };
        } catch (e) {
            return { success: false, error: 'FAILED_TO_PARSE_AUDIT', data: null };
        }
    }
}

export class HealerAgent extends BaseAgent {
    constructor() {
        super({
            name: 'Healer',
            role: 'You are the ZTAN Recovery Specialist. Your goal is to fix build, lint, and semantic errors in the codebase.',
            capabilities: ['REPAIR', 'DEBUG', 'REVALIDATE']
        });
    }

    async repair(executionId: string, errorLog: string, files: Record<string, string>): Promise<{ patches: { path: string, content: string }[], explanation: string, confidenceScore: number }> {
        const prompt = `
            The following build/lint/semantic errors were detected:
            ${errorLog}

            Current file list:
            ${Object.keys(files).join('\n')}

            Analyze the error and provide a set of patches to fix it. 
            Return a JSON object with:
            { "patches": [{ "path": "filename", "content": "full new content" }], "explanation": "why this fix works" }
        `;

        const response = await llmService.chat([{ role: 'user', content: prompt }], { temperature: 0.1 });
        let repairData;
        try {
            repairData = JSON.parse(response);
        } catch (e) {
            const match = response.match(/\{[\s\S]*\}/);
            repairData = match ? JSON.parse(match[0]) : null;
        }

        if (!repairData) throw new Error('Failed to parse healer repair response');

        let confidenceScore = 1.0;
        for (const patch of repairData.patches || []) {
            if (patch.content.length > 5000) confidenceScore -= 0.2; 
            if (!repairData.explanation || repairData.explanation.length < 20) confidenceScore -= 0.1; 
        }

        return { ...repairData, confidenceScore: Math.max(0.1, confidenceScore) };
    }
}

// Removed AgentOrchestrator (moved to @packages/core-engine)



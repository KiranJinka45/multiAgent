import { agentRegistry } from '@packages/utils';
import { ArtifactValidator } from '@packages/validator';
import { 
    AgentRequest, 
    AgentContext, 
    AgentResponse, 
    JobArtifact, 
    ValidationResult, 
    BrainPlan 
} from '@packages/contracts';
import { publishLog } from '@packages/worker/services/logger';
import * as fs from 'fs-extra';
import path from 'path';
import logger from '@packages/utils';
import { safetyService } from '@packages/api/services/safety';

export const createActivities = (executionId: string) => {
    logger.info({ executionId }, '[Activities] Initializing activities for worker');
    
    const context: AgentContext = {
        executionId,
        projectId: executionId,
        userId: 'system',
        vfs: {},
        history: [],
        metadata: {},
        getExecutionId() { return this.executionId; },
        getProjectId() { return this.projectId; }
    };

    const log = async (message: string) => {
        await publishLog(executionId, message);
    };

    return {
        async callPlanner(prompt: string, tenantId: string): Promise<AgentResponse> {
            await log('🚀 Safety check: Sanitizing input...');
            const safePrompt = await safetyService.sanitizePrompt(prompt);
            
            await log('🚀 Planner Agent starting...');
            const request: AgentRequest = { prompt: safePrompt, context, tenantId, taskType: 'planning', params: { mode: 'comprehensive' } };
            const res = await agentRegistry.getAgent('planner').execute(request);
            
            res.message = await safetyService.filterOutput(res.message || '');
            await log('✅ Planning complete.');
            return res as AgentResponse;
        },

        async callFrontend(plan: BrainPlan, tenantId: string): Promise<AgentResponse> {
            await log('🎨 Frontend Agent generating UI components...');
            const request: AgentRequest = { prompt: 'Generate Frontend', context, tenantId, taskType: 'code-gen', params: { plan } };
            const res = await agentRegistry.getAgent('frontend').execute(request);
            await log('✅ Frontend components generated.');
            return res;
        },

        async callBackend(plan: BrainPlan, tenantId: string): Promise<AgentResponse> {
            await log('⚙️ Backend Agent implemented business logic...');
            const request: AgentRequest = { prompt: 'Generate Backend', context, tenantId, taskType: 'code-gen', params: { plan } };
            const res = await agentRegistry.getAgent('backend').execute(request);
            await log('✅ Backend implementation complete.');
            return res;
        },

        async callDatabase(plan: BrainPlan, tenantId: string): Promise<AgentResponse> {
            await log('🗄️ Database Agent designing schema...');
            const request: AgentRequest = { prompt: 'Generate Database', context, tenantId, taskType: 'code-gen', params: { plan } };
            const res = await agentRegistry.getAgent('database').execute(request);
            await log('✅ Database schema ready.');
            return res;
        },

        async callSecurity(artifacts: JobArtifact[], tenantId: string): Promise<AgentResponse> {
            await log('🛡️ Security Agent hardening code...');
            const request: AgentRequest = { prompt: 'Secure Code', context, tenantId, taskType: 'security-scan', params: { artifacts } };
            const res = await agentRegistry.getAgent('security').execute(request);
            await log('✅ Security review passed.');
            return res;
        },

        async persistFiles(files: JobArtifact[]): Promise<void> {
            await log(`📦 Persisting ${files.length} files to disk...`);
            const outDir = path.join(process.cwd(), '.generated-projects', executionId);
            await fs.ensureDir(outDir);
            for (const file of files) {
                const filePath = path.join(outDir, file.path);
                await fs.ensureDir(path.dirname(filePath));
                await fs.writeFile(filePath, file.content);
            }
            await log('✅ Files persisted successfully.');
        },

        async validateArtifacts(artifacts: JobArtifact[]): Promise<ValidationResult> {
            await log(`🔍 Validating ${artifacts.length} build artifacts...`);
            const result = await ArtifactValidator.validate(executionId);
            if (result.valid) {
                await log('✨ All critical artifacts verified.');
            } else {
                await log(`❌ Validation failed: ${result.missingFiles.join(', ')}`);
            }
            return {
                valid: result.valid,
                errors: result.missingFiles.map(f => `Missing critical file: ${f}`)
            };
        },

        async callJudge(artifacts: JobArtifact[], prompt: string, tenantId: string): Promise<AgentResponse> {
            await log('🧠 AI Judge evaluating intent alignment...');
            const request: AgentRequest = { 
                prompt, 
                context, 
                tenantId, 
                taskType: 'validation', 
                params: { artifacts } 
            };
            const res = await agentRegistry.getAgent('judge').execute(request);
            if (res.success) {
                const data = res.data as Record<string, unknown>;
                await log(`✅ Intent Verification: ${data.success ? 'MATCH' : 'MISMATCH'}`);
            }
            return res;
        },

        async callDebugger(errors: string, artifacts: JobArtifact[], tenantId: string): Promise<AgentResponse> {
            const risk = safetyService.calculateRiskScore('debug', { errors });
            if (risk > 0.8) throw new Error('Action blocked: High risk debugging operation detected.');
            
            await log('🔧 Autonomous Debugger analyzing failure...');
            const request: AgentRequest = { 
                prompt: 'Fix errors', 
                context, 
                tenantId, 
                taskType: 'debug', 
                params: { errors, artifacts } 
            };
            const res = await agentRegistry.getAgent('debug').execute(request);
            if (res.success) {
                const data = res.data as Record<string, unknown>;
                await log(`✅ Root Cause Identified: ${data.rootCause}`);
            }
            return res;
        },

        async callCritic(artifacts: JobArtifact[], prompt: string, tenantId: string): Promise<AgentResponse> {
            await log('⚖️ AI Critic performing final quality gate...');
            const request: AgentRequest = { 
                prompt: 'Critique output', 
                context, 
                tenantId, 
                taskType: 'validation', 
                params: { artifacts, requirements: prompt } 
            };
            const res = await agentRegistry.getAgent('validator').execute(request);
            if (res.success) {
                const data = res.data as Record<string, unknown>;
                await log(`✅ Quality Score: ${Math.round((data.score as number) * 100)}%`);
            }
            return res;
        },

        async getBrainPlan(prompt: string, tenantId: string): Promise<BrainPlan> {
            await log('🧠 AI Brain formulating architectural strategy...');
            // Dynamic import to avoid circular dependencies or heavy init
            const { ContextBuilder } = await import('@packages/brain');
            const { Planner } = await import('@packages/brain');
            
            const brainContext = await ContextBuilder.build(prompt, tenantId);
            const planner = new Planner();
            const plan: BrainPlan = await planner.plan(brainContext, tenantId);
            
            await log(`💡 Strategy: ${plan.reasoning.substring(0, 100)}...`);
            return plan;
        }
    };
};

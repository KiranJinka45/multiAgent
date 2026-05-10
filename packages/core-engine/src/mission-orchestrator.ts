import { DistributedExecutionContext as DEC, missionController, eventBus, IdempotencyManager, db } from '@packages/utils';
import { logger } from '@packages/observability';
import { PlannerAgent } from '@packages/brain';
import { CoderAgent } from '@packages/brain';
import { ArtifactValidator } from '@packages/validator';
import { TruthValidator } from './services/truth-validator';
import { sandboxManager, SandboxSelector } from '@packages/sandbox';

export class MissionOrchestrator {
    private planner = new PlannerAgent();
    private coder = new CoderAgent();

    constructor() {
        logger.debug({
            planner: typeof (this.planner as any).execute === 'function',
            coder: typeof (this.coder as any).execute === 'function'
        }, '[Orchestrator] Agents initialized');
    }

    async execute(missionId: string, prompt: string, projectId: string) {
        const context = new DEC(missionId);
        await context.init('anonymous', projectId, prompt, missionId);
        const elog = logger.child({ missionId, projectId });

        try {
            elog.info('Starting Multi-Step Mission Execution');

            // 1. Fetch Mission Steps (DAG)
            const { db } = require('@packages/db');
            const steps = await db.missionStep.findMany({
                where: { missionId },
                include: { dependsOn: true }
            });

            if (steps.length === 0) {
                elog.info('No explicit steps found. Falling back to Zero-Iteration mode.');
                return this.executeZeroIteration(missionId, prompt, projectId, context);
            }

            // 2. DAG Execution Loop
            await missionController.updateMission(missionId, { status: 'executing' });
            const { files, totalTokens } = await this.executeGraph(steps, context, projectId);

            // 3. Finalize & Validate Integrity 🛡️
            await missionController.updateMission(missionId, { status: 'completed' });
            
            const validation = await TruthValidator.validateMission(missionId);
            if (validation.drift) {
                elog.warn({ discrepancies: validation.discrepancies }, '⚠️ Mission completed with state drift detected');
            }

            elog.info('DAG Mission execution successful.');
            return { success: true, files, totalTokens, drift: validation.drift };

        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            elog.error({ error: msg }, 'Mission execution failed');
            await missionController.setFailed(missionId, msg);
            await eventBus.stage(missionId, 'failed', 'failed', msg, 0, projectId);
            return { success: false, error: msg };
        }
    }

    private async executeGraph(steps: any[], context: DEC, projectId: string) {
        const completed = new Set<string>();
        const failed = new Set<string>();
        const allFiles: any[] = [];
        let totalTokens = 0;
        
        while (completed.size + failed.size < steps.length) {
            const ready = steps.filter(s => 
                !completed.has(s.id) && 
                !failed.has(s.id) &&
                s.dependsOn.every((dep: any) => completed.has(dep.id))
            );

            if (ready.length === 0 && (completed.size + failed.size < steps.length)) {
                throw new Error("Mission DAG Blocked: Unresolved dependencies or cycle detected.");
            }

            // Execute ready nodes in parallel
            const results = await Promise.all(ready.map(async (step) => {
                const res = await this.executeStep(step, context, projectId);
                completed.add(step.id);
                return res;
            }));

            results.forEach(res => {
                if (res.data?.files) allFiles.push(...res.data.files);
                totalTokens += (res.metrics?.tokensTotal || 0);
            });
        }

        return { files: allFiles, totalTokens };
    }

    private async executeStep(step: any, context: DEC, projectId: string) {
        const key = `mission-step:${step.id}`;
        const region = step.region || process.env.CURRENT_REGION || 'us-east-1'; // 🔥 Global Tier-1
        
    return IdempotencyManager.executeExternal(key, context.missionId, region, async () => {
        logger.info({ stepId: step.id, type: step.agentType, region }, 'Executing Mission Step');
        
        // 🛡️ ZTAN Phase 1B: Sandbox Isolation
        const riskLevel = step.agentType === 'coder' ? 'high' : 'low';
        const profile = SandboxSelector.selectProfile(context.missionId, step.agentType, riskLevel);
        
        // Inject VFS mount configuration
        const vfs = context.getVFS();
        (profile as any).mounts = [vfs.getMountProfile('/workspace', 'rw')];

        const instance = await sandboxManager.provision(profile);
        
        try {
            // Dynamic Agent Selection
            let agent;
            switch (step.agentType) {
                case 'architect': agent = this.planner; break;
                case 'coder': agent = this.coder; break;
                default: agent = this.coder;
            }

            // Execute workload via SandboxManager
            // Note: In a full implementation, the agent logic itself would be dispatched 
            // into the sandbox. Here we bridge the existing agent logic with the sandbox metadata.
            const result = await agent.execute(step.inputData, context);
            
            if (!result.success) throw new Error(`Step ${step.title} failed: ${result.error}`);

            // 🛡️ Emit Replay Telemetry
            const sandboxResult = await sandboxManager.execute(instance.id, {
                command: "agent_execute",
                args: [step.agentType, step.id]
            });

            // Attach sandbox metadata to agent result for lineage tracing
            result.metadata = { 
                ...result.metadata, 
                sandbox: sandboxResult.metadata 
            };

            // Persist Output for downstream steps
            await db.missionStep.update({
                where: { id: step.id },
                data: { 
                    status: 'completed',
                    outputData: result.data as any,
                    region 
                }
            });

            await eventBus.stage(context.missionId, 'executing', 'completed', `Step completed: ${step.title} (Sandbox: ${profile.runtime})`, 50, projectId);
            return result;
        } finally {
            // 🛡️ Always destroy the sandbox to prevent leakage
            await sandboxManager.destroy(instance.id);
        }
    });
    }

    private async executeZeroIteration(missionId: string, prompt: string, projectId: string, context: DEC) {
        const elog = logger.child({ missionId, projectId });
        
        // 1. Planning Stage
        await missionController.updateMission(missionId, { status: 'planning' });
        const planResponse = await this.planner.execute({ prompt }, context);
        if (!planResponse.success) throw new Error(planResponse.error || 'Planning failed');
        
        const plan = planResponse.data as any;
        await context.atomicUpdate((ctx: any) => { (ctx as any).metadata.plan = plan; });
        await eventBus.stage(missionId, 'planning', 'completed', 'Technical blueprint generated', 20, projectId);

        // 2. Generation Stage
        await missionController.updateMission(missionId, { status: 'executing' });
        
        const coderResponse = await this.coder.execute({
            taskTitle: 'Generate full application',
            taskDescription: `Build a complete application based on this prompt: ${prompt}`,
            fileTargets: ['package.json', 'app/page.tsx', 'tsconfig.json'],
            techStack: { framework: 'nextjs', styling: 'tailwind' }
        }, context);

        if (!coderResponse.success) throw new Error(coderResponse.error || 'Generation failed');
        
        const { files } = coderResponse.data as any;
        
        // Sync files to VFS
        await context.atomicUpdate((ctx: any) => {
            const vfs = context.getVFS();
            for (const file of files) {
                vfs.writeFile(file.path, file.content);
            }
            (ctx as any).finalFiles = files;
        });
        
        await eventBus.stage(missionId, 'executing', 'completed', 'Application code generated', 50, projectId);

        // 3. Persist to DB for visibility 💾
        for (const file of files) {
            await db.projectFile.upsert({
                where: { projectId_path: { projectId, path: file.path } },
                update: { content: file.content },
                create: { projectId, path: file.path, content: file.content }
            });
        }

        // 4. Finalize & Validate Integrity 🛡️
        await eventBus.stage(missionId, 'validation', 'running', 'Validating project compilation', 80, projectId);
        const sandboxPath = context.getVFS().getBaseDir();
        const compilationResult = await ArtifactValidator.validate(sandboxPath);
        
        if (!compilationResult.valid) {
            const errorMsg = `Compilation failed: ${compilationResult.errors.join('; ')}`;
            await eventBus.stage(missionId, 'validation', 'failed', errorMsg, 90, projectId);
            await missionController.updateMission(missionId, { 
                status: 'failed', 
                metadata: { error: errorMsg, stages: compilationResult.stages } 
            });
            throw new Error(errorMsg);
        }
        
        await eventBus.stage(missionId, 'validation', 'completed', 'Compilation validation passed', 90, projectId);
        await missionController.updateMission(missionId, { status: 'completed' });
        
        const validation = await TruthValidator.validateMission(missionId);
        if (validation.drift) {
            elog.warn({ discrepancies: validation.discrepancies }, '⚠️ Zero-Iteration mission completed with state drift');
        }

        const totalTokens = (planResponse.metrics?.tokensTotal || 0) + (coderResponse.metrics?.tokensTotal || 0);
        return { success: true, files, totalTokens, drift: validation.drift };
    }
}

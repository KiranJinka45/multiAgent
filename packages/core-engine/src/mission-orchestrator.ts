import { DistributedExecutionContext as DEC, missionController, eventBus, IdempotencyManager, db } from '@packages/utils';
import { logger } from '@packages/observability';
import { PlannerAgent } from '@packages/brain';
import { CoderAgent } from '@packages/brain';
import { ArtifactValidator } from '@packages/validator';
import { TruthValidator } from './services/truth-validator';

export class MissionOrchestrator {
    private planner = new PlannerAgent();
    private coder = new CoderAgent();

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
            
            // Dynamic Agent Selection
            let agent;
            switch (step.agentType) {
                case 'architect': agent = this.planner; break;
                case 'coder': agent = this.coder; break;
                default: agent = this.coder;
            }

            const result = await agent.execute(step.inputData, context);
            if (!result.success) throw new Error(`Step ${step.title} failed: ${result.error}`);

            // Persist Output for downstream steps
            await db.missionStep.update({
                where: { id: step.id },
                data: { 
                    status: 'completed',
                    outputData: result.data as any,
                    region // 🔥 Track where it actually ran
                }
            });

            await eventBus.stage(context.missionId, 'executing', 'completed', `Step completed: ${step.title} (Region: ${region})`, 50, projectId);
            return result;
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

        // 4. Finalize & Validate Integrity 🛡️
        await missionController.updateMission(missionId, { status: 'completed' });
        
        const validation = await TruthValidator.validateMission(missionId);
        if (validation.drift) {
            elog.warn({ discrepancies: validation.discrepancies }, '⚠️ Zero-Iteration mission completed with state drift');
        }

        const totalTokens = (planResponse.metrics?.tokensTotal || 0) + (coderResponse.metrics?.tokensTotal || 0);
        return { success: true, files, totalTokens, drift: validation.drift };
    }
}

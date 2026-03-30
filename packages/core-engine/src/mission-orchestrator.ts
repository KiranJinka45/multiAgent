import { 
    DistributedExecutionContext as DEC, 
    missionController, 
    eventBus,
    logger
} from '@packages/utils/server';
import { PlannerAgent } from '@packages/brain';
import { CoderAgent } from '@packages/brain';
import { ArtifactValidator } from '@packages/validator';

export class MissionOrchestrator {
    private planner = new PlannerAgent();
    private coder = new CoderAgent();

    async execute(missionId: string, prompt: string, projectId: string) {
        const context = new DEC(missionId);
        await context.init('anonymous', projectId, prompt, missionId);
        const elog = logger.child({ missionId, projectId });

        try {
            elog.info('Starting Zero-Iteration Mission Execution');

            // 1. Planning Stage
            await missionController.updateMission(missionId, { status: 'planning' });
            const planResponse = await this.planner.execute({ prompt }, context);
            if (!planResponse.success) throw new Error(planResponse.error || 'Planning failed');
            
            const plan = planResponse.data as any;
            await context.atomicUpdate(ctx => { (ctx as any).metadata.plan = plan; });
            await eventBus.stage(missionId, 'planning', 'completed', 'Technical blueprint generated', 20, projectId);

            // 2. Generation Stage
            await missionController.updateMission(missionId, { status: 'executing' });
            
            // For MVP, we'll run a single coder pass or iterate through steps.
            // Here, we'll just run one big coder pass for simplicity as a proof-of-concept
            const coderResponse = await this.coder.execute({
                taskTitle: 'Generate full application',
                taskDescription: `Build a complete application based on this prompt: ${prompt}`,
                fileTargets: ['package.json', 'app/page.tsx', 'tsconfig.json'],
                techStack: { framework: 'nextjs', styling: 'tailwind' }
            }, context);

            if (!coderResponse.success) throw new Error(coderResponse.error || 'Generation failed');
            
            const { files } = coderResponse.data as any;
            
            // Sync files to VFS
            await context.atomicUpdate(ctx => {
                const vfs = context.getVFS();
                for (const file of files) {
                    vfs.writeFile(file.path, file.content);
                }
                (ctx as any).finalFiles = files;
            });
            
            await eventBus.stage(missionId, 'executing', 'completed', 'Application code generated', 50, projectId);

            // 3. Validation Stage
            await missionController.updateMission(missionId, { status: 'building' });
            
            // For now, validator checks disk, but we can check VFS or wait for build-worker to persist
            await ArtifactValidator.validate(projectId);
            
            // Note: Validation might fail if files aren't on disk yet. 
            // In a real pipeline, the build-worker would persist VFS to disk before this.
            
            await eventBus.stage(missionId, 'building', 'completed', 'Build integrity verified', 80, projectId);

            // 4. Success -> Finalize
            await missionController.updateMission(missionId, { status: 'complete' });
            elog.info('Mission execution successful.');

            return { success: true, files };

        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            elog.error({ error: msg }, 'Mission execution failed');
            await missionController.setFailed(missionId, msg);
            await eventBus.stage(missionId, 'failed', 'failed', msg, 0, projectId);
            return { success: false, error: msg };
        }
    }
}

import path from 'path';
import * as fs from 'fs-extra';
import { 
    eventBus, 
    missionController, 
    queueManager, 
    db, 
    stateManager, 
    ReliabilityMonitor,
    JobStage,
    DistributedExecutionContext
} from '@packages/utils';
import { logger } from '@packages/observability';
import { TaskExecutor } from './task-engine/executor';
import { TaskGraph } from './task-engine/task-graph';

// ---- MAIN CLASS ----
export class Orchestrator {
    private executor: TaskExecutor;

    constructor() {
        this.executor = new TaskExecutor();
    }

    /**
     * Legacy run method (deprecated)
     */
    async run(
        taskPrompt: string,
        userId: string,
        projectId: string,
        executionId: string
    ): Promise<any> {
        return this.execute(taskPrompt, userId, projectId, executionId);
    }

    /**
     * Main execution entry point for the build pipeline.
     */
    async execute(
        taskPrompt: string,
        userId: string,
        projectId: string,
        executionId: string,
        signal?: AbortSignal,
        options: { isFastPreview?: boolean } = {}
    ): Promise<any> {
        const sandboxDir = path.join(process.cwd(), '.generated-projects', projectId);
        const timer = await eventBus.startTimer(executionId, 'Orchestrator', 'pipeline_total', 'Full Build Pipeline', projectId);

        try {
            await ReliabilityMonitor.recordStart();

            // 0. Initialize Execution Context (Isolated State)
            const context = new DistributedExecutionContext(executionId, projectId);
            await context.init(userId, projectId, taskPrompt, executionId);

            await stateManager.transition(
                executionId,
                'created',
                'Initializing pipeline...',
                5,
                projectId
            );

            await eventBus.stage(executionId, JobStage.INIT.toLowerCase(), 'running', 'Initializing environment', 10, projectId);

            await fs.ensureDir(sandboxDir);

            // 1. Mission Creation
            await missionController.createMission({
                id: executionId,
                projectId,
                userId,
                prompt: taskPrompt,
                status: 'init',
                createdAt: Date.now(),
                updatedAt: Date.now()
            });

            // 2. Planning Stage
            const planTimer = await eventBus.startTimer(executionId, 'Orchestrator', 'planning_stage', 'Project Planning', projectId);
            await eventBus.stage(executionId, JobStage.PLAN.toLowerCase(), 'running', 'Analyzing requirements and generating task graph', 20, projectId);
            
            // In a real scenario, we would call the Planner Agent here.
            // For now, we'll create a basic graph or use the existing logic.
            const graph = new TaskGraph();
            
            // --- BOOTSTRAP GRAPH (Fallback if Planner is slow) ---
            graph.addTask({
                id: 'init-scaffold',
                type: 'meta',
                title: 'Project Scaffolding',
                description: 'Initialize project structure and base dependencies',
                status: 'queued' as any,
                payload: { prompt: taskPrompt }
            });
            
            await planTimer('Success');

            // 3. Execution Stage
            const buildTimer = await eventBus.startTimer(executionId, 'Orchestrator', 'build_stage', 'Agent Execution & Build', projectId);
            await eventBus.stage(executionId, JobStage.BUILD.toLowerCase(), 'running', 'Executing agent tasks', 40, projectId);

            // Use the TaskExecutor to run the graph with ISOLATED context
            await this.executor.evaluateGraph(graph, context);
            
            await buildTimer('Success');

            // 4. Finalization
            await timer('Success');
            await eventBus.complete(executionId, { message: 'Build pipeline finished successfully' }, projectId);

            await stateManager.transition(executionId, 'completed', 'Build finished', 100, projectId);

            return {
                success: true,
                executionId,
                message: 'Pipeline completed'
            };

        } catch (error: any) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error({ error: msg, executionId }, 'Orchestrator execution failed');

            await timer(`Failed: ${msg}`);
            await eventBus.error(executionId, msg, projectId);
            
            await stateManager.transition(executionId, 'failed', msg, 100, projectId);

            return {
                success: false,
                executionId,
                error: msg
            };
        }
    }
}




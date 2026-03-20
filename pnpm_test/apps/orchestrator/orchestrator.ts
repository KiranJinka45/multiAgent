import { missionController } from '../../packages/utils/services/mission-controller';
import { Mission } from '../../packages/contracts/mission';
import { stateManager } from '../../packages/utils/services/state-manager';
import { eventBus } from '../../packages/utils/services/event-bus';
import { getExecutionLogger } from '../../packages/utils/config/logger';
import { ExecutionResult } from '../../packages/contracts/execution';
import { JobStage } from '../../packages/contracts/pipeline-types';
import logger from '../../packages/utils/config/logger';

export enum StageState {
    IDLE = 'IDLE',
    RUNNING = 'RUNNING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED'
}

export class StageStateMachine {
    private currentStage: JobStage = JobStage.PLANNING;
    private currentState: StageState = StageState.IDLE;
    private executionId: string;
    private projectId: string;

    constructor(executionId: string, projectId: string) {
        this.executionId = executionId;
        this.projectId = projectId;
    }

    async transition(stage: JobStage, state: StageState, message: string, progress: number) {
        this.currentStage = stage;
        this.currentState = state;
        
        logger.info({ executionId: this.executionId, stage, state, message }, `[StageStateMachine] Transitioning to ${stage}:${state}`);
        
        const uiStatus = state === StageState.RUNNING ? 'in_progress' : 
                         state === StageState.COMPLETED ? 'completed' : 
                         state === StageState.FAILED ? 'failed' : 'pending';

        await eventBus.stage(this.executionId, stage.toLowerCase(), uiStatus, message, progress, this.projectId);
    }

    getStage() { return this.currentStage; }
    getState() { return this.currentState; }
}

export class Orchestrator {
    async run(
        taskPrompt: string, 
        userId: string, 
        projectId: string, 
        executionId: string,
        tenantId: string,
        _signal?: AbortSignal,
        _options?: { isFastPreview?: boolean }
    ): Promise<ExecutionResult> {
        const elog = getExecutionLogger(executionId);
        const fsm = new StageStateMachine(executionId, projectId);
        
        try {
            elog.info('Dispatching to Temporal Production Pipeline');
            await stateManager.transition(executionId, 'created', 'Cluster online.', 5, projectId);
            
            const mission: Mission = {
                id: executionId,
                projectId,
                userId,
                prompt: taskPrompt,
                status: 'init',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                metadata: {}
            };
            await missionController.createMission(mission).catch(() => {});

            const { Connection, Client, WorkflowIdReusePolicy } = await import('@temporalio/client');
            const connection = await Connection.connect();
            const client = new Client({ connection });

            await fsm.transition(JobStage.PLANNING, StageState.RUNNING, 'Orchestrating Temporal mission...', 10);

            const handle = await client.workflow.start('appBuilderWorkflow', {
                args: [{ prompt: taskPrompt, userId, projectId, executionId, tenantId }],
                taskQueue: 'app-builder',
                workflowId: `build-${projectId}-${executionId}`,
                workflowIdReusePolicy: WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_REJECT_DUPLICATE
            });

            elog.info(`Workflow started. ID: ${handle.workflowId}`);

            const result = await handle.result() as { previewUrl: string };

            await fsm.transition(JobStage.COMPLETE, StageState.COMPLETED, 'Project ready via Temporal!', 100);
            return { success: true, executionId, files: [], previewUrl: result.previewUrl, fastPath: true };

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            elog.error({ error: errorMsg }, 'Pipeline failed');
            if (fsm) await fsm.transition(JobStage.FAILED, StageState.FAILED, errorMsg, 0);
            return { success: false, executionId, error: errorMsg };
        }
    }
}

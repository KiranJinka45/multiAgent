import { TaskState, TaskLifecycleEngine } from './task-lifecycle-engine.js';
import { ExecutionJournal } from './execution-journal.js';
import { SandboxSupervisor, SandboxResourceUsage } from './sandbox-supervisor.js';
import { ExecutionContractValidator, ExecutionContract } from './execution-contract-validator.js';
import { ExecutionCapabilityRegistry, ExecutionCapability } from './execution-capability-registry.js';
import { RollbackCoordinator, ExecutionStep, RollbackAction } from './rollback-coordinator.js';
import { BoundedWorkflowEngine, WorkflowGraph } from './bounded-workflow-engine.js';

export interface ExecutionOrchestratorConfig {
    maxMemoryMb?: number;
    initialCapabilities?: ExecutionCapability[];
}

export interface ExecutionTaskResult {
    taskId: string;
    finalState: TaskState;
    completedStepsCount: number;
    sandboxViolationDetected: boolean;
    contractValid: boolean;
    rollbackExecuted: boolean;
    rollbackSuccess?: boolean;
    error?: string;
}

export class ExecutionCoordinator {
    private lifecycleEngine = new TaskLifecycleEngine();
    private journal = new ExecutionJournal();
    private sandboxSupervisor: SandboxSupervisor;
    private contractValidator = new ExecutionContractValidator();
    private capabilityRegistry: ExecutionCapabilityRegistry;
    private rollbackCoordinator = new RollbackCoordinator();
    private workflowEngine = new BoundedWorkflowEngine();

    private activeTaskStates = new Map<string, TaskState>();
    private completedSteps = new Map<string, ExecutionStep[]>();
    private idempotencyKeys = new Set<string>();

    constructor(config: ExecutionOrchestratorConfig = {}) {
        this.sandboxSupervisor = new SandboxSupervisor(config.maxMemoryMb || 512);
        this.capabilityRegistry = new ExecutionCapabilityRegistry(config.initialCapabilities || []);
    }

    /**
     * Executes a single task step safely, running it through the complete set of sandbox, capabilities,
     * journaling, and contract gates.
     */
    public async executeTaskStep(params: {
        taskId: string;
        stepIndex: number;
        actionType: string;
        payload: any;
        requiredCapabilities: ExecutionCapability[];
        contract: ExecutionContract;
        sandboxResources: SandboxResourceUsage;
        executedSyscalls: string[];
        idempotencyKey?: string;
        stepExecutor: (step: ExecutionStep) => Promise<Record<string, any>>;
        rollbackExecutor: (action: RollbackAction) => Promise<void>;
    }): Promise<ExecutionTaskResult> {
        const { taskId, stepIndex, actionType, payload, requiredCapabilities, contract, sandboxResources, executedSyscalls, idempotencyKey } = params;

        // 1. Enforce idempotency key check
        if (idempotencyKey) {
            if (this.idempotencyKeys.has(idempotencyKey)) {
                return {
                    taskId,
                    finalState: this.activeTaskStates.get(taskId) || 'SUCCESS',
                    completedStepsCount: this.completedSteps.get(taskId)?.length || 0,
                    sandboxViolationDetected: false,
                    contractValid: true,
                    rollbackExecuted: false,
                    error: `Idempotency violation: step already executed for key "${idempotencyKey}"`
                };
            }
            this.idempotencyKeys.add(idempotencyKey);
        }

        // 2. Initialize task state
        let currentState = this.activeTaskStates.get(taskId) || 'INIT';
        if (currentState === 'INIT') {
            const trans = this.lifecycleEngine.transitionState(taskId, 'INIT', 'RUNNING');
            if (!trans.success) {
                return { taskId, finalState: 'INIT', completedStepsCount: 0, sandboxViolationDetected: false, contractValid: false, rollbackExecuted: false, error: trans.error };
            }
            currentState = 'RUNNING';
            this.activeTaskStates.set(taskId, currentState);
            this.journal.appendEntry(taskId, stepIndex, currentState, { taskStart: true });
        }

        if (currentState !== 'RUNNING') {
            return {
                taskId,
                finalState: currentState,
                completedStepsCount: this.completedSteps.get(taskId)?.length || 0,
                sandboxViolationDetected: false,
                contractValid: false,
                rollbackExecuted: false,
                error: `Cannot execute step on task in state ${currentState}`
            };
        }

        // 3. Enforce capability registry checks
        const capAudit = this.capabilityRegistry.auditRequestedCapabilities(requiredCapabilities);
        if (!capAudit.authorized) {
            const err = `Execution capability registry violation: task requested unauthorized permissions [${capAudit.unauthorizedCapabilities.join(', ')}]`;
            return await this.handleTaskFailure(taskId, stepIndex, err, params.rollbackExecutor);
        }

        // 4. Enforce sandbox supervisor limits
        const sandboxReport = this.sandboxSupervisor.superviseSandbox(sandboxResources, executedSyscalls);
        if (sandboxReport.quarantineTriggered || !sandboxReport.resourceCompliant) {
            const err = `Sandbox supervisor violation: ${sandboxReport.violations.join('; ')}`;
            return await this.handleTaskFailure(taskId, stepIndex, err, params.rollbackExecutor, true);
        }

        // 5. Execute action step
        const currentStep: ExecutionStep = { actionType, payload };
        let output: Record<string, any>;
        try {
            output = await params.stepExecutor(currentStep);
            
            // Record completed step
            const steps = this.completedSteps.get(taskId) || [];
            steps.push(currentStep);
            this.completedSteps.set(taskId, steps);
        } catch (execErr: any) {
            const err = `Task execution action failed: ${execErr.message || execErr}`;
            return await this.handleTaskFailure(taskId, stepIndex, err, params.rollbackExecutor);
        }

        // 6. Enforce execution output contract verification
        const contractReport = this.contractValidator.validateContract(contract, payload, output);
        if (!contractReport.isValid) {
            const err = `Execution contract validation failure: ${contractReport.error}`;
            return await this.handleTaskFailure(taskId, stepIndex, err, params.rollbackExecutor);
        }

        // 7. Append state entry successfully to the WAL journal
        this.journal.appendEntry(taskId, stepIndex, 'RUNNING', { completedStep: actionType });

        return {
            taskId,
            finalState: 'RUNNING',
            completedStepsCount: this.completedSteps.get(taskId)?.length || 0,
            sandboxViolationDetected: false,
            contractValid: true,
            rollbackExecuted: false
        };
    }

    /**
     * Finalizes task execution state to success.
     */
    public finalizeTaskSuccess(taskId: string): ExecutionTaskResult {
        const currentState = this.activeTaskStates.get(taskId);
        if (currentState !== 'RUNNING') {
            return {
                taskId,
                finalState: currentState || 'INIT',
                completedStepsCount: this.completedSteps.get(taskId)?.length || 0,
                sandboxViolationDetected: false,
                contractValid: false,
                rollbackExecuted: false,
                error: 'Cannot finalize task that is not currently running.'
            };
        }

        this.lifecycleEngine.transitionState(taskId, 'RUNNING', 'SUCCESS');
        this.activeTaskStates.set(taskId, 'SUCCESS');
        this.journal.appendEntry(taskId, 9999, 'SUCCESS', { taskFinalized: true });

        return {
            taskId,
            finalState: 'SUCCESS',
            completedStepsCount: this.completedSteps.get(taskId)?.length || 0,
            sandboxViolationDetected: false,
            contractValid: true,
            rollbackExecuted: false
        };
    }

    /**
     * Rejects recursive workflow DAG configurations.
     */
    public validateWorkflowDAG(graph: WorkflowGraph): { isDag: boolean; error?: string } {
        return this.workflowEngine.validateWorkflowDAG(graph);
    }

    /**
     * Gets execution journal for forensic recovery checks.
     */
    public getJournal() {
        return this.journal;
    }

    /**
     * Inner helper mapping failures directly to state transition engine and triggering the RollbackCoordinator.
     */
    private async handleTaskFailure(
        taskId: string,
        stepIndex: number,
        errorMsg: string,
        rollbackExecutor: (action: RollbackAction) => Promise<void>,
        sandboxViolation = false
    ): Promise<ExecutionTaskResult> {
        this.activeTaskStates.set(taskId, 'FAILED');
        this.lifecycleEngine.transitionState(taskId, 'RUNNING', 'FAILED');
        this.journal.appendEntry(taskId, stepIndex, 'FAILED', { failureReason: errorMsg });

        // Trigger safe LIFO rollback of completed steps
        const stepsToRollback = this.completedSteps.get(taskId) || [];
        this.activeTaskStates.set(taskId, 'ROLLING_BACK');
        this.lifecycleEngine.transitionState(taskId, 'FAILED', 'ROLLING_BACK');

        const rollbackReport = await this.rollbackCoordinator.executeRollback(stepsToRollback, rollbackExecutor);

        this.activeTaskStates.set(taskId, 'ROLLED_BACK');
        this.lifecycleEngine.transitionState(taskId, 'ROLLING_BACK', 'ROLLED_BACK');
        this.journal.appendEntry(taskId, stepIndex + 1, 'ROLLED_BACK', { rollbackSuccess: rollbackReport.success });

        return {
            taskId,
            finalState: 'ROLLED_BACK',
            completedStepsCount: stepsToRollback.length,
            sandboxViolationDetected: sandboxViolation,
            contractValid: false,
            rollbackExecuted: true,
            rollbackSuccess: rollbackReport.success,
            error: errorMsg
        };
    }
}

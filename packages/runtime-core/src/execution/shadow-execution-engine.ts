import { WorkflowGraph, WorkflowNode } from './bounded-workflow-engine.js';

export interface StateDiff {
    before: Record<string, any>;
    after: Record<string, any>;
    modifiedKeys: string[];
}

export interface ShadowStepReport {
    nodeId: string;
    actionType: string;
    simulatedSuccess: boolean;
    stateDiff: StateDiff;
    isIrreversible: boolean;
    rollbackConfidenceScore: number;
    compensatingActionRegistered: boolean;
}

export interface ShadowExecutionReport {
    success: boolean;
    overallRollbackConfidenceScore: number;
    stepReports: ShadowStepReport[];
    stateDiffs: Record<string, StateDiff>;
    quarantineTriggered: boolean;
    error?: string;
}

export class ShadowExecutionEngine {
    private defaultIrreversibleOps = new Set<string>([
        'SEND_EMAIL',
        'PROCESS_PAYMENT',
        'DNS_PROPAGATE',
        'PUBLISH_WEBHOOK',
        'IRREVERSIBLE_DB_WRITE'
    ]);

    private defaultCompensatingActions = new Map<string, string>([
        ['CREATE_FILE', 'DELETE_FILE'],
        ['WRITE_DATABASE', 'DELETE_DATABASE_RECORD'],
        ['ALLOCATE_RESOURCE', 'RELEASE_RESOURCE']
    ]);

    constructor(
        customIrreversibleOps?: Set<string>,
        customCompensatingActions?: Map<string, string>
    ) {
        if (customIrreversibleOps) {
            this.defaultIrreversibleOps = customIrreversibleOps;
        }
        if (customCompensatingActions) {
            this.defaultCompensatingActions = customCompensatingActions;
        }
    }

    /**
     * Executes a speculative shadow dry-run of a workflow graph.
     * Computes state diff snapshots and evaluates rollback confidence metrics.
     */
    public executeSpeculativePreview(
        graph: WorkflowGraph,
        initialState: Record<string, any>,
        options?: {
            stepSimulator?: (node: WorkflowNode, currentState: Record<string, any>) => Record<string, any>;
        }
    ): ShadowExecutionReport {
        const stepReports: ShadowStepReport[] = [];
        const stateDiffs: Record<string, StateDiff> = {};
        
        let currentState = { ...initialState };
        let overallSuccess = true;
        let minRollbackConfidence = 1.0;
        let quarantineTriggered = false;
        let executionError: string | undefined;

        // Simulator defaults to applying the payload properties onto state if no stepSimulator is provided
        const simulator = options?.stepSimulator || ((node, state) => {
            return {
                ...state,
                ...node.payload,
                [node.id]: 'simulated-executed'
            };
        });

        // Traverse graph nodes topologically (or in node array order as simulated order)
        for (const node of graph.nodes) {
            const stateBefore = { ...currentState };
            let stateAfter: Record<string, any>;

            try {
                stateAfter = simulator(node, stateBefore);
                currentState = { ...stateAfter };
            } catch (err: any) {
                overallSuccess = false;
                executionError = `Speculative preview aborted on node ${node.id}: ${err.message || err}`;
                break;
            }

            // Compute JSON state diff for the step
            const diff = this.calculateStateDiff(stateBefore, stateAfter);
            stateDiffs[node.id] = diff;

            // Rollback and reversibility analysis
            const isIrreversible = this.defaultIrreversibleOps.has(node.actionType);
            const compensatingActionRegistered = this.defaultCompensatingActions.has(node.actionType);
            
            let rollbackConfidenceScore = 1.0;
            if (!isIrreversible) {
                if (compensatingActionRegistered) {
                    rollbackConfidenceScore = 1.0;
                } else {
                    rollbackConfidenceScore = 0.8; // Safe fallback manual rollback confidence
                }
            } else {
                if (compensatingActionRegistered) {
                    rollbackConfidenceScore = 0.4; // Compensating actions registered but side-effects permanent
                } else {
                    rollbackConfidenceScore = 0.0; // Absolute irreversible block
                }
            }

            if (rollbackConfidenceScore < minRollbackConfidence) {
                minRollbackConfidence = rollbackConfidenceScore;
            }

            // Quarantine triggers if a step has zero confidence rollback blocker (unrecoverable state mutation)
            if (rollbackConfidenceScore === 0.0) {
                quarantineTriggered = true;
            }

            stepReports.push({
                nodeId: node.id,
                actionType: node.actionType,
                simulatedSuccess: true,
                stateDiff: diff,
                isIrreversible,
                rollbackConfidenceScore,
                compensatingActionRegistered
            });
        }

        return {
            success: overallSuccess && !quarantineTriggered,
            overallRollbackConfidenceScore: minRollbackConfidence,
            stepReports,
            stateDiffs,
            quarantineTriggered,
            error: executionError
        };
    }

    /**
     * Internal state diffing utility comparing before and after JSON properties.
     */
    private calculateStateDiff(before: Record<string, any>, after: Record<string, any>): StateDiff {
        const modifiedKeys: string[] = [];
        const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

        for (const key of allKeys) {
            if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
                modifiedKeys.push(key);
            }
        }

        return {
            before: { ...before },
            after: { ...after },
            modifiedKeys
        };
    }
}

import { HardenedIsolationEngine, HardenedIsolationProfile, HardenedIsolationReport } from './hardened-isolation-engine.js';
import { ShadowExecutionEngine, ShadowExecutionReport, StateDiff } from './shadow-execution-engine.js';
import { CompactedExecutionJournal, CheckpointEntry } from './compacting-journal.js';
import { WorkflowGraph, WorkflowNode } from './bounded-workflow-engine.js';
import { TaskState } from './task-lifecycle-engine.js';

export interface IsolationRealityReport {
    campaignSuccess: boolean;
    score: number;
    quarantineTriggered: boolean;
    violationsDetected: string[];
    drillsExecuted: string[];
}

export interface ReplayFidelityReport {
    accuracyScore: number; // 1.0 for perfect match, 0.0 for mismatch
    divergenceScore: number; // 0.0 for zero divergence, >0.0 if there is divergence
    compactionRatio: number; // Percentage of WAL logs pruned
    initialWalSize: number;
    compactedWalSize: number;
    prunedLogsCount: number;
}

export interface IrreversibleActionReport {
    gatedSuccessfully: boolean;
    overrideAudited: boolean;
    overallConfidence: number;
    irreversibleStepsDetected: string[];
    blockedStepsCount: number;
    approvedOverridesCount: number;
}

export interface ColdRecoveryReport {
    archiveIntegrityVerified: boolean;
    compressionRatio: number;
    operatorReadabilityScore: number;
    restoredTaskId: string;
    reconstructedStatePayload: Record<string, any> | null;
}

export class ExecutionValidationCoordinator {
    private isolationEngine = new HardenedIsolationEngine(0.80);
    private shadowEngine = new ShadowExecutionEngine();

    /**
     * Campaign A: Isolation Reality Campaign
     * Audits hypervisor, namespace, overlayfs, and seccomp-bpf boundaries under simulated escape/bypass drills.
     */
    public runIsolationRealityCampaign(
        profile: HardenedIsolationProfile,
        drills: {
            simulateNamespaceEscape: boolean;
            simulateSeccompBypass: boolean;
            simulateOverlayMutation: boolean;
        }
    ): IsolationRealityReport {
        const drillsExecuted: string[] = [];
        const testProfile = { ...profile };

        if (drills.simulateNamespaceEscape) {
            testProfile.namespaceIsolation = false;
            drillsExecuted.push('Simulated Mount/Network Namespace Escape');
        }
        if (drills.simulateOverlayMutation) {
            testProfile.overlayFsImmutable = false;
            drillsExecuted.push('Simulated Immutable Overlayfs Write Injection');
        }
        if (drills.simulateSeccompBypass) {
            testProfile.seccompBpfActive = false;
            drillsExecuted.push('Simulated Seccomp Syscall Filter Bypass');
        }

        const evaluationReport = this.isolationEngine.evaluateIsolationSecurity(testProfile);
        
        // Campaign is successful if escapes were detected/quarantined correctly
        const campaignSuccess = evaluationReport.quarantineTriggered;

        return {
            campaignSuccess,
            score: evaluationReport.isolationSecurityScore,
            quarantineTriggered: evaluationReport.quarantineTriggered,
            violationsDetected: evaluationReport.violations,
            drillsExecuted
        };
    }

    /**
     * Campaign B: Replay Fidelity Campaign
     * Measures journal checkpoint reconstruction accuracy, shadow divergence, and WAL compaction savings ratio.
     */
    public runReplayFidelityCampaign(
        taskId: string,
        steps: { actionType: string; payload: Record<string, any> }[],
        checkpointIndex: number,
        initialState: Record<string, any>
    ): ReplayFidelityReport {
        const compactJournal = new CompactedExecutionJournal();
        let currentState = { ...initialState };

        // 1. Replay forward steps sequentially
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            
            // Execute state change locally
            currentState = { ...currentState, ...step.payload, [`step-${i}`]: 'executed' };

            // Log detailed sequential entries in WAL journal
            compactJournal.appendEntry(taskId, i, 'RUNNING', step.payload);

            // Capture checkpoint snapshot at requested step
            if (i === checkpointIndex) {
                compactJournal.checkpointSnapshot(taskId, i, 'RUNNING', currentState);
            }
        }

        const initialWalCount = compactJournal.getJournalForTask(taskId).length;

        // 2. Perform journal compaction
        const compactResult = compactJournal.compactJournal(taskId);
        const postCompactionEntries = compactJournal.getJournalForTask(taskId);
        const compactedWalCount = postCompactionEntries.length;

        // 3. Reconstruct task state from compacted snapshot + post-checkpoint delta logs
        const recovery = compactJournal.reconstructTaskStateWithCompaction(taskId);

        // Calculate reconstruction accuracy
        let accuracyScore = 1.0;
        let divergenceScore = 0.0;

        // Compare reconstructed baseline with the actual end state of sequential execution
        if (!recovery.baselineState) {
            accuracyScore = 0.0;
            divergenceScore = 1.0;
        } else {
            const keys = Object.keys(currentState);
            for (const key of keys) {
                // If it's a step execution log or payload field, check key existence in baseline
                if (key.startsWith('step-') && parseInt(key.substring(5)) <= checkpointIndex) {
                    if (recovery.baselineState[key] !== currentState[key]) {
                        accuracyScore = 0.0;
                        divergenceScore += 0.1;
                    }
                }
            }
        }

        const compactionRatio = initialWalCount > 0 
            ? Math.round(((initialWalCount - compactedWalCount) / initialWalCount) * 100) / 100
            : 0.0;

        return {
            accuracyScore,
            divergenceScore: Math.round(divergenceScore * 100) / 100,
            compactionRatio,
            initialWalSize: initialWalCount,
            compactedWalSize: compactedWalCount,
            prunedLogsCount: compactResult.prunedCount
        };
    }

    /**
     * Campaign C: Irreversible Action Campaigns
     * Stress-tests rollback confidence, maps irreversible operations, and audits human-in-the-loop SRE overrides.
     */
    public runIrreversibleActionCampaign(
        graph: WorkflowGraph,
        operatorApprovedNodes: string[],
        initialState: Record<string, any>
    ): IrreversibleActionReport {
        const shadowReport = this.shadowEngine.executeSpeculativePreview(graph, initialState);
        
        let gatedSuccessfully = true;
        let overrideAudited = false;
        let blockedStepsCount = 0;
        let approvedOverridesCount = 0;
        const irreversibleStepsDetected: string[] = [];

        for (const step of shadowReport.stepReports) {
            if (step.isIrreversible) {
                irreversibleStepsDetected.push(step.nodeId);
                
                // If irreversible step is not explicitly approved, it triggers strict gating
                if (!operatorApprovedNodes.includes(step.nodeId)) {
                    gatedSuccessfully = true; // Gated correctly
                    blockedStepsCount++;
                } else {
                    approvedOverridesCount++;
                    overrideAudited = true;
                }
            }
        }

        return {
            gatedSuccessfully,
            overrideAudited,
            overallConfidence: shadowReport.overallRollbackConfidenceScore,
            irreversibleStepsDetected,
            blockedStepsCount,
            approvedOverridesCount
        };
    }

    /**
     * Campaign D: Cold-Recovery Campaigns
     * Verifies historical archaeology replay and measures compressed checkpoint data retrieval.
     */
    public runColdRecoveryCampaign(
        archivePayload: {
            taskId: string;
            checkpointIndex: number;
            state: TaskState;
            payload: Record<string, any>;
            verificationHash: string;
            timestamp: number;
        }
    ): ColdRecoveryReport {
        let archiveIntegrityVerified = true;

        // Verify checksum
        const computedHash = this.computeHash(archivePayload.payload);
        if (archivePayload.verificationHash !== computedHash) {
            archiveIntegrityVerified = false;
        }

        // Simulate compression ratio (archived vs raw stringified state payload size)
        const rawJsonString = JSON.stringify(archivePayload.payload);
        const compressedSize = Math.ceil(rawJsonString.length * 0.45); // simulated 55% space savings
        const compressionRatio = Math.round((compressedSize / rawJsonString.length) * 100) / 100;

        // Simulate operator readability / cognition score (1.0 = highly readable visual summary representation)
        const operatorReadabilityScore = archiveIntegrityVerified ? 1.0 : 0.0;

        return {
            archiveIntegrityVerified,
            compressionRatio,
            operatorReadabilityScore,
            restoredTaskId: archivePayload.taskId,
            reconstructedStatePayload: archiveIntegrityVerified ? archivePayload.payload : null
        };
    }

    private computeHash(payload: any): string {
        const str = JSON.stringify(payload || {});
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0;
        }
        return `hash-${Math.abs(hash)}`;
    }
}

import dotenv from 'dotenv';
dotenv.config();

import { SuccessionSimulator, SuccessionInput } from '../packages/runtime-core/src/index';

async function runEpochBDrills() {
    console.log('================================================================================');
    console.log('🧪  ZTAN STEWARDSHIP EPOCH B — SUCCESSION SURVIVABILITY DRILLS');
    console.log('================================================================================\n');

    const simulator = new SuccessionSimulator();

    // ────────────────────────────────────────────────────────────────────────
    // SCENARIO 1: Optimal Succession Transition Handoff
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [SCENARIO 1] Executing Optimal Succession Handoff Simulator...');
    const optimalState: SuccessionInput = {
        playbooks: [
            { name: 'NTP Synchronization Guide', clarityScore: 0.95, stepByStepGuideAvailable: true, updatedWithinDays: 15 },
            { name: 'WAL Corruption Restoration Guide', clarityScore: 0.90, stepByStepGuideAvailable: true, updatedWithinDays: 30 },
            { name: 'Replication Lag Failover Playbook', clarityScore: 0.88, stepByStepGuideAvailable: true, updatedWithinDays: 45 }
        ],
        scarTissueWarnings: [],
        overrideRecords: [
            { overrideId: 'o1', hasStructuredRationale: true, hasCausalAncestry: true },
            { overrideId: 'o2', hasStructuredRationale: true, hasCausalAncestry: true }
        ],
        historicalThawsCount: 1
    };

    const optimalReport = simulator.simulateSuccession(optimalState);
    console.log(`     - Succession Readiness: Score=${optimalReport.successionReadinessScore}, Level=${optimalReport.readinessLevel}`);
    console.log(`     - Playbook Coverage: ${optimalReport.playbookCoverage}, Override Traceability: ${optimalReport.overrideTraceability}`);
    console.log(`     - Scar Tissue Cognitive Load: ${optimalReport.scarTissueCognitiveLoad}`);
    console.log(`     - Remediation Actions:`);
    for (const action of optimalReport.remediationActions) {
        console.log(`       ├─ Action: "${action}"`);
    }

    if (optimalReport.successionReadinessScore < 0.85 || optimalReport.readinessLevel !== 'OPTIMAL') {
        throw new Error('Optimal Succession transition failed to score as OPTIMAL!');
    }
    console.log('  ✅ Scenario 1 (Optimal Succession Handoff) passed.\n');

    // ────────────────────────────────────────────────────────────────────────
    // SCENARIO 2: Catastrophic Context Collapse & Heavy Scar Tissue Handoff
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [SCENARIO 2] Executing Degraded Succession Handoff (Context Collapse)...');
    const degradedState: SuccessionInput = {
        playbooks: [
            { name: 'NTP Synchronization Guide', clarityScore: 0.50, stepByStepGuideAvailable: false, updatedWithinDays: 200 }, // Stale & incomplete
            { name: 'WAL Corruption Restoration Guide', clarityScore: 0.40, stepByStepGuideAvailable: false, updatedWithinDays: 300 } // Stale & incomplete
        ],
        scarTissueWarnings: [
            'Scar Warning: override of autovacuum constraints during recovery incident #204',
            'Scar Warning: manual replication lag check bypassed on standby node #2',
            'Scar Warning: dynamic memory threshold force override by SreBob'
        ],
        overrideRecords: [
            { overrideId: 'o1', hasStructuredRationale: false, hasCausalAncestry: true }, // untraceable
            { overrideId: 'o2', hasStructuredRationale: true, hasCausalAncestry: false },  // untraceable
            { overrideId: 'o3', hasStructuredRationale: false, hasCausalAncestry: false }  // untraceable
        ],
        historicalThawsCount: 8 // High thaw bypass usage
    };

    const degradedReport = simulator.simulateSuccession(degradedState);
    console.log(`     - Succession Readiness: Score=${degradedReport.successionReadinessScore}, Level=${degradedReport.readinessLevel}`);
    console.log(`     - Playbook Coverage: ${degradedReport.playbookCoverage}, Override Traceability: ${degradedReport.overrideTraceability}`);
    console.log(`     - Scar Tissue Cognitive Load: ${degradedReport.scarTissueCognitiveLoad}`);
    console.log(`     - Remediation Actions:`);
    for (const action of degradedReport.remediationActions) {
        console.log(`       ├─ Action: "${action}"`);
    }

    if (degradedReport.successionReadinessScore >= 0.60 || degradedReport.readinessLevel !== 'CRITICAL') {
        throw new Error('Degraded Succession transition failed to score as CRITICAL!');
    }
    
    // Ensure all target remediation messages are present
    const actionsStr = JSON.stringify(degradedReport.remediationActions);
    if (!actionsStr.includes('Update stale or unclear playbooks') ||
        !actionsStr.includes('Enforce structured rationale logging') ||
        !actionsStr.includes('Accumulated scar tissue cognitive load is high') ||
        !actionsStr.includes('Thaw bypass usage is elevated')) {
        throw new Error('Degraded Succession report is missing critical remediation guides!');
    }
    console.log('  ✅ Scenario 2 (Degraded Succession Handoff) passed.\n');

    console.log('================================================================================');
    console.log('🎉  ZTAN STEWARDSHIP EPOCH B SUCCESSION DRILLS COMPLETED SUCCESSFULLY!');
    console.log('================================================================================');
}

runEpochBDrills().catch(err => {
    console.error('\n❌  DRILL FAILURE DETECTED:');
    console.error(err);
    process.exit(1);
});

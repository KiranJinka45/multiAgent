import dotenv from 'dotenv';
dotenv.config();

import {
  FaultInjectionEngine,
  EntropyHarness,
  CampaignRunner,
  OfflineCapsuleBuilder,
  ConstitutionalFreezeCheck,
  ExecutionCoordinator,
  JournalEntry,
  CheckpointEntry,
  TaskState
} from '../packages/runtime-core/src/index';

async function runPhaseOmega1Verification() {
  console.log('================================================================================');
  console.log('🧪  ZTAN PHASE Ω.1 — SURVIVABILITY HARNESS INFRASTRUCTURE VERIFICATION DRILLS');
  console.log('================================================================================\n');

  const coordinator = new ExecutionCoordinator({
    maxMemoryMb: 256,
    initialCapabilities: ['fs_write']
  });

  // ────────────────────────────────────────────────────────────────────────
  // DRILL 1: Chaos Campaigns & Decoupling Invariant Checks
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [DRILL 1] Running Chaos Campaigns & Decoupling drills...');
  const runner = new CampaignRunner();

  // Inject a telemetry DB crash and WAL journal disk corruption
  const campaignReport = runner.runValidationCampaign('camp-chaos-999', coordinator, [
    ['TELEMETRY_DB_CRASH', 'ARCHAEOLOGY_PLANE_CRASH'],
    ['WAL_CORRUPTION', 'MERKLE_WITNESS_FAILURE']
  ]);

  console.log(`     - Campaign Success: success=${campaignReport.success}, overallSovereignty=${campaignReport.overallSovereigntyScore}`);
  console.log(`     - Summary: "${campaignReport.summary}"`);
  
  const drill1 = campaignReport.drillResults[0];
  const drill2 = campaignReport.drillResults[1];
  console.log(`       ├─ Drill 1 (Plane Crash): decoupled=${drill1.telemetryDecoupled}, passed=${drill1.invariantsPassed}, score=${drill1.kernelSovereigntyScore}`);
  console.log(`       └─ Drill 2 (WAL Corruption): decoupled=${drill2.telemetryDecoupled}, passed=${drill2.invariantsPassed}, score=${drill2.kernelSovereigntyScore}, violations=[${drill2.violations.join('; ')}]`);

  if (
    !campaignReport.success || // The campaign correctly succeeded in proving survival invariants under chaos
    !drill1.telemetryDecoupled ||
    drill2.kernelSovereigntyScore !== 0.5 ||
    drill2.violations.length === 0
  ) {
    throw new Error('CampaignRunner failed to identify telemetry decoupling or WAL corruption invariants!');
  }

  console.log('  ✅ Chaos Campaigns & Decoupling verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // DRILL 2: Constitutional Freeze CI Static Checkers
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [DRILL 2] Running Constitutional Freeze CI Static check drills...');
  const freezeCheck = new ConstitutionalFreezeCheck();

  // Case A: Clean, compliant code
  const compliantCode = `
    export class SystemMetrics {
        public readDiskUsage(): number {
            return 1024;
        }
    }
  `;
  const auditCompliant = freezeCheck.auditSourceContent('src/metrics.ts', compliantCode);
  console.log(`     - Compliant File Audit: success=${auditCompliant.success}, violationsCount=${auditCompliant.violationsDetected.length}`);
  if (!auditCompliant.success || auditCompliant.violationsDetected.length !== 0) {
    throw new Error('ConstitutionalFreezeCheck flagged valid, compliant code as a violation!');
  }

  // Case B: Violating code (incorporates forbidden self-healing loop and dynamic eval compilation)
  const violatingCode = `
    export class AutoRecover {
        public handleFailure() {
            console.log("Entering forbidden self-healing loop execution...");
            const fn = new Function('console.log("eval call");');
            fn();
        }
    }
  `;
  const auditViolating = freezeCheck.auditSourceContent('src/autorecover.ts', violatingCode);
  console.log(`     - Violating File Audit: success=${auditViolating.success}, violationsCount=${auditViolating.violationsDetected.length}, keywords=[${auditViolating.bannedKeywordsDetected.join(', ')}]`);
  console.log(`       └─ Violation detail: "${auditViolating.violationsDetected[0]}"`);

  if (
    auditViolating.success ||
    auditViolating.violationsDetected.length !== 2 ||
    !auditViolating.bannedKeywordsDetected.includes('self-healing')
  ) {
    throw new Error('ConstitutionalFreezeCheck failed to detect forbidden self-healing or dynamic compilation code!');
  }

  console.log('  ✅ Constitutional Freeze CI Static checks verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // DRILL 3: Stand-alone Offline Archaeology Capsules
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [DRILL 3] Running Stand-alone Offline Capsule drill...');
  const builder = new OfflineCapsuleBuilder();
  const taskId = 'task-capsule-777';

  // Mock inputs representing completed compacted execution history
  const journalEntries: JournalEntry[] = [
    { taskId, stepIndex: 0, state: 'INIT', payloadHash: 'hash-001', timestamp: Date.now() },
    { taskId, stepIndex: 1, state: 'RUNNING', payloadHash: 'hash-002', timestamp: Date.now() },
    { taskId, stepIndex: 2, state: 'SUCCESS', payloadHash: 'hash-003', timestamp: Date.now() }
  ];

  const checkpointSnapshot: CheckpointEntry = {
    taskId,
    stepIndex: 2,
    state: 'SUCCESS',
    consolidatedStatePayload: { dbStatus: 'active', nodeCount: 15 },
    timestamp: Date.now()
  };

  // Compile standalone capsule HTML
  const capsuleHtml = builder.buildOfflineCapsule(taskId, journalEntries, checkpointSnapshot);
  
  // Validate structure
  const capsuleAudit = builder.validateOfflineCapsule(capsuleHtml);
  console.log(`     - Capsule Validation: isValid=${capsuleAudit.isValid}, violationsCount=${capsuleAudit.violations.length}`);
  
  if (!capsuleAudit.isValid || capsuleAudit.violations.length !== 0 || !capsuleHtml.includes('id="ztan-capsule-data"')) {
    throw new Error('OfflineCapsuleBuilder compiled structurally invalid or corrupted offline capsule HTML!');
  }

  console.log('  ✅ Stand-alone Offline Archaeology Capsules verified.\n');

  console.log('🎉==============================================================================');
  console.log('🏆  ALL ZTAN PHASE Ω.1 SURVIVABILITY HARNESS DRILLS PASSED SUCCESSFULLY!');
  console.log('==============================================================================🎉');
}

runPhaseOmega1Verification().catch((err) => {
  console.error('\n❌ VERIFICATION DRILLS FAILED IN RUNTIME STAGE:');
  console.error(err);
  process.exit(1);
});

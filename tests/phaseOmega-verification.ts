import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

import {
  ExecutionValidationCoordinator,
  HardenedIsolationProfile,
  WorkflowGraph,
  TaskState
} from '../packages/runtime-core/src/index';

async function runPhaseOmegaVerification() {
  console.log('================================================================================');
  console.log('🧪  ZTAN PHASE Ω — EMPIRICAL SURVIVABILITY CAMPAIGNS VERIFICATION DRILLS');
  console.log('================================================================================\n');

  // ────────────────────────────────────────────────────────────────────────
  // Setup Fixtures for Replay Parity
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚙️  Preparing validation fixtures...');
  const fixturesDir = path.resolve('fixtures/replay-corpus');
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  // Legal sequence of receipts matching state matrix transitions
  const legalHistory = {
    history: [
      {
        receipt: {
          sequenceNumber: 1,
          epochId: 1,
          action: 'GOVERNANCE_PROPOSAL',
          previousGRoot: 'root-0',
          gRoot: 'root-1'
        }
      },
      {
        receipt: {
          sequenceNumber: 2,
          epochId: 1,
          action: 'COUNCIL_UPDATE',
          previousGRoot: 'root-1',
          gRoot: 'root-2'
        }
      },
      {
        receipt: {
          sequenceNumber: 3,
          epochId: 1,
          action: 'STATE_CHECKPOINT',
          previousGRoot: 'root-2',
          gRoot: 'root-3'
        }
      }
    ]
  };

  const historyFilePath = path.join(fixturesDir, 'full_history.json');
  fs.writeFileSync(historyFilePath, JSON.stringify(legalHistory, null, 2), 'utf8');
  console.log(`  ✅ Wrote legal receipt history to ${historyFilePath}\n`);

  const coordinator = new ExecutionValidationCoordinator();

  // ────────────────────────────────────────────────────────────────────────
  // DRILL A: Isolation Reality Campaign
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [DRILL A] Testing Isolation Reality Campaign...');
  const baseProfile: HardenedIsolationProfile = {
    namespaceIsolation: true,
    overlayFsImmutable: true,
    hypervisorBoundary: 'Firecracker',
    seccompBpfActive: true
  };

  // Case 1: Mount/Network Namespace Escape Attack Simulation
  const reportNamespace = coordinator.runIsolationRealityCampaign(baseProfile, {
    simulateNamespaceEscape: true,
    simulateSeccompBypass: false,
    simulateOverlayMutation: false
  });
  console.log(`     - Namespace Escape Drill: quarantineTriggered=${reportNamespace.quarantineTriggered}, score=${reportNamespace.score}, violations=[${reportNamespace.violationsDetected.join('; ')}]`);
  if (!reportNamespace.quarantineTriggered || reportNamespace.score >= 1.0) {
    throw new Error('Isolation Reality Campaign failed to quarantine namespace escape!');
  }

  // Case 2: Overlayfs Mutation / Privilege Escalation Drill
  const reportOverlay = coordinator.runIsolationRealityCampaign(baseProfile, {
    simulateNamespaceEscape: false,
    simulateSeccompBypass: false,
    simulateOverlayMutation: true
  });
  console.log(`     - Overlayfs Mutation Drill: quarantineTriggered=${reportOverlay.quarantineTriggered}, score=${reportOverlay.score}`);
  if (!reportOverlay.quarantineTriggered) {
    throw new Error('Isolation Reality Campaign failed to quarantine overlayfs write mutation!');
  }

  // Case 3: Seccomp Syscall Filter Bypass Drill
  const reportSeccomp = coordinator.runIsolationRealityCampaign(baseProfile, {
    simulateNamespaceEscape: false,
    simulateSeccompBypass: true,
    simulateOverlayMutation: false
  });
  console.log(`     - Seccomp Bypass Drill: quarantineTriggered=${reportSeccomp.quarantineTriggered}, score=${reportSeccomp.score}`);
  if (reportSeccomp.score !== 0.8 || reportSeccomp.quarantineTriggered) {
    throw new Error('Isolation Reality Campaign computed incorrect score for seccomp filter bypass!');
  }

  console.log('  ✅ Isolation Reality Campaign verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // DRILL B: Replay Fidelity Campaign
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [DRILL B] Testing Replay Fidelity Campaign...');
  const initialInventory = {
    databaseState: 'online',
    itemCount: 100,
    syncStatus: 'stable'
  };

  const steps = [
    { actionType: 'LOAD_INVENTORY', payload: { itemCount: 150 } },
    { actionType: 'CHECK_LIMIT', payload: { syncStatus: 'processing' } }, // Checkpoint Captured here
    { actionType: 'UPDATE_INVENTORY', payload: { itemCount: 200 } },
    { actionType: 'SHUTDOWN_SYNC', payload: { syncStatus: 'completed' } }
  ];

  const fidelityReport = coordinator.runReplayFidelityCampaign('task-fid-111', steps, 1, initialInventory);
  console.log(`     - Replay Fidelity: accuracyScore=${fidelityReport.accuracyScore}, divergenceScore=${fidelityReport.divergenceScore}, compactionRatio=${fidelityReport.compactionRatio}, prunedCount=${fidelityReport.prunedLogsCount}`);
  
  if (
    fidelityReport.accuracyScore !== 1.0 ||
    fidelityReport.divergenceScore !== 0.0 ||
    fidelityReport.compactionRatio <= 0.0 ||
    fidelityReport.prunedLogsCount !== 1
  ) {
    throw new Error('Replay Fidelity Campaign failed to verify correct compaction recovery metrics!');
  }

  console.log('  ✅ Replay Fidelity Campaign verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // DRILL C: Irreversible Action Campaigns & Override Gating
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [DRILL C] Testing Irreversible Action Campaign & Override Gating...');
  
  const testGraph: WorkflowGraph = {
    nodes: [
      { id: 'node-1', actionType: 'CREATE_FILE', payload: {} },
      { id: 'node-2', actionType: 'SEND_EMAIL', payload: {} }, // Irreversible Node
      { id: 'node-3', actionType: 'WRITE_DATABASE', payload: {} }
    ],
    edges: [
      { from: 'node-1', to: 'node-2' },
      { from: 'node-2', to: 'node-3' }
    ]
  };

  // Case A: Gated successfully when irreversible operation is NOT SRE-approved
  const reportBlocked = coordinator.runIrreversibleActionCampaign(testGraph, [], initialInventory);
  console.log(`     - Non-approved Drill: gatedSuccessfully=${reportBlocked.gatedSuccessfully}, overallConfidence=${reportBlocked.overallConfidence}, blockedStepsCount=${reportBlocked.blockedStepsCount}, approvedOverridesCount=${reportBlocked.approvedOverridesCount}`);
  
  if (!reportBlocked.gatedSuccessfully || reportBlocked.blockedStepsCount !== 1 || reportBlocked.overallConfidence !== 0.0) {
    throw new Error('Irreversible Action Campaign failed to block unapproved irreversible nodes!');
  }

  // Case B: Approved and logged successfully when SRE overrides the irreversible node
  const reportApproved = coordinator.runIrreversibleActionCampaign(testGraph, ['node-2'], initialInventory);
  console.log(`     - Approved Override Drill: overrideAudited=${reportApproved.overrideAudited}, approvedOverridesCount=${reportApproved.approvedOverridesCount}, blockedStepsCount=${reportApproved.blockedStepsCount}`);
  
  if (!reportApproved.overrideAudited || reportApproved.approvedOverridesCount !== 1 || reportApproved.blockedStepsCount !== 0) {
    throw new Error('Irreversible Action Campaign failed to log and audit the SRE override path!');
  }

  console.log('  ✅ Irreversible Action Campaign verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // DRILL D: Cold Checkpoint Archaeology Drill
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [DRILL D] Testing Cold Checkpoint Archaeology...');
  
  const mockArchivePayload = {
    taskId: 'task-archive-444',
    checkpointIndex: 5,
    state: 'SUCCESS' as TaskState,
    payload: {
      accountBalance: 5000,
      verifiedTransactions: 120,
      archivedTimestamp: Date.now()
    },
    verificationHash: '', // Will fill in
    timestamp: Date.now()
  };

  // Compute mock payload hash
  const str = JSON.stringify(mockArchivePayload.payload);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  mockArchivePayload.verificationHash = `hash-${Math.abs(hash)}`;

  // Run cold recovery
  const coldReport = coordinator.runColdRecoveryCampaign(mockArchivePayload);
  console.log(`     - Cold Archive Restored: integrityVerified=${coldReport.archiveIntegrityVerified}, compressionRatio=${coldReport.compressionRatio}, operatorReadability=${coldReport.operatorReadabilityScore}, restoredTaskId=${coldReport.restoredTaskId}`);
  
  if (
    !coldReport.archiveIntegrityVerified ||
    coldReport.compressionRatio !== 0.45 ||
    coldReport.operatorReadabilityScore !== 1.0 ||
    !coldReport.reconstructedStatePayload ||
    coldReport.reconstructedStatePayload.accountBalance !== 5000
  ) {
    throw new Error('Cold Recovery Campaign failed to correctly reconstruct state from compressed archive snapshot!');
  }

  console.log('  ✅ Cold Checkpoint Archaeology verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // DRILL E: Rust Auditor Legality Parity
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [DRILL E] Testing Rust Auditor Legality Parity...');
  try {
    const rustOutput = execSync('cargo run --release', { cwd: 'auditor-rs', encoding: 'utf8' });
    console.log(`     - Rust Auditor stdout:\n${rustOutput.trim().split('\n').map(l => '       ' + l).join('\n')}`);
    
    if (!rustOutput.includes('Institutional truth verified.')) {
      throw new Error('Rust independent auditor did not verify history receipt sequence successfully!');
    }
    console.log('  ✅ Rust Auditor Legality Parity verified.\n');
  } catch (err: any) {
    throw new Error(`Rust independent auditor execution failed: ${err.message || err}`);
  }

  console.log('🎉==============================================================================');
  console.log('🏆  ALL ZTAN PHASE Ω SURVIVABILITY CAMPAIGNS AND BOUNDARY DRILLS PASSED!');
  console.log('==============================================================================🎉');
}

runPhaseOmegaVerification().catch((err) => {
  console.error('\n❌ VERIFICATION DRILLS FAILED IN RUNTIME STAGE:');
  console.error(err);
  process.exit(1);
});

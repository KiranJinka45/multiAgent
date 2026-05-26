import dotenv from 'dotenv';
dotenv.config();

import {
  HardenedIsolationEngine,
  HardenedIsolationProfile,
  HardenedIsolationReport,
  ShadowExecutionEngine,
  ShadowExecutionReport,
  StateDiff,
  CompactedExecutionJournal,
  WorkflowGraph,
  WorkflowNode
} from '../packages/runtime-core/src/index';

async function runPhase28Verification() {
  console.log('================================================================================');
  console.log('🧪  ZTAN PHASE 28 — HARDENED ISOLATION & VIRTUAL EXECUTION VERIFICATION DRILLS');
  console.log('================================================================================\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 1: Hardened Isolation Engine Security Scoring and Quarantines
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 1] Testing Hardened Isolation Engine...');
  const isolationEngine = new HardenedIsolationEngine(0.80);

  // Case A: Ideal highly-isolated environment (Firecracker, namespaces, immutable overlay, active seccomp)
  const idealProfile: HardenedIsolationProfile = {
    namespaceIsolation: true,
    overlayFsImmutable: true,
    hypervisorBoundary: 'Firecracker',
    seccompBpfActive: true
  };
  const reportIdeal = isolationEngine.evaluateIsolationSecurity(idealProfile);
  console.log(`     - Ideal Isolation: score=${reportIdeal.isolationSecurityScore}, isHighlyIsolated=${reportIdeal.isHighlyIsolated}, quarantineTriggered=${reportIdeal.quarantineTriggered}`);
  if (reportIdeal.isolationSecurityScore !== 1.0 || !reportIdeal.isHighlyIsolated || reportIdeal.quarantineTriggered) {
    throw new Error('HardenedIsolationEngine failed to validate an ideal isolation profile!');
  }

  // Case B: Compromised namespaces
  const compromisedNamespaceProfile: HardenedIsolationProfile = {
    ...idealProfile,
    namespaceIsolation: false
  };
  const reportCompNamespace = isolationEngine.evaluateIsolationSecurity(compromisedNamespaceProfile);
  console.log(`     - Compromised Namespace: score=${reportCompNamespace.isolationSecurityScore}, quarantineTriggered=${reportCompNamespace.quarantineTriggered}, violations=[${reportCompNamespace.violations.join('; ')}]`);
  if (!reportCompNamespace.quarantineTriggered || reportCompNamespace.isolationSecurityScore >= 1.0) {
    throw new Error('HardenedIsolationEngine failed to quarantine compromised namespaces!');
  }

  // Case C: Shared container / bare metal hypervisor boundary (None)
  const missingHypervisorProfile: HardenedIsolationProfile = {
    ...idealProfile,
    hypervisorBoundary: 'None'
  };
  const reportMissingHypervisor = isolationEngine.evaluateIsolationSecurity(missingHypervisorProfile);
  console.log(`     - Missing Hypervisor: score=${reportMissingHypervisor.isolationSecurityScore}, quarantineTriggered=${reportMissingHypervisor.quarantineTriggered}, violations=[${reportMissingHypervisor.violations.join('; ')}]`);
  if (!reportMissingHypervisor.quarantineTriggered || reportMissingHypervisor.isolationSecurityScore >= 1.0) {
    throw new Error('HardenedIsolationEngine failed to quarantine absent hypervisor boundary!');
  }

  // Case D: Mutable overlayfs boundary
  const mutableOverlayProfile: HardenedIsolationProfile = {
    ...idealProfile,
    overlayFsImmutable: false
  };
  const reportMutableOverlay = isolationEngine.evaluateIsolationSecurity(mutableOverlayProfile);
  console.log(`     - Mutable OverlayFS: score=${reportMutableOverlay.isolationSecurityScore}, quarantineTriggered=${reportMutableOverlay.quarantineTriggered}`);
  if (!reportMutableOverlay.quarantineTriggered) {
    throw new Error('HardenedIsolationEngine failed to quarantine mutable overlayfs filesystem!');
  }

  // Case E: Inactive seccomp BPF (deducts score, but other parameters are high enough so score is 0.8)
  const inactiveSeccompProfile: HardenedIsolationProfile = {
    ...idealProfile,
    seccompBpfActive: false
  };
  const reportInactiveSeccomp = isolationEngine.evaluateIsolationSecurity(inactiveSeccompProfile);
  console.log(`     - Inactive Seccomp: score=${reportInactiveSeccomp.isolationSecurityScore}, isHighlyIsolated=${reportInactiveSeccomp.isHighlyIsolated}, quarantineTriggered=${reportInactiveSeccomp.quarantineTriggered}`);
  if (reportInactiveSeccomp.isolationSecurityScore !== 0.8 || !reportInactiveSeccomp.isHighlyIsolated || reportInactiveSeccomp.quarantineTriggered) {
    throw new Error('HardenedIsolationEngine computed incorrect score or quarantine status for inactive seccomp BPF!');
  }

  console.log('  ✅ Hardened Isolation Engine verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 2: Shadow Execution speculative previews and state diff calculations
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 2] Testing Shadow Execution speculative previews...');
  const shadowEngine = new ShadowExecutionEngine();

  const initialState = {
    userId: 'user-456',
    walletBalance: 150.0,
    emailSent: false,
    filesCreated: [] as string[]
  };

  // Case A: Fully reversible pipeline
  const reversibleGraph: WorkflowGraph = {
    nodes: [
      { id: 'step-A', actionType: 'CREATE_FILE', payload: { filesCreated: ['config.yaml'] } },
      { id: 'step-B', actionType: 'WRITE_DATABASE', payload: { walletBalance: 100.0 } }
    ],
    edges: [
      { from: 'step-A', to: 'step-B' }
    ]
  };

  const reportReversible = shadowEngine.executeSpeculativePreview(reversibleGraph, initialState);
  console.log(`     - Reversible Pipeline: success=${reportReversible.success}, overallRollbackConfidence=${reportReversible.overallRollbackConfidenceScore}`);
  console.log(`       └─ StateDiff modifiedKeys for step-B: [${reportReversible.stateDiffs['step-B'].modifiedKeys.join(', ')}]`);
  
  if (
    !reportReversible.success ||
    reportReversible.overallRollbackConfidenceScore !== 1.0 ||
    !reportReversible.stateDiffs['step-B'].modifiedKeys.includes('walletBalance')
  ) {
    throw new Error('ShadowExecutionEngine failed to validate a fully reversible pipeline!');
  }

  // Case B: Pipeline containing irreversible action (SEND_EMAIL)
  const irreversibleGraph: WorkflowGraph = {
    nodes: [
      { id: 'step-A', actionType: 'CREATE_FILE', payload: { filesCreated: ['config.yaml'] } },
      { id: 'step-B', actionType: 'SEND_EMAIL', payload: { emailSent: true } }
    ],
    edges: [
      { from: 'step-A', to: 'step-B' }
    ]
  };

  const reportIrreversible = shadowEngine.executeSpeculativePreview(irreversibleGraph, initialState);
  console.log(`     - Irreversible Pipeline: success=${reportIrreversible.success}, overallRollbackConfidence=${reportIrreversible.overallRollbackConfidenceScore}, quarantineTriggered=${reportIrreversible.quarantineTriggered}`);
  
  if (
    reportIrreversible.success ||
    reportIrreversible.overallRollbackConfidenceScore !== 0.0 ||
    !reportIrreversible.quarantineTriggered
  ) {
    throw new Error('ShadowExecutionEngine failed to quarantine / block irreversible pipeline without SRE override!');
  }

  // Case C: Simulated error recovery
  const failingGraph: WorkflowGraph = {
    nodes: [
      { id: 'step-A', actionType: 'CREATE_FILE', payload: {} }
    ],
    edges: []
  };

  const reportError = shadowEngine.executeSpeculativePreview(failingGraph, initialState, {
    stepSimulator: () => { throw new Error('Simulated hardware read fault'); }
  });
  console.log(`     - Failing Simulation: success=${reportError.success}, error="${reportError.error}"`);
  if (reportError.success || !reportError.error?.includes('Simulated hardware')) {
    throw new Error('ShadowExecutionEngine failed to abort gracefully on simulation failures!');
  }

  console.log('  ✅ Shadow Execution Speculative Previews verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 3: Compacting Journal WAL entries pruning & recovery reconstruction
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 3] Testing Compacting Journal WAL entries pruning...');
  const compactJournal = new CompactedExecutionJournal();
  const taskId = 'task-comp-789';

  // 1. Log intermediate sequential execution entries in the WAL log
  compactJournal.appendEntry(taskId, 0, 'INIT', { start: true });
  compactJournal.appendEntry(taskId, 1, 'RUNNING', { action: 'INITIAL_LOAD' });
  compactJournal.appendEntry(taskId, 2, 'RUNNING', { action: 'UPDATE_INVENTORY' });

  // 2. Perform a checkpoint consolidation at step 2
  const consolidatedInventoryState = { inventoryCount: 50, status: 'synced' };
  compactJournal.checkpointSnapshot(taskId, 2, 'RUNNING', consolidatedInventoryState);

  // 3. Log post-checkpoint execution entries
  compactJournal.appendEntry(taskId, 3, 'RUNNING', { action: 'PROCESS_DISPATCH' });
  compactJournal.appendEntry(taskId, 4, 'SUCCESS', { action: 'FINALIZE_DELIVERY' });

  // Verify journal has entries
  const initialEntries = compactJournal.getJournalForTask(taskId);
  console.log(`     - Initial WAL entries count: ${initialEntries.length}`);
  if (initialEntries.length !== 6) { // 5 appends + 1 checkpoint append marker
    throw new Error(`Unexpected initial journal entries count: ${initialEntries.length}`);
  }

  // 4. Perform compaction to prune all logs prior to step 2 checkpoint
  const compactResult = compactJournal.compactJournal(taskId);
  const postCompactionEntries = compactJournal.getJournalForTask(taskId);
  console.log(`     - Compacted WAL journal: prunedCount=${compactResult.prunedCount}, remainingCount=${postCompactionEntries.length}`);
  
  if (compactResult.prunedCount !== 2) { // stepIndex 0, 1 should be pruned
    throw new Error(`Incorrect pruned count: expected 2, got ${compactResult.prunedCount}`);
  }
  if (postCompactionEntries.length !== 4) { // stepIndex 2 (checkpoint append marker), 2 (checkpoint entry), 3, 4 should be retained
    throw new Error(`Incorrect remaining count: expected 4, got ${postCompactionEntries.length}`);
  }

  // Assert that stepIndex 0 and 1 are actually gone
  const step0 = postCompactionEntries.find(e => e.stepIndex === 0);
  const step1 = postCompactionEntries.find(e => e.stepIndex === 1);
  if (step0 || step1) {
    throw new Error('CompactingJournal failed to prune journal entries below checkpoint stepIndex!');
  }

  // 5. Test reconstruction from checkpoint baseline + post-checkpoint WAL delta logs
  const recoveryResult = compactJournal.reconstructTaskStateWithCompaction(taskId);
  console.log(`     - Recovery reconstruction: lastStepIndex=${recoveryResult.lastStepIndex}, lastState=${recoveryResult.lastState}, baselineState=${JSON.stringify(recoveryResult.baselineState)}`);
  
  if (
    recoveryResult.lastStepIndex !== 4 ||
    recoveryResult.lastState !== 'SUCCESS' ||
    recoveryResult.baselineState.inventoryCount !== 50
  ) {
    throw new Error('CompactingJournal failed to reconstruct correct state taking checkpoint baseline and post-checkpoint delta logs into account!');
  }

  console.log('  ✅ Compacting Journal verified.\n');

  console.log('🎉==============================================================================');
  console.log('🏆  ALL ZTAN PHASE 28 VERIFICATION DRILLS PASSED SUCCESSFULLY!');
  console.log('==============================================================================🎉');
}

runPhase28Verification().catch((err) => {
  console.error('\n❌ VERIFICATION DRILLS FAILED IN RUNTIME STAGE:');
  console.error(err);
  process.exit(1);
});

import './env-setup.js';
import {
  TeamDriftAuditor,
  OnboardingChecklist,
  OperatorInfo
} from '../packages/runtime-core/src/index';

async function runPhase17Verification() {
  console.log('================================================================================');
  console.log('🧪  ZTAN PHASE 17 - ORGANIZATIONAL DRIFT ARCHAEOLOGY RUNNER');
  console.log('================================================================================\n');

  const auditor = new TeamDriftAuditor();

  // ────────────────────────────────────────────────────────────────────────
  // TEST 1: SRE Alert Routing Decay
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 1] Auditing SRE Alert Routing Decay...');

  const activeOperators = new Set<string>(['operator-alpha', 'operator-beta']);
  const routingMap = new Map<string, string[]>([
    ['critical-fencing-failure', ['operator-alpha', 'operator-gamma']], // Has alpha (active)
    ['wal-rot-alarm', ['operator-delta']], // Delta is inactive (Orphaned)
    ['lease-renewal-delay', ['operator-beta']], // Beta is active (SPOF)
    ['cpu-starvation-alert', ['operator-alpha']] // Alpha is active (SPOF)
  ]);

  const report1 = auditor.auditAlertRoutingDecay(routingMap, activeOperators);
  console.log(`     - Decay check: decayIndex=${report1.decayIndex}%, orphanedChannels=[${report1.orphanedChannels.join(', ')}], isValid=${report1.isValid}`);
  console.log(`     - SPOF operators found: ${report1.singlePointsOfFailure.length}`);
  for (const s of report1.singlePointsOfFailure) {
    console.log(`       └─ Operator: ${s.operatorId}, SPOF Channels: [${s.criticalChannels.join(', ')}]`);
  }

  if (report1.decayIndex !== 25) {
    throw new Error('Alert routing decay index calculation failed!');
  }
  if (!report1.orphanedChannels.includes('wal-rot-alarm')) {
    throw new Error('Failed to identify orphaned routing channels!');
  }
  const betaSpof = report1.singlePointsOfFailure.find(s => s.operatorId === 'operator-beta');
  if (!betaSpof || !betaSpof.criticalChannels.includes('lease-renewal-delay')) {
    throw new Error('Failed to identify single points of failure in SRE routing!');
  }

  console.log('  ✅ SRE Alert Routing Decay verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 2: Onboarding Entropy
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 2] Auditing Onboarding Checklist Entropy...');

  const now = Date.now();
  const dayMs = 1000 * 60 * 60 * 24;

  const checklists: OnboardingChecklist[] = [
    // Completed onboarding in 10 days
    {
      operatorId: 'operator-alpha',
      startDate: new Date(now - 15 * dayMs).toISOString(),
      attestationDate: new Date(now - 5 * dayMs).toISOString(),
      checklistTasks: [
        { taskName: 'Read Safety Charter', completed: true },
        { taskName: 'NIST Key Attestation Check', completed: true }
      ]
    },
    // Incomplete onboarding, running for 40 days
    {
      operatorId: 'operator-delta',
      startDate: new Date(now - 40 * dayMs).toISOString(),
      checklistTasks: [
        { taskName: 'Read Safety Charter', completed: true },
        { taskName: 'NIST Key Attestation Check', completed: false } // Critical pending
      ]
    }
  ];

  const report2 = auditor.measureOnboardingEntropy(checklists);
  console.log(`     - Onboarding Entropy: avgDelay=${report2.averageOnboardingDelayDays} days, incompleteRatio=${report2.incompleteTaskRatio}, entropyScore=${report2.onboardingEntropyScore}`);
  console.log(`     - Unattested count: ${report2.unattestedOperatorCount}, Critical Pending: [${report2.criticalPendingTasks.join(', ')}]`);

  if (report2.averageOnboardingDelayDays !== 25) {
    throw new Error('Onboarding delay calculation failed!');
  }
  if (report2.unattestedOperatorCount !== 1) {
    throw new Error('Unattested operator count check failed!');
  }
  if (report2.onboardingEntropyScore === 0 || report2.criticalPendingTasks.length !== 1) {
    throw new Error('Onboarding entropy score or critical task tracking failed!');
  }

  console.log('  ✅ Onboarding Checklist Entropy verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 3: Tribal Knowledge Islands
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 3] Auditing Tribal Knowledge Islands...');

  const operators: OperatorInfo[] = [
    {
      operatorId: 'operator-alpha',
      communicatesWith: ['operator-beta', 'operator-gamma'],
      exclusiveSubsystems: ['fencing-ledger-root', 'observatory-bypass-key']
    },
    {
      operatorId: 'operator-beta',
      communicatesWith: ['operator-alpha'], // Isolated (only 1 communication partner)
      exclusiveSubsystems: []
    },
    {
      operatorId: 'operator-gamma',
      communicatesWith: ['operator-alpha', 'operator-delta'],
      exclusiveSubsystems: ['fencing-ledger-root'] // Shared ownership of this subsystem
    }
  ];

  const report3 = auditor.mapTopologyDegradation(operators);
  console.log(`     - Tribal Islands found: [${report3.tribalKnowledgeIslands.join(', ')}]`);
  console.log(`     - Isolation index: ${report3.isolationIndex}%, Isolated Operators: [${report3.isolatedOperators.join(', ')}]`);
  console.log(`     - Topology Risk Score: ${report3.topologyRiskScore}`);

  if (!report3.tribalKnowledgeIslands.includes('operator-alpha')) {
    throw new Error('Failed to identify exclusive tribal knowledge ownership!');
  }
  if (report3.isolationIndex !== 33 || !report3.isolatedOperators.includes('operator-beta')) {
    throw new Error('Operator isolation index mapping failed!');
  }

  console.log('  ✅ Tribal Knowledge Islands verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 4: Communication Topology Path Degradation (Reorg Simulation)
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 4] Simulating SRE Team Reorg & Turnover...');

  // Simulating SRE layout degradation: operator-gamma leaves (removed), breaking the bridge to delta.
  const degradedOperators: OperatorInfo[] = [
    {
      operatorId: 'operator-alpha',
      communicatesWith: ['operator-beta'], // Reduced consult channels (lost gamma)
      exclusiveSubsystems: ['observatory-bypass-key']
    },
    {
      operatorId: 'operator-beta',
      communicatesWith: ['operator-alpha'], // Only consults alpha
      exclusiveSubsystems: []
    }
  ];

  const report4 = auditor.mapTopologyDegradation(degradedOperators);
  console.log(`     - Post-Reorg: isolationIndex=${report4.isolationIndex}%, Isolated Operators: [${report4.isolatedOperators.join(', ')}], Risk Score=${report4.topologyRiskScore}`);

  // Both alpha and beta now have only 1 communications partner, making them both isolated (100% isolation index)
  if (report4.isolationIndex !== 100 || report4.isolatedOperators.length !== 2) {
    throw new Error('Failed to audit correct topology risk increase under reorg simulation!');
  }

  console.log('  ✅ Communication Topology Path Degradation verified.\n');

  console.log('================================================================================');
  console.log('🎉 PHASE 17 ORGANIZATIONAL DRIFT ARCHAEOLOGY VERIFIED SUCCESSFULLY');
  console.log('================================================================================');
}

runPhase17Verification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});

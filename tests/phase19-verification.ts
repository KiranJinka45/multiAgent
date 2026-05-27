import './env-setup.js';
import {
  PolicyRetirementEngine,
  PolicyLog
} from '../packages/runtime-core/src/index';

async function runPhase19Verification() {
  console.log('================================================================================');
  console.log('🧪  ZTAN PHASE 19 - GOVERNANCE EFFICACY & RETIREMENT SCIENCE RUNNER');
  console.log('================================================================================\n');

  const engine = new PolicyRetirementEngine();

  // ────────────────────────────────────────────────────────────────────────
  // TEST 1: Policy Efficacy Scoring
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 1] Auditing Policy Efficacy (Cost-Benefit) Scoring...');

  // Active helpful policy: high rejections (50), low overhead (0.5ms)
  const reportHelpful = engine.scorePolicyEfficacy('strict-epoch-fence', 10000, 50, 0.5);
  console.log(`     - Helpful check: ratio=${reportHelpful.efficacyRatio}, costBenefit=${reportHelpful.costBenefitRatio}ms/block, score=${reportHelpful.efficacyScore}%, recommendation=${reportHelpful.recommendation}`);
  if (reportHelpful.efficacyScore < 75 || reportHelpful.recommendation !== 'RETAIN') {
    throw new Error('Efficacious policy scored poorly!');
  }

  // Bloat policy: 0 rejections, high overhead (15ms), running 1,000 times
  const reportBloat = engine.scorePolicyEfficacy('heavy-regex-payload-check', 1000, 0, 15);
  console.log(`     - Bloat check: ratio=${reportBloat.efficacyRatio}, costBenefit=${reportHelpful.costBenefitRatio}ms/block, score=${reportBloat.efficacyScore}%, recommendation=${reportBloat.recommendation}`);
  if (reportBloat.efficacyScore > 30 || reportBloat.recommendation !== 'RETIRE') {
    throw new Error('Bloat policy failed to flag retirement recommendation!');
  }

  console.log('  ✅ Policy Efficacy Scoring verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 2: Retirement Candidate Mappings
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 2] Auditing Retirement Candidate Recommendations...');

  // Stale, high-complexity policy (120 days idle, 200 days old, complexity Rank 4)
  const decision1 = engine.evaluateRetirementCandidate('complex-nested-ast-filter', 200, 120, 4);
  console.log(`     - Stale candidate check: index=${decision1.retirementIndex}%, shouldRetire=${decision1.shouldRetire}`);
  for (const r of decision1.reasons) {
    console.log(`       └─ Reason: ${r}`);
  }
  if (!decision1.shouldRetire || decision1.reasons.length < 2) {
    throw new Error('Stale high-complexity candidate failed retirement verification!');
  }

  // Active fresh policy (10 days old, 1 day idle, complexity Rank 2)
  const decision2 = engine.evaluateRetirementCandidate('simple-size-limit', 10, 1, 2);
  console.log(`     - Active candidate check: index=${decision2.retirementIndex}%, shouldRetire=${decision2.shouldRetire}`);
  if (decision2.shouldRetire || decision2.retirementIndex > 30) {
    throw new Error('Active fresh policy incorrectly recommended for retirement!');
  }

  console.log('  ✅ Retirement Candidate Recommendations verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 3: Policy Rollback Audits & Config Churn
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 3] Auditing Policy Rollback Logs & Config Churn...');

  const logs: PolicyLog[] = [
    {
      policyName: 'experimental-fanout-check',
      action: 'ENABLE',
      timestamp: '2026-05-25T10:00:00Z',
      reason: 'Deploying import check'
    },
    {
      policyName: 'experimental-fanout-check',
      action: 'DISABLE',
      timestamp: '2026-05-25T10:30:00Z',
      reason: 'Failing rebuild on client'
    },
    {
      policyName: 'experimental-fanout-check',
      action: 'ENABLE',
      timestamp: '2026-05-25T11:00:00Z',
      reason: 'Re-enabling with local fix'
    },
    {
      policyName: 'experimental-fanout-check',
      action: 'DISABLE',
      timestamp: '2026-05-25T11:15:00Z',
      reason: 'Causing high CPU loop lag'
    }
  ];

  const auditReport = engine.auditGovernanceRollback(logs);
  console.log(`     - Rollback Audit: churnCount=${auditReport.churnCount}, churnRisk=${auditReport.churnRiskScore}%, isVolatile=${auditReport.isVolatile}`);
  console.log(`     - Rollbacks registered: ${auditReport.rollbackList.length}`);
  for (const r of auditReport.rollbackList) {
    console.log(`       └─ Policy: ${r.policyName}, Disabled At: ${r.disabledAt}, Reason: "${r.reason}"`);
  }

  if (auditReport.churnCount !== 3 || !auditReport.isVolatile) {
    throw new Error('Config churn analysis failed to register volatile rapid-toggles!');
  }
  if (auditReport.rollbackList.length !== 2) {
    throw new Error('Failed to record all policy disabled events in rollback logs!');
  }

  console.log('  ✅ Policy Rollback Audits & Config Churn verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 4: Compound Governance Fatigue
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 4] Auditing Compound Governance Fatigue Reports...');

  const fatigueIndex = Math.round((reportBloat.efficacyScore === 0 ? 50 : 10) + (decision1.shouldRetire ? 30 : 0) + (auditReport.isVolatile ? 20 : 0));
  console.log(`     - Compound Governance Fatigue Score: ${fatigueIndex}% (Expected > 70%)`);
  if (fatigueIndex < 70) {
    throw new Error('Compound governance fatigue metric calculation failed!');
  }

  console.log('  ✅ Compound Governance Fatigue verified.\n');

  console.log('================================================================================');
  console.log('🎉 PHASE 19 GOVERNANCE EFFICACY & RETIREMENT SCIENCE VERIFIED SUCCESSFULLY');
  console.log('================================================================================');
}

runPhase19Verification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});

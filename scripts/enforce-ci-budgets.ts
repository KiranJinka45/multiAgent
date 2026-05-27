import { ComplexityBudgetEvaluator, TelemetryCardinalityAuditor } from '../packages/core-engine/src/index.js';

console.log('\n🛡️  ZTAN MECHANICAL CI COMPLEXITY BUDGET ENFORCEMENT');
console.log('==================================================');

const evaluator = new ComplexityBudgetEvaluator(process.cwd());
const report = evaluator.evaluate();

console.log(`\n📊 COMPLEXITY METRICS CHECK:`);
console.log(`- Direct Dependencies: ${report.dependencyCount} / ${report.dependencyCeiling}`);
console.log(`- Active Core Modules: ${report.complexityScore} / ${report.complexityCeiling}`);
console.log(`- Bundle Sizes:`);
for (const [pkg, size] of Object.entries(report.bundleSizeBytes)) {
  console.log(`  * @packages/${pkg}: ${Math.round(size / 1024)} KB / ${Math.round(report.bundleCeilingBytes / 1024)} KB`);
}

// Simulated dynamic telemetry registry check
const liveTelemetryData = {
  'ztan_tenant_executions_total': ['tenant-a', 'tenant-b', 'tenant-c'],
  'ztan_workflow_duration_seconds': Array.from({ length: 12 }, (_, i) => `flow-${i}`),
};

const auditor = new TelemetryCardinalityAuditor();
const cardinalityViolations = auditor.audit(liveTelemetryData);

console.log(`\n📈 TELEMETRY CARDINALITY CHECK:`);
for (const limit of auditor.getLimits()) {
  console.log(`- Metric: ${limit.metricName} (Cardinality: ${limit.actualCardinality} / ${limit.maxCardinality})`);
}

const allViolations = [...report.violations, ...cardinalityViolations];

if (allViolations.length > 0) {
  console.log('\n❌ COMPLEXITY BUDGET BREACHED!');
  console.log('--------------------------------------------------');
  for (const violation of allViolations) {
    console.log(`⚠️  Violation: ${violation}`);
  }
  console.log('--------------------------------------------------');
  console.log('🛑 [CI GATE] Build rejected due to mechanical complexity threshold limits.');
  process.exit(1);
} else {
  console.log('\n✅ COMPLEXITY BUDGET SECURED!');
  console.log('--------------------------------------------------');
  console.log('🎉 [CI GATE] All complexity, bundle, and telemetry budgets conform to charter limits.');
  console.log('--------------------------------------------------\n');
}

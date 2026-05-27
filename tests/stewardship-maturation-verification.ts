import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import {
  CodebaseSimplificationEnforcer,
  OperationalEconomicsModel,
  PersistenceArchaeologist,
  PilotGate,
  ObservableOverrideException
} from '../packages/runtime-core/src/index';

async function runStewardshipMaturationVerification() {
  console.log('================================================================================');
  console.log('🧪  ZTAN REALISM HARDENING & MATURATION OBSERVABILITY RUNNER');
  console.log('================================================================================\n');

  const workspaceRoot = process.cwd();

  // ────────────────────────────────────────────────────────────────────────
  // TEST 1: Codebase Simplification Enforcer
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 1] Auditing Codebase Simplification Quotas & Deletion Ratios...');
  const enforcer = new CodebaseSimplificationEnforcer(0.5);

  // Compliant change: 100 additions, 60 deletions (ratio = 0.6 >= 0.5)
  const reportOk = enforcer.evaluateSimplificationRatio(100, 60);
  console.log(`     - Compliant LOC check: isValid=${reportOk.isCompliant}, ratio=${reportOk.deletionRatio}, shrink=${reportOk.shrinkQuotient}`);
  if (!reportOk.isCompliant) {
    throw new Error('Compliant simplification change incorrectly flagged!');
  }

  // Non-compliant change: 100 additions, 20 deletions (ratio = 0.2 < 0.5)
  const reportFailed = enforcer.evaluateSimplificationRatio(100, 20);
  console.log(`     - Non-compliant LOC check: isValid=${reportFailed.isCompliant}, error="${reportFailed.error}"`);
  if (reportFailed.isCompliant || !reportFailed.error) {
    throw new Error('Non-compliant LOC growth failed to block change!');
  }

  // Dependency audit check
  const depReportOk = enforcer.auditDependencyCount(15, 15);
  console.log(`     - Baseline dependency check: isValid=${depReportOk.isCompliant}, drift=${depReportOk.drift}`);
  if (!depReportOk.isCompliant) {
    throw new Error('Baseline dependency count flagged as violation!');
  }

  const depReportCreep = enforcer.auditDependencyCount(17, 15);
  console.log(`     - Dependency creep check: isValid=${depReportCreep.isCompliant}, error="${depReportCreep.error}"`);
  if (depReportCreep.isCompliant || !depReportCreep.error) {
    throw new Error('Dependency creep failed to trigger violation!');
  }
  console.log('  ✅ Codebase Simplification & Dependency controls verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 2: Operational Economics Modeling
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 2] Auditing Operational Economics & Cost Projections...');
  const economics = new OperationalEconomicsModel(0.023, 0.000016, 75.00);

  // Storage cost projection: 1 GB/day, 90 days, 80% compaction
  const storageProj = economics.projectStorageCostGrowth(1024 * 1024 * 1024, 90, 0.8);
  console.log(`     - Storage Cost Projection (90 days, 80% compaction):`);
  console.log(`       ├─ Uncompressed Bytes: ${storageProj.uncompressedBytes}`);
  console.log(`       ├─ Compressed Bytes:   ${storageProj.compressedBytes}`);
  console.log(`       └─ Estimated Cost:     $${storageProj.estimatedStorageCostUsd} USD`);

  if (storageProj.estimatedStorageCostUsd !== 0.62) {
    throw new Error('Storage cost projection calculation incorrect!');
  }

  // Compute and SRE Labor MTTR cost
  const operationalReport = economics.estimateComputeAndLaborCost(10000, 50, 4.5); // 10k replays, 50ms avg, 4.5 hours MTTR
  console.log(`     - Compute and Labor Cost Report:`);
  console.log(`       ├─ Compute Cost: $${operationalReport.computeCostUsd} USD`);
  console.log(`       ├─ SRE Labor Cost: $${operationalReport.laborCostUsd} USD`);
  console.log(`       └─ TOTAL COST:    $${operationalReport.totalCostUsd} USD`);

  if (operationalReport.computeCostUsd !== 0.01 || operationalReport.laborCostUsd !== 337.50 || operationalReport.totalCostUsd !== 337.51) {
    throw new Error('Compute and SRE labor cost estimation calculations incorrect!');
  }

  const dailyReport = economics.generateEconomicReport(1024 * 1024); // 1 MB/sec ingestion rate
  console.log(`     - Telemetry Ingestion cost (1 MB/sec): monthly=$${dailyReport.estimatedMonthlyCostUsd} USD, triage=$${dailyReport.criticalAlertOverheadCost} USD`);
  console.log('  ✅ Operational Economics projections verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 3: Safe Storage Repairs (Quarantine-First, Operator Attestation)
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 3] Auditing Safe Storage Repairs (Quarantine-First & Operator Approved)...');
  const archaeologist = new PersistenceArchaeologist();
  
  const testDir = path.resolve(workspaceRoot, '.ztan', 'evidence-vault');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const testFile = path.join(testDir, 'corrupt-ledger-test.json');
  // Write a corrupt torn-write ledger array
  const corruptContent = '[ {"sequenceId": 1, "payload": "data1", "prevHash": "0x0", "hash": "0x123", "signature": "sig1", "operatorId": "op1", "timestamp": "now", "type": "GOVERNANCE", "epoch": "0", "verdict": "VERIFIED"} , { "sequence';
  fs.writeFileSync(testFile, corruptContent, 'utf8');

  // Attempt repair WITHOUT operator approval
  const statsNoApproval = await archaeologist.attemptRepair(testFile, true, false);
  console.log(`     - Repair without approval: success=${statsNoApproval.success}, error="${statsNoApproval.errorMessage}"`);
  
  // Verify quarantine backup exists
  const quarantineDir = path.join(testDir, '..', 'quarantine');
  const quarantineExists = fs.existsSync(quarantineDir);
  console.log(`     - Quarantine directory created: ${quarantineExists}`);
  const files = fs.readdirSync(quarantineDir);
  const backupFound = files.some(f => f.startsWith('corrupt-ledger-backup-') && f.endsWith('.json'));
  console.log(`     - Quarantine corrupt backup file found: ${backupFound}`);

  if (statsNoApproval.success || !statsNoApproval.errorMessage || !backupFound) {
    throw new Error('Repair without operator approval incorrectly processed or failed to quarantine!');
  }

  // Verify file has NOT been modified yet
  const postFailedRepairContent = fs.readFileSync(testFile, 'utf8');
  if (postFailedRepairContent !== corruptContent) {
    throw new Error('Ledger file was silently modified without operator approval!');
  }

  // Attempt repair WITH operator approval
  const statsApproved = await archaeologist.attemptRepair(testFile, true, true);
  console.log(`     - Repair with operator approval: success=${statsApproved.success}, blocks=${statsApproved.repairedBlockCount}`);

  if (!statsApproved.success || statsApproved.repairedBlockCount !== 1) {
    throw new Error('Operator approved storage repair failed!');
  }

  // Verify file has been successfully repaired
  const repairedContent = fs.readFileSync(testFile, 'utf8');
  const parsed = JSON.parse(repairedContent);
  console.log(`     - Repaired ledger parsed successfully: ${Array.isArray(parsed)} (Length: ${parsed.length})`);

  // Cleanup temp files
  if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  for (const file of fs.readdirSync(quarantineDir)) {
    fs.unlinkSync(path.join(quarantineDir, file));
  }
  fs.rmdirSync(quarantineDir);

  console.log('  ✅ Safe Storage Repair & Attestation verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 4: Observable Exception Overrides
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 4] Auditing Observable Exception Overrides & Time-Limits...');
  
  // 4.1 Check exception default is inactive
  const isActiveBefore = PilotGate.checkObservableException('Epoch-Fencing');
  console.log(`     - Active exception default (Epoch-Fencing): ${isActiveBefore}`);

  // 4.2 Register a valid unexpired exception
  const futureExpiry = new Date(Date.now() + 10000).toISOString(); // expires in 10s
  const exception1: ObservableOverrideException = {
    exceptionId: 'EX-991A',
    operator: 'steward_omega',
    targetInvariant: 'Epoch-Fencing',
    expiresAtIso: futureExpiry,
    reason: 'Allow temporary epoch override under standby replica failover',
    signatureBase64: 'MEQCID1i2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8a9b0c1d2e3f4g5h6i7j8k9l'
  };

  const registerReport = PilotGate.registerObservableException(exception1);
  const isActiveAfter = PilotGate.checkObservableException('Epoch-Fencing');
  console.log(`     - Registration status: allowed=${registerReport.allowed}`);
  console.log(`     - Active exception after registration (Epoch-Fencing): ${isActiveAfter}`);

  if (!registerReport.allowed || !isActiveAfter) {
    throw new Error('Failed to register valid observable exception override!');
  }

  // 4.3 Register an expired exception (should fail)
  const pastExpiry = new Date(Date.now() - 5000).toISOString(); // expired 5s ago
  const exceptionExpired: ObservableOverrideException = {
    exceptionId: 'EX-EXPIRED',
    operator: 'steward_omega',
    targetInvariant: 'Block-Parity',
    expiresAtIso: pastExpiry,
    reason: 'Stale bypass attempt',
    signatureBase64: 'MEQCID1i2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8a9b0c1d2e3f4g5h6i7j8k9l'
  };

  const registerExpiredReport = PilotGate.registerObservableException(exceptionExpired);
  console.log(`     - Expired registration status: allowed=${registerExpiredReport.allowed}, reason="${registerExpiredReport.reason}"`);

  if (registerExpiredReport.allowed || !registerExpiredReport.reason?.includes('EXPIRED_TIMESTAMP')) {
    throw new Error('Expired exception incorrectly allowed to register!');
  }

  // Clear active exceptions
  PilotGate.clearActiveExceptions();

  console.log('  ✅ Observable Exception Overrides verified.\n');

  console.log('================================================================================');
  console.log('🎉 ALL HARDENING MATURATION VERIFICATION DRILLS PASSED SUCCESSFULLY');
  console.log('================================================================================');
  process.exit(0);
}

runStewardshipMaturationVerification().catch(err => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});

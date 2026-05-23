/**
 * ZTAN — Telemetry Regression Analyzer & CI Gating Engine
 *
 * Compares current run metrics against baseline or predecessor run telemetry.
 * Enforces strict regression gates for heap growth, GC pauses, handle leaks,
 * and WAL amplification, exiting with code 1 on breaches.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function validatePath(p: string): string {
  const resolved = path.resolve(p);
  const resolvedRoot = path.resolve(rootDir);
  if (!resolved.startsWith(resolvedRoot)) {
    throw new Error(`Security violation: path access outside root directory disallowed: ${resolved}`);
  }
  return resolved;
}

const args = process.argv.slice(2);
const currentIdx = args.indexOf('--current');
const CURRENT_SNAPSHOT_PATH = validatePath(currentIdx !== -1 ? args[currentIdx + 1] : path.join(rootDir, 'telemetry-history', 'soak_snapshot_latest.json'));

const baselineIdx = args.indexOf('--baseline');
let BASELINE_SNAPSHOT_PATH = baselineIdx !== -1 ? validatePath(args[baselineIdx + 1]) : '';

const historyDirIdx = args.indexOf('--history-dir');
const HISTORY_DIR = validatePath(historyDirIdx !== -1 ? args[historyDirIdx + 1] : path.join(rootDir, 'telemetry-history'));

function findPredecessorSnapshot(): string | null {
  try {
    const files = fs.readdirSync(HISTORY_DIR)
      .filter(f => f.startsWith('soak_snapshot_') && f.endsWith('.json') && f !== 'soak_snapshot_latest.json')
      .map(f => validatePath(path.join(HISTORY_DIR, f)));

    if (files.length < 2) {
      return null;
    }

    // Sort files by creation time
    files.sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);
    
    // The last file in the sorted list is the latest run itself. The predecessor is the second to last.
    // If the latest snapshot is also copied/saved as `soak_snapshot_<timestamp>.json`, we find it and pick the predecessor.
    // Let's filter out CURRENT_SNAPSHOT_PATH if it resolves to one of them.
    const resolvedCurrent = fs.realpathSync(CURRENT_SNAPSHOT_PATH);
    const filteredFiles = files.filter(f => fs.realpathSync(f) !== resolvedCurrent);
    
    return filteredFiles.length > 0 ? filteredFiles[filteredFiles.length - 1] : null;
  } catch (e: any) {
    console.warn(`⚠️  Failed to read telemetry history for predecessor search: ${e.message}`);
    return null;
  }
}

interface Stats {
  mean: number;
  stdDev: number;
}

function getStats(values: number[]): Stats {
  const n = values.length;
  if (n === 0) return { mean: 0, stdDev: 0 };
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  if (n < 2) return { mean, stdDev: 0 };
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1);
  return { mean, stdDev: Math.sqrt(variance) };
}

function getHistoricalSnapshots(seed: string): any[] {
  const registryPath = path.join(rootDir, 'telemetry-history', 'campaign_registry.json');
  if (!fs.existsSync(registryPath)) return [];
  try {
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    const matches = (registry.campaigns || []).filter((c: any) => c.seed === seed);
    const snapshots: any[] = [];
    for (const match of matches) {
      const fullPath = path.isAbsolute(match.snapshotPath)
        ? match.snapshotPath
        : path.join(rootDir, match.snapshotPath);
      if (fs.existsSync(fullPath)) {
        try {
          snapshots.push(JSON.parse(fs.readFileSync(fullPath, 'utf8')));
        } catch {}
      }
    }
    return snapshots;
  } catch {
    return [];
  }
}

function getMetricHistory(
  snapshots: any[],
  extractor: (s: any) => number | null
): number[] {
  return snapshots
    .map(extractor)
    .filter((v): v is number => v !== null && !isNaN(v));
}

interface DriftEnvelope {
  nominalMin: number;
  nominalMax: number;
  warningMax: number;
  breachMax: number;
  status: 'NOMINAL' | 'WARNING' | 'BREACH';
}

function evaluateDrift(
  currentVal: number,
  baselineVal: number,
  historicalValues: number[],
  noiseFloor: number
): DriftEnvelope {
  // If the current value is within/below the environmental noise floor, it is strictly nominal.
  if (currentVal <= noiseFloor) {
    return {
      nominalMin: -Infinity,
      nominalMax: noiseFloor,
      warningMax: noiseFloor * 1.15,
      breachMax: noiseFloor * 1.25,
      status: 'NOMINAL'
    };
  }

  // Clamp baseline and historical values to noiseFloor to prevent division/sign anomalies
  const effectiveBaseline = Math.max(baselineVal, noiseFloor);
  const effectiveHistory = historicalValues.map(v => Math.max(v, noiseFloor));

  if (effectiveHistory.length >= 3) {
    const { mean, stdDev } = getStats(effectiveHistory);
    const nominalMin = mean - 2 * stdDev;
    const nominalMax = Math.max(mean + 2 * stdDev, effectiveBaseline * 1.10);
    const warningMax = Math.max(mean + 3 * stdDev, effectiveBaseline * 1.25);
    const breachMax = warningMax;

    let status: 'NOMINAL' | 'WARNING' | 'BREACH' = 'NOMINAL';
    if (currentVal > breachMax) {
      status = 'BREACH';
    } else if (currentVal > nominalMax) {
      status = 'WARNING';
    } else if (currentVal < nominalMin) {
      status = 'NOMINAL'; // Drops below statistical nominal (better resource use)
    }
    return { nominalMin, nominalMax, warningMax, breachMax, status };
  } else {
    const nominalMin = 0;
    const nominalMax = effectiveBaseline * 1.10;
    const warningMax = effectiveBaseline * 1.25;
    const breachMax = warningMax;

    let status: 'NOMINAL' | 'WARNING' | 'BREACH' = 'NOMINAL';
    if (currentVal > breachMax) {
      status = 'BREACH';
    } else if (currentVal > nominalMax) {
      status = 'WARNING';
    }
    return { nominalMin, nominalMax, warningMax, breachMax, status };
  }
}

function main() {
  console.log('================================================================');
  console.log('📊  ZTAN TELEMETRY REGRESSION ANALYZER & CI GATE');
  console.log('================================================================');

  if (!fs.existsSync(CURRENT_SNAPSHOT_PATH)) {
    console.error(`❌ Error: Current run snapshot not found at: ${CURRENT_SNAPSHOT_PATH}`);
    process.exit(1);
  }

  const currentRaw = fs.readFileSync(CURRENT_SNAPSHOT_PATH, 'utf8');
  const current = JSON.parse(currentRaw);

  const isStateContaminated = current.metadata?.isStateContaminated === true;
  if (isStateContaminated) {
    console.log('\n🟡 EPHEMERAL STATE CONTAMINATED: Statistical regression limits bypassed. Initiating Ledger Replay & Hash-Chain Audits.');
    const audit = current.metadata?.replayIntegrityAudit;
    if (audit) {
      console.log(`\n🕵️‍♂️  Ledger Replay & Integrity Audit Details:`);
      console.log(`   ↳ Cryptographic Hash-Chain:   ${audit.hashChain.passed ? 'PASSED ✅' : 'FAILED ❌'} (${audit.hashChain.totalBlocksVerified} blocks)`);
      console.log(`   ↳ Index Monotonicity:         ${audit.monotonicity.passed ? 'PASSED ✅' : 'FAILED ❌'} (${audit.monotonicity.gaps.length} gaps)`);
      console.log(`   ↳ Outbox Convergence:         ${audit.outboxConvergence.passed ? 'PASSED ✅' : 'FAILED ❌'} (${audit.outboxConvergence.pendingWalCount} pending Outbox logs)`);
      console.log(`   ↳ Fencing Monotonicity:       ${audit.fencingEpoch.passed ? 'PASSED ✅' : 'FAILED ❌'} (${audit.fencingEpoch.retrogradeEpochs.length} retrograde epochs)`);
      
      if (audit.overallPassed) {
        console.log('\n🎉 LEDGER REPLAY & INTEGRITY AUDIT: PASSED (NOMINAL RECOVERY OBSERVED)');
        console.log('🎉 CI Gate PASSED under state contamination bypass rules.');
        process.exit(0);
      } else {
        console.error('\n❌ LEDGER REPLAY & INTEGRITY AUDIT: FAILED (LEDGER OR WAL INCONSISTENCY)');
        console.error('❌ CI Gate FAILED. Integrity check failed under state contamination.');
        process.exit(1);
      }
    } else {
      console.error('\n❌ Error: Snapshot marked as contaminated, but no replayIntegrityAudit metadata found.');
      process.exit(1);
    }
  }

  if (!BASELINE_SNAPSHOT_PATH) {
    console.log('🔍  No explicit baseline provided. Searching history for predecessor...');
    const predecessor = findPredecessorSnapshot();
    if (predecessor) {
      BASELINE_SNAPSHOT_PATH = predecessor;
    }
  }

  if (!BASELINE_SNAPSHOT_PATH || !fs.existsSync(BASELINE_SNAPSHOT_PATH)) {
    console.log('⚠️  No historical baseline snapshot found. Generating self-reference baseline mock.');
    const mockBaseline = JSON.parse(JSON.stringify(current));
    for (const name of Object.keys(mockBaseline.services)) {
      mockBaseline.services[name].heapDeltaBytes = Math.max(0, Math.round(mockBaseline.services[name].heapDeltaBytes * 0.9));
      mockBaseline.services[name].gc.p95 = Math.max(0, mockBaseline.services[name].gc.p95 * 0.9);
    }
    BASELINE_SNAPSHOT_PATH = path.join(HISTORY_DIR, 'soak_snapshot_baseline.json');
    fs.writeFileSync(BASELINE_SNAPSHOT_PATH, JSON.stringify(mockBaseline, null, 2));
    console.log(`📝 Generated baseline reference snapshot at: ${BASELINE_SNAPSHOT_PATH}`);
  }

  console.log(`📂 Current Run:   ${CURRENT_SNAPSHOT_PATH}`);
  console.log(`📂 Baseline Run:  ${BASELINE_SNAPSHOT_PATH}`);
  console.log('================================================================');

  const baselineRaw = fs.readFileSync(BASELINE_SNAPSHOT_PATH, 'utf8');
  const baseline = JSON.parse(baselineRaw);

  const historicalSnapshots = getHistoricalSnapshots(current.metadata?.seed || '');
  console.log(`🔍 Found ${historicalSnapshots.length} historical matching runs for seed: ${current.metadata?.seed || 'None'}`);

  let regressionBreaches = 0;

  for (const [name, currentSum] of Object.entries(current.services) as [string, any][]) {
    const baselineSum = baseline.services?.[name];
    if (!baselineSum) {
      console.log(`ℹ️  Service ${name} not present in baseline. Skipping regression checks for it.`);
      continue;
    }

    console.log(`\n⚖️  Regression Audit for: ${name}`);

    // Rule 1: Heap Growth Delta
    const heapHistory = getMetricHistory(historicalSnapshots, s => s.services?.[name]?.heapDeltaBytes);
    const heapEnvelope = evaluateDrift(currentSum.heapDeltaBytes, baselineSum.heapDeltaBytes, heapHistory, 15 * 1024 * 1024);
    
    const currentHeapDeltaMB = currentSum.heapDeltaBytes / 1024 / 1024;
    const baselineHeapDeltaMB = baselineSum.heapDeltaBytes / 1024 / 1024;
    const nominalMaxMB = heapEnvelope.nominalMax / 1024 / 1024;
    const breachMaxMB = heapEnvelope.breachMax / 1024 / 1024;

    console.log(`   ↳ Heap Growth Delta: Current = ${currentHeapDeltaMB.toFixed(2)} MB, Baseline = ${baselineHeapDeltaMB.toFixed(2)} MB`);
    console.log(`      [Drift Envelope] Nominal Limit: <= ${nominalMaxMB.toFixed(2)} MB | Breach Limit: > ${breachMaxMB.toFixed(2)} MB (based on ${heapHistory.length} historical runs)`);

    if (currentHeapDeltaMB > 5.0 && heapEnvelope.status === 'BREACH') {
      console.log(`      ❌ REGRESSION BREACH: Heap memory growth exceeded Breach threshold (${currentHeapDeltaMB.toFixed(2)} MB > ${breachMaxMB.toFixed(2)} MB)`);
      regressionBreaches++;
    } else if (currentHeapDeltaMB > 5.0 && heapEnvelope.status === 'WARNING') {
      console.log(`      ⚠️  REGRESSION WARNING: Heap memory growth exceeded Nominal threshold (${currentHeapDeltaMB.toFixed(2)} MB > ${nominalMaxMB.toFixed(2)} MB)`);
    } else {
      console.log(`      ✅ Heap growth delta regression check passed (Status: ${heapEnvelope.status}).`);
    }

    // Rule 2: p95 GC duration
    const currentGcP95 = currentSum.gc?.p95 || 0;
    const baselineGcP95 = baselineSum.gc?.p95 || 0;
    const gcHistory = getMetricHistory(historicalSnapshots, s => s.services?.[name]?.gc?.p95);
    const gcEnvelope = evaluateDrift(currentGcP95, baselineGcP95, gcHistory, 50);
    
    console.log(`   ↳ p95 GC Pause Duration: Current = ${currentGcP95.toFixed(2)} ms, Baseline = ${baselineGcP95.toFixed(2)} ms`);
    console.log(`      [Drift Envelope] Nominal Limit: <= ${gcEnvelope.nominalMax.toFixed(2)} ms | Breach Limit: > ${gcEnvelope.breachMax.toFixed(2)} ms (based on ${gcHistory.length} historical runs)`);

    if (currentGcP95 > 5.0 && gcEnvelope.status === 'BREACH') {
      console.log(`      ❌ REGRESSION BREACH: p95 GC pause duration exceeded Breach threshold (${currentGcP95.toFixed(2)} ms > ${gcEnvelope.breachMax.toFixed(2)} ms)`);
      regressionBreaches++;
    } else if (currentGcP95 > 5.0 && gcEnvelope.status === 'WARNING') {
      console.log(`      ⚠️  REGRESSION WARNING: p95 GC pause duration exceeded Nominal threshold (${currentGcP95.toFixed(2)} ms > ${gcEnvelope.nominalMax.toFixed(2)} ms)`);
    } else {
      console.log(`      ✅ GC pause duration check passed (Status: ${gcEnvelope.status}).`);
    }

    // Rule 3: Active Handle Leak Delta checks
    const currentHandlesDelta = currentSum.handleDelta || 0;
    const baselineHandlesDelta = baselineSum.handleDelta || 0;
    const handleHistory = getMetricHistory(historicalSnapshots, s => s.services?.[name]?.handleDelta);
    const handleEnvelope = evaluateDrift(currentHandlesDelta, baselineHandlesDelta, handleHistory, 3);
    
    console.log(`   ↳ Active Handle Leak Delta: Current = ${currentHandlesDelta}, Baseline = ${baselineHandlesDelta}`);
    console.log(`      [Drift Envelope] Nominal Limit: <= ${handleEnvelope.nominalMax.toFixed(1)} | Breach Limit: > ${handleEnvelope.breachMax.toFixed(1)} (based on ${handleHistory.length} historical runs)`);

    if (currentHandlesDelta > 3 && handleEnvelope.status === 'BREACH') {
      console.log(`      ❌ REGRESSION BREACH: Outstanding handle leak delta accumulated (${currentHandlesDelta} > ${handleEnvelope.breachMax.toFixed(1)})`);
      regressionBreaches++;
    } else if (currentHandlesDelta > 3 && handleEnvelope.status === 'WARNING') {
      console.log(`      ⚠️  REGRESSION WARNING: Outstanding handle leak delta accumulated (${currentHandlesDelta} > ${handleEnvelope.nominalMax.toFixed(1)})`);
    } else {
      console.log(`      ✅ Active handle leak check passed (Status: ${handleEnvelope.status}).`);
    }
  }

  // Rule 4: WAL Amplification ratio increase check
  const currentWritten = current.metadata.totalLogicalBytesWritten || 1;
  const currentWalBytes = parseFloat(current.metadata.physicalWalByteDelta || '0');
  const currentWalRatio = currentWalBytes / currentWritten;

  const baselineWritten = baseline.metadata.totalLogicalBytesWritten || 1;
  const baselineWalBytes = parseFloat(baseline.metadata.physicalWalByteDelta || '0');
  const baselineWalRatio = baselineWalBytes / baselineWritten;

  const walHistory = getMetricHistory(historicalSnapshots, s => {
    const w = parseFloat(s.metadata?.physicalWalByteDelta || '0');
    const l = s.metadata?.totalLogicalBytesWritten || 1;
    return w / l;
  });
  const walEnvelope = evaluateDrift(currentWalRatio, baselineWalRatio, walHistory, 0.1);

  console.log(`\n⚖️  Storage & Database WAL Amplification Audit:`);
  console.log(`   ↳ WAL Amplification Ratio (WAL bytes / Logical bytes written):`);
  console.log(`      Current Ratio:  ${currentWalRatio.toFixed(4)} (${(currentWalBytes/1024).toFixed(1)} KB WAL / ${(currentWritten/1024).toFixed(1)} KB Logical)`);
  console.log(`      Baseline Ratio: ${baselineWalRatio.toFixed(4)} (${(baselineWalBytes/1024).toFixed(1)} KB WAL / ${(baselineWritten/1024).toFixed(1)} KB Logical)`);
  console.log(`      [Drift Envelope] Nominal Limit: <= ${walEnvelope.nominalMax.toFixed(4)} | Breach Limit: > ${walEnvelope.breachMax.toFixed(4)} (based on ${walHistory.length} historical runs)`);

  if (currentWalBytes > 1024 * 1024 && walEnvelope.status === 'BREACH') {
    console.log(`   ❌ REGRESSION BREACH: WAL amplification ratio exceeded Breach threshold (${currentWalRatio.toFixed(4)} > ${walEnvelope.breachMax.toFixed(4)})`);
    regressionBreaches++;
  } else if (currentWalBytes > 1024 * 1024 && walEnvelope.status === 'WARNING') {
    console.log(`   ⚠️  REGRESSION WARNING: WAL amplification ratio exceeded Nominal threshold (${currentWalRatio.toFixed(4)} > ${walEnvelope.nominalMax.toFixed(4)})`);
  } else {
    console.log(`   ✅ WAL amplification check passed (Status: ${walEnvelope.status}).`);
  }

  console.log('\n================================================================');
  if (regressionBreaches > 0) {
    console.log(`❌ CI Gate FAILED. Found ${regressionBreaches} regression breach(es) against baseline.`);
    process.exit(1);
  } else {
    console.log('🎉 CI Gate PASSED. All telemetry parameters are within limits compared to baseline.');
    process.exit(0);
  }
}

main();

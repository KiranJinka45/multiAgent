/**
 * ZTAN — Entropy Trend Analyzer & Time-to-Exhaustion Forecaster
 *
 * Implements linear regression fitting, Mann-Kendall monotonic trend testing,
 * and $T_{exhaust}$ forecasts for V8 heap and RSS memory usage.
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
const historyDirIdx = args.indexOf('--history-dir');
const HISTORY_DIR = validatePath(historyDirIdx !== -1 ? args[historyDirIdx + 1] : path.join(rootDir, 'telemetry-history'));
const latestIdx = args.indexOf('--latest');
const LATEST_SNAPSHOT_PATH = validatePath(latestIdx !== -1 ? args[latestIdx + 1] : path.join(HISTORY_DIR, 'soak_snapshot_latest.json'));
const heapLimitIdx = args.indexOf('--heap-limit');
const HEAP_LIMIT_MB = heapLimitIdx !== -1 ? parseInt(args[heapLimitIdx + 1], 10) : 512;

function rollingMedian(arr: number[], windowSize = 11): number[] {
  const result: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(arr.length - 1, i + Math.floor(windowSize / 2));
    const window = arr.slice(start, end + 1);
    window.sort((a, b) => a - b);
    const mid = Math.floor(window.length / 2);
    if (window.length % 2 !== 0) {
      result.push(window[mid]);
    } else {
      result.push((window[mid - 1] + window[mid]) / 2);
    }
  }
  return result;
}

// Mann-Kendall Monotonic Trend Test
interface MKResult {
  S: number;
  VarS: number;
  Z: number;
  trend: 'UPWARD' | 'DOWNWARD' | 'NO_TREND';
  pValue: number;
}

function mannKendallTest(data: number[]): MKResult {
  const n = data.length;
  if (n < 4) {
    return { S: 0, VarS: 0, Z: 0, trend: 'NO_TREND', pValue: 1.0 };
  }

  let S = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const diff = data[j] - data[i];
      if (diff > 0) S += 1;
      else if (diff < 0) S -= 1;
    }
  }

  // Calculate Var(S) with tie adjustments
  const ties = new Map<number, number>();
  for (const val of data) {
    ties.set(val, (ties.get(val) || 0) + 1);
  }

  let tieSum = 0;
  for (const count of ties.values()) {
    if (count > 1) {
      tieSum += count * (count - 1) * (2 * count + 5);
    }
  }

  const VarS = (n * (n - 1) * (2 * n + 5) - tieSum) / 18;

  let Z = 0;
  if (S > 0) {
    Z = (S - 1) / Math.sqrt(VarS);
  } else if (S < 0) {
    Z = (S + 1) / Math.sqrt(VarS);
  }

  // Two-tailed p-value approximation (standard normal distribution)
  // Using erf approximation: p = 1 - erf(|Z| / sqrt(2))
  const absZ = Math.abs(Z);
  const t = 1 / (1 + 0.5 * absZ / Math.SQRT2);
  // Chebyshev fitting for erf
  const tau = t * Math.exp(-Math.pow(absZ / Math.SQRT2, 2) - 1.26551223 +
    t * (1.00002368 +
    t * (0.37409196 +
    t * (0.09678418 +
    t * (-0.18628806 +
    t * (0.27886807 +
    t * (-1.13520398 +
    t * (1.48851587 +
    t * (-0.82215223 +
    t * 0.17087277)))))))));
  const pValue = S === 0 ? 1.0 : tau;

  // We reject H0 (no trend) at alpha = 0.05 (critical value Z = 1.96)
  let trend: 'UPWARD' | 'DOWNWARD' | 'NO_TREND' = 'NO_TREND';
  if (pValue < 0.05) {
    trend = Z > 0 ? 'UPWARD' : 'DOWNWARD';
  }

  return { S, VarS, Z, trend, pValue };
}

// Simple Linear Regression
interface RegressionResult {
  slope: number;       // units per second
  intercept: number;
  r2: number;
}

function linearRegression(x: number[], y: number[]): RegressionResult {
  const n = x.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

  const xMean = x.reduce((a, b) => a + b, 0) / n;
  const yMean = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  let ssTot = 0;
  let ssRes = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = x[i] - xMean;
    const yDiff = y[i] - yMean;
    num += xDiff * yDiff;
    den += xDiff * xDiff;
    ssTot += yDiff * yDiff;
  }

  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;

  for (let i = 0; i < n; i++) {
    const predictedY = intercept + slope * x[i];
    const residual = y[i] - predictedY;
    ssRes += residual * residual;
  }

  const r2 = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);

  return { slope, intercept, r2 };
}

function main() {
  console.log('================================================================');
  console.log('📊  ZTAN RELIABILITY ENTROPY & MONOTONIC TREND ANALYZER');
  console.log(`📂  Target Snapshot: ${LATEST_SNAPSHOT_PATH}`);
  console.log(`💾  Exhaustion Heap Threshold: ${HEAP_LIMIT_MB} MB`);
  console.log('================================================================');

  if (!fs.existsSync(LATEST_SNAPSHOT_PATH)) {
    console.error(`❌ Error: Snapshot file not found at: ${LATEST_SNAPSHOT_PATH}`);
    process.exit(1);
  }

  const snapshotRaw = fs.readFileSync(LATEST_SNAPSHOT_PATH, 'utf8');
  let snapshot: any;
  try {
    snapshot = JSON.parse(snapshotRaw);
  } catch (e: any) {
    console.error(`❌ Error: Failed to parse snapshot JSON: ${e.message}`);
    process.exit(1);
  }

  const servicesHistory = snapshot.history;
  if (!servicesHistory) {
    console.error('❌ Error: Snapshot does not contain "history" time-series data.');
    process.exit(1);
  }

  // Minimum duration check for statistical validity (30 minutes / 1800s)
  let duration = snapshot.metadata?.durationSeconds;
  if (duration === undefined) {
    let maxDur = 0;
    for (const entries of Object.values(servicesHistory) as any[][]) {
      if (entries.length >= 2) {
        const d = (entries[entries.length - 1].timestamp - entries[0].timestamp) / 1000;
        if (d > maxDur) maxDur = d;
      }
    }
    duration = maxDur;
  }

  if (duration < 1800) {
    console.log(`⚠️  Bypassing trend and exhaustion analysis: Campaign duration (${duration.toFixed(1)}s) is less than the 30-minute (1800s) minimum requirement for statistical validity.`);
    process.exit(0);
  }

  let failuresCount = 0;

  for (const [name, entries] of Object.entries(servicesHistory) as [string, any[]][]) {
    if (entries.length < 5) {
      console.log(`⚠️  ${name}: Too few data points (${entries.length}) for statistical trend testing.`);
      continue;
    }

    console.log(`\n📈 Statistical Analysis for: ${name}`);

    // Extract time series with warmup subtraction
    const startTimestamp = entries[0].timestamp;
    const totalDuration = (entries[entries.length - 1].timestamp - startTimestamp) / 1000;
    const warmupLimit = totalDuration <= 20 ? 5 : 10;
    const steadyEntries = entries.filter(e => (e.timestamp - startTimestamp) / 1000 > warmupLimit);

    if (steadyEntries.length < 5) {
      console.log(`⚠️  ${name}: Too few steady-state data points (${steadyEntries.length}) after warmup subtraction.`);
      continue;
    }

    const times = steadyEntries.map(e => (e.timestamp - startTimestamp) / 1000); // relative seconds
    const rssRaw = steadyEntries.map(e => e.memory.rss / 1024 / 1024); // MB
    const oldSpaceRaw = steadyEntries.map(e => (e.memory.oldSpaceUsed || e.memory.heapUsed) / 1024 / 1024); // MB
    const handlesRaw = steadyEntries.map(e => e.handles?.length || 0);

    // Apply rolling median smoothing to filter out GC drops and database/transaction stress spikes
    const rssSeries = rollingMedian(rssRaw, 11);
    const oldSpaceSeries = rollingMedian(oldSpaceRaw, 11);
    const handlesSeries = rollingMedian(handlesRaw, 11);

    // 1. Mann-Kendall Monotonic Trend Tests
    const rssMK = mannKendallTest(rssSeries);
    const oldSpaceMK = mannKendallTest(oldSpaceSeries);
    const handlesMK = mannKendallTest(handlesSeries);

    console.log(`   Mann-Kendall Trend Test (Smoothed Steady-State):`);
    console.log(`      ↳ Memory RSS Trend:       ${rssMK.trend} (Z-stat: ${rssMK.Z.toFixed(2)}, p-value: ${rssMK.pValue.toFixed(4)})`);
    console.log(`      ↳ Heap Old-Space Trend:   ${oldSpaceMK.trend} (Z-stat: ${oldSpaceMK.Z.toFixed(2)}, p-value: ${oldSpaceMK.pValue.toFixed(4)})`);
    console.log(`      ↳ Handle Leaks Trend:     ${handlesMK.trend} (Z-stat: ${handlesMK.Z.toFixed(2)}, p-value: ${handlesMK.pValue.toFixed(4)})`);

    // 2. Linear Regression & Forecasting on Smoothed Steady-State
    const rssReg = linearRegression(times, rssSeries);
    const oldSpaceReg = linearRegression(times, oldSpaceSeries);

    console.log(`   Linear Regression Rates (Smoothed Steady-State):`);
    console.log(`      ↳ Memory RSS Growth Rate:   ${(rssReg.slope * 60).toFixed(4)} MB/min (R² = ${rssReg.r2.toFixed(3)})`);
    console.log(`      ↳ Heap Growth Rate:         ${(oldSpaceReg.slope * 60).toFixed(4)} MB/min (R² = ${oldSpaceReg.r2.toFixed(3)})`);

    // 3. Time-to-Exhaustion Forecasting
    if (oldSpaceReg.slope > 0) {
      const currentHeap = oldSpaceSeries[oldSpaceSeries.length - 1];
      const remainingMB = HEAP_LIMIT_MB - currentHeap;
      if (remainingMB > 0) {
        const timeToExhaustSeconds = remainingMB / oldSpaceReg.slope;
        const timeToExhaustHours = timeToExhaustSeconds / 3600;
        console.log(`   ⏰ Heap Exhaustion Forecast:`);
        console.log(`      ↳ Remaining Buffer:   ${remainingMB.toFixed(1)} MB / ${HEAP_LIMIT_MB} MB limit`);
        console.log(`      ↳ Time to Exhaustion: ${timeToExhaustHours.toFixed(2)} hours (${(timeToExhaustSeconds / 60).toFixed(1)} minutes)`);
        
        // Critical leak detection: exhaustion in less than 24 hours under active load
        if (timeToExhaustHours < 24) {
          console.log(`      ❌ CRITICAL: Slow memory leak detected! Time-to-Exhaustion (${timeToExhaustHours.toFixed(2)}h) is less than 24-hour long-horizon survivability limit.`);
          failuresCount++;
        }
      } else {
        console.log(`   ❌ CRITICAL: Memory usage (${currentHeap.toFixed(1)} MB) already exceeds specified limit (${HEAP_LIMIT_MB} MB).`);
        failuresCount++;
      }
    } else {
      console.log(`   ✅ Heap Exhaustion Forecast: Stable. Negative or flat slope observed (slope: ${(oldSpaceReg.slope * 60).toFixed(4)} MB/min).`);
    }

    // Handle accumulation assertion
    if (handlesMK.trend === 'UPWARD') {
      const startHandles = handlesSeries[0];
      const endHandles = handlesSeries[handlesSeries.length - 1];
      const handleDelta = endHandles - startHandles;
      if (handleDelta > 3) {
        console.log(`   ❌ CRITICAL: Significant upward handle accumulation leak detected! (Start: ${startHandles}, End: ${endHandles}, Delta: +${handleDelta})`);
        failuresCount++;
      } else {
        console.log(`   ⚠️  Minor handle accumulation observed (Delta: +${handleDelta}).`);
      }
    }
  }

  // Cross-run metadata trends if directory has more files
  try {
    const files = fs.readdirSync(HISTORY_DIR)
      .filter(f => f.startsWith('soak_snapshot_') && f.endsWith('.json') && f !== 'soak_snapshot_latest.json')
      .map(f => validatePath(path.join(HISTORY_DIR, f)));

    if (files.length >= 3) {
      console.log('\n📊 Cross-Campaign Longitudinal Trends (across last 10 runs):');
      // Sort files by creation time
      files.sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);
      const targetFiles = files.slice(-10);

      const runTimestamps: number[] = [];
      const p95Latencies: number[] = [];
      const finalWalDeltas: number[] = [];

      for (const file of targetFiles) {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        runTimestamps.push(data.metadata.timestamp);
        p95Latencies.push(data.latencies.p95);
        finalWalDeltas.push(parseFloat(data.metadata.physicalWalByteDelta || '0') / 1024 / 1024); // MB
      }

      const p95MK = mannKendallTest(p95Latencies);
      const walMK = mannKendallTest(finalWalDeltas);

      console.log(`   Cross-Run Performance Stability:`);
      console.log(`      ↳ p95 Transaction Latency:        ${p95MK.trend} (Z-stat: ${p95MK.Z.toFixed(2)}, p-value: ${p95MK.pValue.toFixed(4)})`);
      console.log(`      ↳ Physical WAL Amplification MB:  ${walMK.trend} (Z-stat: ${walMK.Z.toFixed(2)}, p-value: ${walMK.pValue.toFixed(4)})`);

      if (p95MK.trend === 'UPWARD') {
        console.log('      ⚠️  ALERT: Longitudinal latency regression observed across runs!');
      }
      if (walMK.trend === 'UPWARD') {
        console.log('      ⚠️  ALERT: Dynamic storage consumption/WAL amplification is growing across runs!');
      }
    }
  } catch (e: any) {
    console.log(`   ⚠️  Bypassed cross-campaign trend checks: ${e.message}`);
  }

  console.log('\n================================================================');
  if (failuresCount > 0) {
    console.log(`❌ Trend verification FAILED. Found ${failuresCount} leak/regression issues.`);
    process.exit(1);
  } else {
    console.log('🎉 Trend verification PASSED. Monotonic memory growth and handle leaks within safe bounds.');
    process.exit(0);
  }
}

main();

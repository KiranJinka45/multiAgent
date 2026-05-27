/**
 * ZTAN — Reliability Evidence Dashboard
 * 
 * Local Express-based web server serving a premium, dark-mode, glassmorphism dashboard
 * for longitudinal telemetry visualization, campaign comparisons, and regression scorecards.
 * 
 * Hardened with express-rate-limit and strict input sanitization.
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const HISTORY_DIR = path.join(rootDir, 'telemetry-history');
const BASELINES_DIR = path.join(HISTORY_DIR, 'baselines');
const CAMPAIGN_REGISTRY = path.join(HISTORY_DIR, 'campaign_registry.json');
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4030;

const app = express();
app.disable('x-powered-by');

// Apply rate limiting to all endpoints to prevent resource exhaustion attacks
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 60, // Limit each IP to 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use(apiLimiter);

function validatePath(p: string): string {
  const resolved = path.resolve(p);
  const resolvedRoot = path.resolve(rootDir);
  if (!resolved.startsWith(resolvedRoot)) {
    throw new Error(`Security violation: path access outside root directory disallowed: ${resolved}`);
  }
  return resolved;
}

function sanitizeFilename(fn: string): string {
  // Only allow letters, numbers, dots, hyphens, and underscores
  if (!/^[a-zA-Z0-9._-]+$/.test(fn)) {
    throw new Error(`Security violation: Invalid filename format: ${fn}`);
  }
  return fn;
}

function sanitizeRelPath(p: string): string {
  // Allow letters, numbers, dots, hyphens, underscores, and forward/backward slashes for relative path resolution
  if (!/^[a-zA-Z0-9._\-\/]+$/.test(p)) {
    throw new Error(`Security violation: Invalid path format: ${p}`);
  }
  return p;
}

// ----------------------------------------------------
// SCORECARD CALCULATION HELPER (Synchronized with reliability-diff-engine.ts)
// Includes drift envelope logic for three-tier gating (NOMINAL/WARNING/BREACH)
// ----------------------------------------------------
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

function linearRegression(x: number[], y: number[]): { slope: number; intercept: number } {
  const n = x.length;
  if (n < 2) return { slope: 0, intercept: 0 };
  const xMean = x.reduce((a, b) => a + b, 0) / n;
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const xDiff = x[i] - xMean;
    const yDiff = y[i] - yMean;
    num += xDiff * yDiff;
    den += xDiff * xDiff;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  return { slope, intercept };
}

interface DashboardStats {
  mean: number;
  stdDev: number;
}

function getDashboardStats(values: number[]): DashboardStats {
  const n = values.length;
  if (n === 0) return { mean: 0, stdDev: 0 };
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  if (n < 2) return { mean, stdDev: 0 };
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1);
  return { mean, stdDev: Math.sqrt(variance) };
}

function getDashboardHistoricalSnapshots(seed: string): any[] {
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

function getDashboardMetricHistory(
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

function evaluateDashboardDrift(
  currentVal: number,
  baselineVal: number,
  historicalValues: number[],
  noiseFloor: number
): DriftEnvelope {
  if (currentVal <= noiseFloor) {
    return {
      nominalMin: -Infinity,
      nominalMax: noiseFloor,
      warningMax: noiseFloor * 1.15,
      breachMax: noiseFloor * 1.25,
      status: 'NOMINAL'
    };
  }
  const effectiveBaseline = Math.max(baselineVal, noiseFloor);
  const effectiveHistory = historicalValues.map(v => Math.max(v, noiseFloor));

  if (effectiveHistory.length >= 3) {
    const { mean, stdDev } = getDashboardStats(effectiveHistory);
    const nominalMin = mean - 2 * stdDev;
    const nominalMax = Math.max(mean + 2 * stdDev, effectiveBaseline * 1.10);
    const warningMax = Math.max(mean + 3 * stdDev, effectiveBaseline * 1.25);
    const breachMax = warningMax;

    let status: 'NOMINAL' | 'WARNING' | 'BREACH' = 'NOMINAL';
    if (currentVal > breachMax) {
      status = 'BREACH';
    } else if (currentVal > nominalMax) {
      status = 'WARNING';
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

interface ScorecardResult {
  trendStabilityScore: number;
  regressionRiskScore: number;
  entropyAccumulationScore: number;
  survivabilityScore: number;
  overallScore: number;
  confidenceInterval: number;
  trendStabilityStatus: string;
  regressionRiskStatus: string;
  entropyAccumulationStatus: string;
  survivabilityStatus: string;
  overallGrade: string;
  heuristicVariabilityBand: number;
  isStateContaminated?: boolean;
  replayIntegrityAudit?: any;
  details: {
    memoryGrowthDiffMB: number;
    latencyDiffPct: number;
    failureCount: number;
    walAmpDiffMB: number;
    minExhaustionHours: number;
    serviceDetails: Record<string, any>;
    walDriftStatus?: string;
    walDriftEnvelope?: { nominalMax: number; breachMax: number };
    walAmpDiffRatio?: number;
    walBaselineRatio?: number;
    exploratoryExhaustionProjection?: {
      projectedHours: number;
      windowLengthHours: number;
      trendStability: string;
      confidenceCategory: string;
    };
  };
}

function calculateScorecard(current: any, baseline: any, isSegment = false): ScorecardResult {
  const duration = current.metadata?.durationSeconds || 15;
  const failures = current.metadata?.failures || 0;
  const seed = current.metadata?.seed || '';

  const isContaminated = current.metadata?.isStateContaminated === true;
  const audit = current.metadata?.replayIntegrityAudit;

  let failureClass: 'INVARIANT_VIOLATION' | 'EXPECTED_CHAOS_FAILURE' | 'TRANSIENT_RECOVERY_FAILURE' | 'NONE' = 'NONE';
  if (audit && (
    audit.overallPassed === false ||
    audit.hashChain?.passed === false ||
    audit.fencingEpoch?.passed === false ||
    audit.outboxConvergence?.passed === false
  )) {
    failureClass = 'INVARIANT_VIOLATION';
  } else if (isContaminated) {
    failureClass = 'EXPECTED_CHAOS_FAILURE';
  } else if (failures > 0) {
    failureClass = 'TRANSIENT_RECOVERY_FAILURE';
  }

  const historicalSnapshots = !isSegment && seed ? getDashboardHistoricalSnapshots(seed) : [];

  // 1. Trend Stability Score (starts at 100)
  let trendPenalties = 0;
  let totalMemoryGrowthDiffMB = 0;

  const services = Object.keys(current.services || {});
  const serviceDetails: Record<string, any> = {};

  services.forEach(name => {
    const curS = current.services[name];
    const basS = baseline.services?.[name] || {};

    const curHeapBytes = curS.heapDeltaBytes || 0;
    const basHeapBytes = basS.heapDeltaBytes || 0;
    const heapHistory = getDashboardMetricHistory(historicalSnapshots, s => s.services?.[name]?.heapDeltaBytes);
    const heapEnvelope = evaluateDashboardDrift(curHeapBytes, basHeapBytes, heapHistory, 15 * 1024 * 1024);

    const curHeapMB = curHeapBytes / 1024 / 1024;
    const basHeapMB = basHeapBytes / 1024 / 1024;
    const heapDiffMB = curHeapMB - basHeapMB;

    if (curHeapMB > 5.0) {
      if (heapEnvelope.status === 'BREACH') {
        trendPenalties += Math.max(0, heapDiffMB) * 6;
      } else if (heapEnvelope.status === 'WARNING') {
        trendPenalties += Math.max(0, heapDiffMB) * 3;
      }
    }
    if (heapDiffMB > 0) {
      totalMemoryGrowthDiffMB += heapDiffMB;
    }

    const curHandleDelta = curS.handleDelta || 0;
    const basHandleDelta = basS.handleDelta || 0;
    const handleHistory = getDashboardMetricHistory(historicalSnapshots, s => s.services?.[name]?.handleDelta);
    const handleEnvelope = evaluateDashboardDrift(curHandleDelta, basHandleDelta, handleHistory, 3);
    const handleDiff = curHandleDelta - basHandleDelta;

    if (curHandleDelta > 3) {
      if (handleEnvelope.status === 'BREACH') {
        trendPenalties += Math.max(0, handleDiff) * 10;
      } else if (handleEnvelope.status === 'WARNING') {
        trendPenalties += Math.max(0, handleDiff) * 5;
      }
    }

    serviceDetails[name] = {
      curHeapMB,
      basHeapMB,
      heapDiffMB,
      curHandleDelta,
      basHandleDelta,
      handleDiff,
      curAvgElu: curS.avgElu || 0,
      basAvgElu: basS.avgElu || 0,
      curOsHandleDelta: curS.osHandleDelta || 0,
      curOsThreadDelta: curS.osThreadDelta || 0,
      curSockets: curS.finalSockets || { established: 0, timeWait: 0, closeWait: 0, other: 0 },
      heapDriftStatus: heapEnvelope.status,
      heapDriftEnvelope: {
        nominalMax: heapEnvelope.nominalMax / 1024 / 1024,
        breachMax: heapEnvelope.breachMax / 1024 / 1024
      },
      handleDriftStatus: handleEnvelope.status,
      handleDriftEnvelope: {
        nominalMax: handleEnvelope.nominalMax,
        breachMax: handleEnvelope.breachMax
      }
    };
  });

  const trendStabilityScore = Math.max(0, Math.min(100, Math.round(100 - trendPenalties)));

  // 2. Regression Risk Score (starts at 100)
  let regressionPenalties = 0;
  if (failures > 0) {
    regressionPenalties += 40;
  }

  // Compare GC p95
  let gcPenalties = 0;
  services.forEach(name => {
    const curS = current.services[name];
    const basS = baseline.services?.[name] || {};
    const curGcP95 = curS.gc?.p95 || 0;
    const basGcP95 = basS.gc?.p95 || 0;
    const gcHistory = getDashboardMetricHistory(historicalSnapshots, s => s.services?.[name]?.gc?.p95);
    const gcEnvelope = evaluateDashboardDrift(curGcP95, basGcP95, gcHistory, 50);

    if (curGcP95 > 5.0) {
      if (gcEnvelope.status === 'BREACH') {
        gcPenalties += 15;
      } else if (gcEnvelope.status === 'WARNING') {
        gcPenalties += 8;
      }
    }

    serviceDetails[name].curGcP95 = curGcP95;
    serviceDetails[name].basGcP95 = basGcP95;
    serviceDetails[name].gcDriftStatus = gcEnvelope.status;
    serviceDetails[name].gcDriftEnvelope = {
      nominalMax: gcEnvelope.nominalMax,
      breachMax: gcEnvelope.breachMax
    };
  });
  regressionPenalties += gcPenalties;

  // Compare latencies
  const curP95 = current.latencies?.p95 || 0;
  const basP95 = baseline.latencies?.p95 || 0;
  let latencyDiffPct = 0;
  if (basP95 > 0) {
    latencyDiffPct = ((curP95 - basP95) / basP95) * 100;
    if (latencyDiffPct > 10) {
      regressionPenalties += Math.max(0, (latencyDiffPct - 10) / 2);
    }
  }

  // Compare WAL ratio
  const curWritten = current.metadata?.totalLogicalBytesWritten || 1;
  const curWalBytes = parseFloat(current.metadata?.physicalWalByteDelta || '0');
  const curWalRatio = curWalBytes / curWritten;

  const basWritten = baseline.metadata?.totalLogicalBytesWritten || 1;
  const basWalBytes = parseFloat(baseline.metadata?.physicalWalByteDelta || '0');
  const basWalRatio = basWalBytes / basWritten;

  const walHistory = getDashboardMetricHistory(historicalSnapshots, s => {
    const w = parseFloat(s.metadata?.physicalWalByteDelta || '0');
    const l = s.metadata?.totalLogicalBytesWritten || 1;
    return w / l;
  });
  const walEnvelope = evaluateDashboardDrift(curWalRatio, basWalRatio, walHistory, 0.1);

  if (curWalBytes > 1024 * 1024) {
    if (walEnvelope.status === 'BREACH') {
      regressionPenalties += 20;
    } else if (walEnvelope.status === 'WARNING') {
      regressionPenalties += 10;
    }
  }

  const regressionRiskScore = Math.max(0, Math.min(100, Math.round(100 - regressionPenalties)));

  // 3. Entropy Accumulation Score (starts at 100)
  let entropyPenalties = 0;
  services.forEach(name => {
    const curS = current.services[name];
    const curOldMB = (curS.oldSpaceDeltaBytes || curS.heapDeltaBytes || 0) / 1024 / 1024;
    
    if (curOldMB > 20) {
      entropyPenalties += Math.min(25, (curOldMB - 20) * 0.5);
    }

    const curHandleDelta = curS.handleDelta || 0;
    if (curHandleDelta > 0) {
      entropyPenalties += curHandleDelta * 10;
    }

    const peakElu = curS.peakElu || 0;
    if (peakElu > 90) {
      entropyPenalties += 20;
    } else if (peakElu > 80) {
      entropyPenalties += 10;
    }
  });

  const entropyAccumulationScore = Math.max(0, Math.min(100, Math.round(100 - entropyPenalties)));

  // 4. Survivability Score (starts at 100)
  let minExhaustionHours = duration >= 1800 ? 72 : -1;
  let survivabilityScore = 100;

  if (duration >= 1800) {
    services.forEach(name => {
      const curS = current.services[name];
      const entries = current.history?.[name] || [];
      if (entries.length >= 5) {
        const startTimestamp = entries[0].timestamp;
        const steadyEntries = entries.filter(e => (e.timestamp - startTimestamp) / 1000 > 10);
        if (steadyEntries.length >= 5) {
          const times = steadyEntries.map(e => (e.timestamp - startTimestamp) / 1000);
          const heapRaw = steadyEntries.map(e => (e.memory?.oldSpaceUsed || e.memory?.heapUsed || 0) / 1024 / 1024);
          const smoothedHeap = rollingMedian(heapRaw, 11);
          const reg = linearRegression(times, smoothedHeap);
          const slopeMBPerSec = reg.slope;

          if (slopeMBPerSec > 0) {
            const currentHeap = smoothedHeap[smoothedHeap.length - 1];
            const remainingMB = Math.max(0, 512 - currentHeap);
            const exhaustSecs = remainingMB / slopeMBPerSec;
            const exhaustHrs = exhaustSecs / 3600;
            if (exhaustHrs < minExhaustionHours) {
              minExhaustionHours = exhaustHrs;
            }
          }
        }
      } else {
        const heapDeltaMB = (curS.heapDeltaBytes || 0) / 1024 / 1024;
        const slopeMBPerSec = heapDeltaMB / duration;

        if (slopeMBPerSec > 0) {
          const remainingMB = Math.max(0, 512 - 60 - heapDeltaMB);
          const exhaustSecs = remainingMB / slopeMBPerSec;
          const exhaustHrs = exhaustSecs / 3600;
          if (exhaustHrs < minExhaustionHours) {
            minExhaustionHours = exhaustHrs;
          }
        }
      }
    });

    if (minExhaustionHours < 72) {
      if (minExhaustionHours >= 24) {
        survivabilityScore = 80 + 20 * (minExhaustionHours - 24) / 48;
      } else if (minExhaustionHours >= 6) {
        survivabilityScore = 40 + 40 * (minExhaustionHours - 6) / 18;
      } else {
        survivabilityScore = 40 * (minExhaustionHours / 6);
      }
    }
  }

  if (failures > 0) {
    survivabilityScore = Math.max(0, survivabilityScore - 30);
  }

  survivabilityScore = Math.max(0, Math.min(100, Math.round(survivabilityScore)));

  const overallScore = Math.round((trendStabilityScore + regressionRiskScore + entropyAccumulationScore + survivabilityScore) / 4);

  let confidenceInterval = 0;
  if (!isSegment && duration >= 1800) {
    const segmentScores: number[] = [];
    let canSegment = true;
    const history = current.history || {};
    const serviceNames = Object.keys(current.services || {});

    if (serviceNames.length === 0) {
      canSegment = false;
    }

    const segmentServicesArray: any[] = [];
    for (let k = 0; k < 5; k++) {
      segmentServicesArray.push({});
    }

    for (const name of serviceNames) {
      const serviceHistory = history[name] || [];
      const N = serviceHistory.length;
      if (N < 5) {
        canSegment = false;
        break;
      }
      for (let k = 0; k < 5; k++) {
        const startIdx = Math.floor((k * N) / 5);
        const endIdx = Math.min(N - 1, Math.floor(((k + 1) * N) / 5) - 1);
        const segmentEntries = serviceHistory.slice(startIdx, endIdx + 1);
        if (segmentEntries.length < 2) {
          canSegment = false;
          break;
        }
        const initial = segmentEntries[0];
        const final = segmentEntries[segmentEntries.length - 1];

        segmentServicesArray[k][name] = {
          heapDeltaBytes: (final.memory?.heapUsed || 0) - (initial.memory?.heapUsed || 0),
          rssDeltaBytes: (final.memory?.rss || 0) - (initial.memory?.rss || 0),
          oldSpaceDeltaBytes: ((final.memory?.oldSpaceUsed || 0) - (initial.memory?.oldSpaceUsed || 0)),
          handleDelta: ((final.handles?.length || 0) - (initial.handles?.length || 0)),
          avgElu: segmentEntries.reduce((sum: number, e: any) => sum + (e.elu || 0), 0) / segmentEntries.length,
          peakElu: Math.max(...segmentEntries.map((e: any) => e.elu || 0)),
          osHandleDelta: ((final.osMetrics?.handleCount || 0) - (initial.osMetrics?.handleCount || 0)),
          osThreadDelta: ((final.osMetrics?.threadCount || 0) - (initial.osMetrics?.threadCount || 0)),
          finalSockets: final.osMetrics?.sockets || { established: 0, timeWait: 0, closeWait: 0, other: 0 },
          gc: {
            majorCount: ((final.gc?.majorCount || 0) - (initial.gc?.majorCount || 0)),
            minorCount: ((final.gc?.minorCount || 0) - (initial.gc?.minorCount || 0)),
          }
        };
      }
      if (!canSegment) break;
    }

    if (canSegment) {
      const scaledBaseline: any = {
        metadata: {
          durationSeconds: (baseline.metadata?.durationSeconds || 15) / 5,
          failures: (baseline.metadata?.failures || 0) / 5,
          physicalWalByteDelta: (baseline.metadata?.physicalWalByteDelta ? (parseFloat(baseline.metadata.physicalWalByteDelta) / 5).toString() : '0')
        },
        latencies: {
          p95: baseline.latencies?.p95 || 0
        },
        services: {}
      };
      for (const name of Object.keys(baseline.services || {})) {
        const basS = baseline.services[name];
        scaledBaseline.services[name] = {
          heapDeltaBytes: (basS.heapDeltaBytes || 0) / 5,
          handleDelta: (basS.handleDelta || 0) / 5,
          avgElu: basS.avgElu || 0,
          oldSpaceDeltaBytes: (basS.oldSpaceDeltaBytes || basS.heapDeltaBytes || 0) / 5,
          peakElu: basS.peakElu || 0
        };
      }

      for (let k = 0; k < 5; k++) {
        const segmentCurrent = {
          metadata: {
            durationSeconds: (current.metadata?.durationSeconds || 15) / 5,
            failures: (current.metadata?.failures || 0) / 5,
            physicalWalByteDelta: (current.metadata?.physicalWalByteDelta ? (parseFloat(current.metadata.physicalWalByteDelta) / 5).toString() : '0')
          },
          latencies: {
            p95: current.latencies?.p95 || 0
          },
          services: segmentServicesArray[k]
        };
        const segScorecard = calculateScorecard(segmentCurrent, scaledBaseline, true);
        segmentScores.push(segScorecard.overallScore);
      }

      const mean = segmentScores.reduce((sum, s) => sum + s, 0) / 5;
      const variance = segmentScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / 4;
      const stdDev = Math.sqrt(variance);
      const standardError = stdDev / Math.sqrt(5);
      confidenceInterval = parseFloat((2.776 * standardError).toFixed(2));
    }
  }
  const windowLengthHours = duration / 3600;
  const exhaustionTrendStability = minExhaustionHours === -1 ? 'N/A' : (minExhaustionHours >= 72 ? 'NOMINAL' : minExhaustionHours >= 24 ? 'WARNING' : 'BREACH');
  const exhaustionConfidenceCategory = minExhaustionHours === -1 ? 'N/A' : (trendStabilityScore >= 90 && regressionRiskScore >= 90 ? 'HIGH' : (trendStabilityScore < 75 || regressionRiskScore < 75 ? 'LOW' : 'MEDIUM'));

  const trendStabilityStatus = trendStabilityScore >= 90 ? 'NOMINAL' : trendStabilityScore >= 75 ? 'RESOURCE_PRESSURE_WARNING' : 'RESEARCH_ENVELOPE_BREACH';

  let regressionRiskStatus = 'NOMINAL';
  if (failureClass === 'INVARIANT_VIOLATION') {
    regressionRiskStatus = 'OPERATIONAL_SAFETY_BREACH';
  } else if (failureClass === 'EXPECTED_CHAOS_FAILURE') {
    regressionRiskStatus = 'INJECTED_FAULT_DETECTED';
  } else if (failureClass === 'TRANSIENT_RECOVERY_FAILURE') {
    regressionRiskStatus = 'TRANSIENT_RECOVERY_WARNING';
  } else {
    regressionRiskStatus = regressionRiskScore >= 90 ? 'NOMINAL' : regressionRiskScore >= 75 ? 'RESOURCE_PRESSURE_WARNING' : 'RESEARCH_ENVELOPE_BREACH';
  }

  const entropyAccumulationStatus = entropyAccumulationScore >= 90 ? 'NOMINAL' : entropyAccumulationScore >= 75 ? 'RESOURCE_PRESSURE_WARNING' : 'RESEARCH_ENVELOPE_BREACH';

  let survivabilityStatus = minExhaustionHours === -1 ? 'N/A (Short Run < 30m)' : 'NOMINAL';
  if (minExhaustionHours !== -1) {
    if (failureClass === 'INVARIANT_VIOLATION') {
      survivabilityStatus = 'OPERATIONAL_SAFETY_BREACH';
    } else if (failureClass === 'EXPECTED_CHAOS_FAILURE') {
      survivabilityStatus = 'INJECTED_FAULT_DETECTED';
    } else if (failureClass === 'TRANSIENT_RECOVERY_FAILURE') {
      survivabilityStatus = 'TRANSIENT_RECOVERY_WARNING';
    } else {
      survivabilityStatus = survivabilityScore >= 90 ? 'NOMINAL' : survivabilityScore >= 75 ? 'RESOURCE_PRESSURE_WARNING' : 'RESEARCH_ENVELOPE_BREACH';
    }
  }

  const overallGrade = overallScore >= 90 ? 'Within Nominal Historical Envelope' : overallScore >= 75 ? 'Minor Historical Deviation' : overallScore >= 50 ? 'Moderate Historical Deviation' : 'Significant Historical Breach';

  return {
    trendStabilityScore,
    regressionRiskScore,
    entropyAccumulationScore,
    survivabilityScore,
    overallScore,
    confidenceInterval,
    trendStabilityStatus,
    regressionRiskStatus,
    entropyAccumulationStatus,
    survivabilityStatus,
    overallGrade,
    heuristicVariabilityBand: confidenceInterval,
    isStateContaminated: current.metadata?.isStateContaminated === true,
    replayIntegrityAudit: current.metadata?.replayIntegrityAudit || null,
    details: {
      memoryGrowthDiffMB: totalMemoryGrowthDiffMB,
      latencyDiffPct,
      failureCount: failures,
      walAmpDiffMB: curWalBytes / 1024 / 1024 - basWalBytes / 1024 / 1024,
      minExhaustionHours,
      serviceDetails,
      walDriftStatus: walEnvelope.status,
      walDriftEnvelope: {
        nominalMax: walEnvelope.nominalMax,
        breachMax: walEnvelope.breachMax
      },
      walAmpDiffRatio: curWalRatio,
      walBaselineRatio: basWalRatio,
      exploratoryExhaustionProjection: {
        projectedHours: minExhaustionHours,
        windowLengthHours,
        trendStability: exhaustionTrendStability,
        confidenceCategory: exhaustionConfidenceCategory
      }
    }
  };
}

function resolveDefaultBaseline(current: any): any {
  let baseline = current;
  const regPath = path.join(BASELINES_DIR, 'registry.json');
  if (fs.existsSync(regPath)) {
    try {
      const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
      if (reg.versions && reg.versions.length > 0) {
        // First try to find GOLDEN_CANONICAL type baselines
        const goldenBaselines = reg.versions.filter((v: any) => !v.type || v.type === 'GOLDEN_CANONICAL');
        if (goldenBaselines.length > 0) {
          goldenBaselines.sort((a: any, b: any) => b.timestamp - a.timestamp);
          for (const item of goldenBaselines) {
            const baselinePath = validatePath(path.join(rootDir, item.path));
            if (fs.existsSync(baselinePath)) {
              return JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
            }
          }
        }
        // Fall back to any latest versioned baseline
        const allBaselines = [...reg.versions];
        allBaselines.sort((a: any, b: any) => b.timestamp - a.timestamp);
        for (const item of allBaselines) {
          const baselinePath = validatePath(path.join(rootDir, item.path));
          if (fs.existsSync(baselinePath)) {
            return JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Failed to resolve default baseline:', e);
    }
  }
  return baseline;
}

// ----------------------------------------------------
// API ENDPOINTS
// ----------------------------------------------------

app.get('/api/campaigns', (req, res) => {
  if (!fs.existsSync(CAMPAIGN_REGISTRY)) {
    return res.json({ campaigns: [] });
  }
  try {
    const data = JSON.parse(fs.readFileSync(CAMPAIGN_REGISTRY, 'utf8'));
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/baselines', (req, res) => {
  const regPath = path.join(BASELINES_DIR, 'registry.json');
  if (!fs.existsSync(regPath)) {
    return res.json({ versions: [] });
  }
  try {
    const data = JSON.parse(fs.readFileSync(regPath, 'utf8'));
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/snapshots', (req, res) => {
  try {
    if (!fs.existsSync(HISTORY_DIR)) {
      return res.json({ files: [] });
    }
    const files = fs.readdirSync(HISTORY_DIR)
      .filter(f => f.startsWith('soak_snapshot_') && f.endsWith('.json') && f !== 'soak_snapshot_latest.json')
      .map(f => {
        const fullPath = path.join(HISTORY_DIR, f);
        const stat = fs.statSync(fullPath);
        return {
          filename: f,
          sizeBytes: stat.size,
          mtime: stat.mtimeMs
        };
      });
    files.sort((a, b) => b.mtime - a.mtime);
    res.json({ files });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/snapshot/:filename', (req, res) => {
  try {
    const filename = sanitizeFilename(req.params.filename);
    let fullPath = '';
    if (filename.startsWith('baseline-')) {
      fullPath = validatePath(path.join(BASELINES_DIR, filename));
    } else {
      fullPath = validatePath(path.join(HISTORY_DIR, filename));
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/scorecard/:filename', (req, res) => {
  try {
    const filename = sanitizeFilename(req.params.filename);
    const fullPath = validatePath(path.join(HISTORY_DIR, filename));

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }
    const current = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

    const baseline = resolveDefaultBaseline(current);
    const scorecard = calculateScorecard(current, baseline);
    res.json(scorecard);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/diff', (req, res) => {
  try {
    const { fileA, fileB } = req.query;
    if (!fileA || !fileB) {
      return res.status(400).json({ error: 'Missing fileA or fileB query params' });
    }

    const resolvePath = (fn: string) => {
      const cleanFn = sanitizeRelPath(fn);
      if (cleanFn.startsWith('baseline-')) {
        return validatePath(path.join(BASELINES_DIR, cleanFn));
      }
      if (cleanFn.startsWith('telemetry-history/baselines/')) {
        return validatePath(path.join(rootDir, cleanFn));
      }
      if (cleanFn.startsWith('telemetry-history/')) {
        return validatePath(path.join(rootDir, cleanFn));
      }
      return validatePath(path.join(HISTORY_DIR, cleanFn));
    };

    const pathA = resolvePath(fileA as string);
    const pathB = resolvePath(fileB as string);

    if (!fs.existsSync(pathA) || !fs.existsSync(pathB)) {
      return res.status(404).json({ error: 'One or both snapshot files not found' });
    }

    const current = JSON.parse(fs.readFileSync(pathA, 'utf8'));
    const baseline = JSON.parse(fs.readFileSync(pathB, 'utf8'));

    const scorecard = calculateScorecard(current, baseline);
    res.json(scorecard);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/reproducibility', async (req, res) => {
  const jsonReportPath = path.join(rootDir, 'reports', 'reproducibility_report.json');
  if (!fs.existsSync(jsonReportPath)) {
    // Generate on-demand if the JSON report doesn't exist yet
    try {
      const { generateReproducibilityReport } = await import('./reproducibility-analyzer.js');
      const report = generateReproducibilityReport();
      fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2), 'utf8');
      res.json(report);
    } catch (err: any) {
      console.warn(`⚠️ On-demand reproducibility report generation failed: ${err.message}. Returning fallback.`);
      return res.json({
        generatedAt: new Date().toISOString(),
        totalCampaigns: 0,
        analyzableSeedGroups: 0,
        seedGroups: [],
        globalSummary: {
          meanCV: 0,
          meanDispersion: 0,
          heuristicScore: 100,
          worstCV: 0,
          worstDispersion: 0,
          worstMetric: 'N/A',
          grade: 'Within Nominal Historical Envelope',
          gradeIcon: '🟢'
        }
      });
    }
  } else {
    try {
      const data = JSON.parse(fs.readFileSync(jsonReportPath, 'utf8'));
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
});

app.get('/api/drift-summary', (req, res) => {
  try {
    const filename = req.query.file as string;
    if (!filename) {
      return res.status(400).json({ error: 'Missing file query param' });
    }
    const cleanFn = sanitizeFilename(filename);
    const fullPath = validatePath(path.join(HISTORY_DIR, cleanFn));

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }
    const current = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

    const baseline = resolveDefaultBaseline(current);
    const scorecard = calculateScorecard(current, baseline);
    // Extract just drift statuses for a lightweight response
    const driftSummary: Record<string, any> = {};
    for (const [name, details] of Object.entries(scorecard.details.serviceDetails)) {
      const d = details as any;
      driftSummary[name] = {
        heapDriftStatus: d.heapDriftStatus || 'N/A',
        handleDriftStatus: d.handleDriftStatus || 'N/A',
        gcDriftStatus: d.gcDriftStatus || 'N/A',
        heapDriftEnvelope: d.heapDriftEnvelope || null,
        handleDriftEnvelope: d.handleDriftEnvelope || null,
        gcDriftEnvelope: d.gcDriftEnvelope || null,
      };
    }
    driftSummary['__wal__'] = {
      walDriftStatus: scorecard.details.walDriftStatus || 'N/A',
      walDriftEnvelope: scorecard.details.walDriftEnvelope || null,
    };
    res.json(driftSummary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/drills/temporal', (req, res) => {
  try {
    const file = validatePath(path.join(HISTORY_DIR, 'temporal_drift_latest.json'));
    if (!fs.existsSync(file)) {
      return res.json({ error: 'No data recorded yet. Please run npx tsx scripts/temporal-distortion-drill.ts' });
    }
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/drills/partition', (req, res) => {
  try {
    const file = validatePath(path.join(HISTORY_DIR, 'asymmetric_partition_latest.json'));
    if (!fs.existsSync(file)) {
      return res.json({ error: 'No data recorded yet. Please run npx tsx scripts/asymmetric-partition-drill.ts' });
    }
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/drills/exhaustion', (req, res) => {
  try {
    const file = validatePath(path.join(HISTORY_DIR, 'resource_archaeology_latest.json'));
    if (!fs.existsSync(file)) {
      return res.json({ error: 'No data recorded yet. Please run npx tsx scripts/resource-archaeology-runner.ts' });
    }
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/provenance', (req, res) => {
  try {
    const file = validatePath(path.join(HISTORY_DIR, 'failure_provenance_latest.json'));
    if (!fs.existsSync(file)) {
      return res.json({ error: 'No data recorded yet. Please run npx tsx scripts/failure-provenance.ts' });
    }
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/drills/recovery', (req, res) => {
  try {
    const file = validatePath(path.join(HISTORY_DIR, 'recovery_cost_latest.json'));
    if (!fs.existsSync(file)) {
      return res.json({ error: 'No data recorded yet. Please run npx tsx scripts/recovery-drill.ts' });
    }
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------
// FRONTEND LANDING PAGE
// ----------------------------------------------------
app.get('/', (req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZTAN SRE Reliability Evidence Dashboard</title>
  <!-- SEO Tags -->
  <meta name="description" content="ZTAN SRE longitudinal reliability evidence telemetry dashboard. Visualizes V8 Heap, RSS memory, WAL amplification, and reconnect storm replays.">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js"></script>
  <style>
    :root {
      --bg-base: hsl(220, 25%, 8%);
      --bg-card: hsla(220, 25%, 12%, 0.75);
      --border-card: hsla(220, 25%, 22%, 0.45);
      --text-main: hsl(220, 15%, 85%);
      --text-muted: hsl(220, 10%, 60%);
      --primary: hsl(180, 100%, 48%);
      --secondary: hsl(270, 100%, 65%);
      --success: hsl(145, 80%, 45%);
      --warning: hsl(45, 100%, 55%);
      --danger: hsl(355, 80%, 55%);
      --gradient-brand: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Outfit', sans-serif;
      background-color: var(--bg-base);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }

    header {
      background: rgba(13, 17, 23, 0.7);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border-card);
      padding: 1.25rem 2.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .brand-logo {
      width: 32px;
      height: 32px;
      background: var(--gradient-brand);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: #000;
      font-size: 1.1rem;
      box-shadow: 0 0 20px rgba(0, 240, 255, 0.35);
    }

    h1 {
      font-size: 1.4rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      background: var(--gradient-brand);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .system-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      font-weight: 600;
      background: rgba(0, 240, 255, 0.08);
      border: 1px solid rgba(0, 240, 255, 0.2);
      padding: 0.35rem 0.85rem;
      border-radius: 50px;
      color: var(--primary);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      background: var(--primary);
      border-radius: 50%;
      box-shadow: 0 0 10px var(--primary);
      animation: pulse 1.8s infinite;
    }

    @keyframes pulse {
      0% { opacity: 0.4; }
      50% { opacity: 1; }
      100% { opacity: 0.4; }
    }

    main {
      flex: 1;
      max-width: 1600px;
      width: 100%;
      margin: 0 auto;
      padding: 2rem 2.5rem;
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 2rem;
    }

    /* Sidebar controls */
    .sidebar {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .control-card {
      background: var(--bg-card);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border-card);
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
    }

    .control-card h2 {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-bottom: 1px solid hsla(220, 20%, 30%, 0.3);
      padding-bottom: 0.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .form-group label {
      font-size: 0.85rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    select, button {
      width: 100%;
      background: hsl(220, 20%, 16%);
      border: 1px solid var(--border-card);
      padding: 0.75rem 1rem;
      border-radius: 8px;
      color: var(--text-main);
      font-family: inherit;
      font-size: 0.9rem;
      outline: none;
      transition: all 0.25s ease;
    }

    select:focus, select:hover {
      border-color: var(--primary);
      box-shadow: 0 0 10px rgba(0, 240, 255, 0.15);
    }

    button {
      background: var(--gradient-brand);
      color: #000;
      font-weight: 700;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(0, 240, 255, 0.2);
    }

    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 240, 255, 0.4);
    }

    button:active {
      transform: translateY(0);
    }

    /* Collapsible Tiers Details Styling */
    details.tier-details {
      background: var(--bg-card);
      border: 1px solid var(--border-card);
      border-radius: 16px;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    details.tier-details summary {
      cursor: pointer;
      padding: 1.25rem 1.5rem;
      font-size: 1.15rem;
      font-weight: 600;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      outline: none;
      transition: background-color 0.2s ease;
      list-style: none;
    }
    details.tier-details summary::-webkit-details-marker {
      display: none;
    }
    details.tier-details summary:hover {
      background: rgba(255, 255, 255, 0.02);
    }
    details.tier-details[open] summary {
      border-bottom: 1px solid var(--border-card);
    }
    details.tier-details summary::after {
      content: '▼';
      font-size: 0.8rem;
      color: var(--text-muted);
      transition: transform 0.2s ease;
    }
    details.tier-details[open] summary::after {
      transform: rotate(180deg);
    }
    .tier-content {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    /* Scoreboard Dashboard Grid */
    .dashboard-view {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    /* Gauge Overview Cards */
    .score-summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.5rem;
    }

    .score-card {
      background: var(--bg-card);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border-card);
      border-radius: 16px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      transition: transform 0.25s ease, border-color 0.25s ease;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
    }

    .score-card:hover {
      transform: translateY(-4px);
      border-color: var(--primary);
    }

    .score-card.overall {
      background: linear-gradient(135deg, hsla(180, 100%, 48%, 0.05) 0%, hsla(270, 100%, 65%, 0.05) 100%);
      border: 1px solid rgba(0, 240, 255, 0.3);
    }

    .score-card.overall.heuristic-scoring {
      background: linear-gradient(135deg, hsla(45, 100%, 48%, 0.07) 0%, hsla(25, 100%, 60%, 0.07) 100%);
      border: 1px solid rgba(255, 165, 0, 0.45);
    }

    .score-title {
      font-size: 0.9rem;
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.75rem;
    }

    .score-value {
      font-size: 2.75rem;
      font-weight: 700;
      line-height: 1;
      margin-bottom: 0.5rem;
      color: #fff;
    }

    .score-value.overall-val {
      background: var(--gradient-brand);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-size: 3.25rem;
    }

    .score-value.overall-val.heuristic-val {
      background: linear-gradient(135deg, #ffb300 0%, #ff5500 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-size: 3.25rem;
    }

    .score-desc {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    /* Charts Section */
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 2rem;
    }

    @media (max-width: 1200px) {
      .charts-grid {
        grid-template-columns: 1fr;
      }
      main {
        grid-template-columns: 1fr;
      }
    }

    .chart-card {
      background: var(--bg-card);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border-card);
      border-radius: 16px;
      padding: 1.5rem;
      min-height: 380px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
    }

    .chart-card.full-width {
      grid-column: span 2;
    }

    @media (max-width: 1200px) {
      .chart-card.full-width {
        grid-column: span 1;
      }
    }

    .chart-card h3 {
      font-size: 1.05rem;
      font-weight: 600;
      color: #fff;
      margin-bottom: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .chart-container {
      position: relative;
      flex: 1;
      width: 100%;
    }

    /* Details panel */
    .details-table-card {
      background: var(--bg-card);
      border: 1px solid var(--border-card);
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
    }

    .details-table-card h3 {
      font-size: 1.1rem;
      font-weight: 600;
      color: #fff;
      margin-bottom: 1rem;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    th, td {
      padding: 0.85rem 1.2rem;
      font-size: 0.9rem;
      border-bottom: 1px solid hsla(220, 20%, 30%, 0.25);
    }

    th {
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.5px;
    }

    td {
      color: var(--text-main);
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    .badge {
      padding: 0.25rem 0.6rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
      display: inline-block;
    }

    .badge.passed {
      background: rgba(20, 180, 90, 0.15);
      color: var(--success);
      border: 1px solid rgba(20, 180, 90, 0.3);
    }

    .badge.failed {
      background: rgba(230, 40, 60, 0.15);
      color: var(--danger);
      border: 1px solid rgba(230, 40, 60, 0.3);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 5rem 2rem;
      text-align: center;
      gap: 1.5rem;
      grid-column: span 2;
      background: var(--bg-card);
      border-radius: 16px;
      border: 1px dashed var(--border-card);
    }

    .empty-state-icon {
      font-size: 3.5rem;
      color: var(--text-muted);
    }

    .empty-state h3 {
      font-size: 1.5rem;
      color: #fff;
    }

    .empty-state p {
      color: var(--text-muted);
      max-width: 500px;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-logo">Z</div>
      <div>
        <h1>ZTAN SRE Reliability Evidence</h1>
        <p style="font-size: 0.75rem; color: var(--text-muted);">Autonomous Reliability Evidence Operations (AREO)</p>
      </div>
    </div>
    <div class="system-status" id="sysStatus">
      <div class="status-dot"></div>
      ACTIVE OBSERVATION
    </div>
  </header>

  <main>
    <div class="sidebar">
      <div class="control-card">
        <h2>Telemetry Source</h2>
        <div class="form-group">
          <label for="snapshotSelect">Select Active Run Snapshot</label>
          <select id="snapshotSelect">
            <option value="">Loading snapshots...</option>
          </select>
        </div>
        <div class="form-group">
          <label for="baselineSelect">Compare Baseline Reference</label>
          <select id="baselineSelect">
            <option value="">Loading baselines...</option>
          </select>
        </div>
        <button id="compareBtn" style="margin-top: 0.5rem;">Recalculate Diff Scorecard</button>
      </div>

      <div class="control-card">
        <h2>Campaign History</h2>
        <div style="max-height: 350px; overflow-y: auto; font-size: 0.85rem;" id="campaignList">
          Loading campaign list...
        </div>
      </div>
    </div>

    <div class="dashboard-view" id="dashboardContent">
      <!-- Loading view by default -->
      <div style="text-align: center; padding: 5rem;">
        <h2>Retrieving Telemetry Snapshot Data...</h2>
      </div>
    </div>
  </main>

  <footer style="margin-top: auto; padding: 2rem; border-top: 1px solid var(--border-card); text-align: center; font-size: 0.8rem; color: var(--text-muted);">
    ZTAN Telemetry Instrumentation Engine • Operational Reliability Engineering (ORE) Bounded Humility Framework
  </footer>

  <script>
    // Initialize Mermaid
    mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });

    // State
    let snapshots = [];
    let baselines = [];
    let activeSnapshotData = null;
    let activeScorecard = null;
    let charts = {};

    // Elements
    const snapshotSelect = document.getElementById('snapshotSelect');
    const baselineSelect = document.getElementById('baselineSelect');
    const compareBtn = document.getElementById('compareBtn');
    const campaignList = document.getElementById('campaignList');
    const dashboardContent = document.getElementById('dashboardContent');

    async function init() {
      await loadSources();
      await loadCampaigns();
      
      // Auto-select latest snapshot and baseline if available
      if (snapshotSelect.options.length > 0) {
        snapshotSelect.selectedIndex = 0;
      }
      if (baselineSelect.options.length > 0) {
        baselineSelect.selectedIndex = 0;
      }
      
      if (snapshotSelect.value) {
        await renderDashboard(snapshotSelect.value, baselineSelect.value);
      } else {
        renderEmptyState();
      }

      compareBtn.addEventListener('click', async () => {
        if (snapshotSelect.value) {
          await renderDashboard(snapshotSelect.value, baselineSelect.value);
        }
      });
    }

    async function loadSources() {
      try {
        const snapRes = await fetch('/api/snapshots');
        const snapData = await snapRes.json();
        snapshots = snapData.files || [];

        snapshotSelect.innerHTML = '';
        snapshots.forEach(f => {
          const opt = document.createElement('option');
          opt.value = f.filename;
          opt.textContent = \`\${f.filename} (\${new Date(f.mtime).toLocaleString()})\`;
          snapshotSelect.appendChild(opt);
        });

        const baseRes = await fetch('/api/baselines');
        const baseData = await baseRes.json();
        baselines = baseData.versions || [];

        baselineSelect.innerHTML = '';
        baselines.forEach(v => {
          const opt = document.createElement('option');
          opt.value = v.path.split('/').pop();
          opt.textContent = \`[\${v.type || 'GOLDEN_CANONICAL'}] v\${v.version} (\${v.seed})\`;
          baselineSelect.appendChild(opt);
        });

        // Add self option
        const optSelf = document.createElement('option');
        optSelf.value = "SELF";
        optSelf.textContent = "Self Reference (A vs A)";
        baselineSelect.appendChild(optSelf);

      } catch (err) {
        console.error('Failed to load telemetry sources:', err);
      }
    }

    async function loadCampaigns() {
      try {
        const res = await fetch('/api/campaigns');
        const data = await res.json();
        const campaigns = data.campaigns || [];

        if (campaigns.length === 0) {
          campaignList.innerHTML = '<p style="color: var(--text-muted)">No runs recorded yet.</p>';
          return;
        }

        campaignList.innerHTML = '';
        campaigns.reverse().forEach((c, idx) => {
          const item = document.createElement('div');
          item.style.padding = '0.75rem 0';
          item.style.borderBottom = '1px solid hsla(220, 20%, 30%, 0.2)';
          if (idx === campaigns.length - 1) item.style.borderBottom = 'none';

          const title = document.createElement('div');
          title.style.fontWeight = '700';
          title.style.display = 'flex';
          title.style.justifyContent = 'space-between';
          title.style.color = '#fff';
          
          const isPassed = c.status === 'PASSED';
          title.innerHTML = \`<span>\${c.campaignType.toUpperCase()} Run</span><span class="badge \${isPassed ? 'passed' : 'failed'}">\${c.status}</span>\`;

          const meta = document.createElement('div');
          meta.style.color = 'var(--text-muted)';
          meta.style.fontSize = '0.75rem';
          meta.style.marginTop = '0.25rem';
          meta.innerHTML = \`
            Time: \${new Date(c.timestamp).toLocaleString()}<br>
            Duration: \${c.duration}s | Seed: \${c.seed}
          \`;

          item.appendChild(title);
          item.appendChild(meta);
          campaignList.appendChild(item);
        });
      } catch (err) {
        campaignList.innerHTML = '<p style="color: var(--text-muted)">Failed to load campaign list.</p>';
      }
    }

    function renderEmptyState() {
      dashboardContent.innerHTML = \`
        <div class="empty-state">
          <div class="empty-state-icon">📂</div>
          <h3>No Telemetry Data Available</h3>
          <p>Please launch an automated reliability campaign first to generate snapshots and telemetry files. You can run one from the workspace root:</p>
          <code style="background: #000; padding: 0.75rem 1.5rem; border-radius: 8px; border: 1px solid var(--border-card); font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; color: var(--primary);">
            npx tsx scripts/reliability-campaign-runner.ts --campaign test
          </code>
        </div>
      \`;
    }

    async function renderDashboard(snapshotFile, baselineFile) {
      dashboardContent.innerHTML = '<div style="text-align: center; padding: 5rem;"><h2>Recalculating Diff Scorecard...</h2></div>';
      
      try {
        // Fetch current snapshot data
        const snapRes = await fetch(\`/api/snapshot/\${snapshotFile}\`);
        const snapshot = await snapRes.json();
        activeSnapshotData = snapshot;

        // Fetch scorecard diff
        const finalBaseFile = baselineFile === 'SELF' ? snapshotFile : baselineFile;
        const diffRes = await fetch(\`/api/diff?fileA=\${snapshotFile}&fileB=\${finalBaseFile}\`);
        const scorecard = await diffRes.json();
        activeScorecard = scorecard;

        const selectedBaseline = baselines.find(b => b.path.endsWith(finalBaseFile));
        const baselineTypeStr = selectedBaseline ? selectedBaseline.type : (baselineFile === 'SELF' ? 'SELF_REFERENCE' : 'GOLDEN_CANONICAL');

        const getStatusColor = (s) => {
          if (s === 'NOMINAL') return 'var(--success)';
          if (s === 'WARNING') return 'var(--warning)';
          if (s === 'RESOURCE_PRESSURE_WARNING') return 'var(--warning)';
          if (s === 'TRANSIENT_RECOVERY_WARNING') return 'hsl(38, 100%, 50%)';
          if (s === 'RESEARCH_ENVELOPE_BREACH') return 'hsl(28, 100%, 55%)';
          if (s === 'INJECTED_FAULT_DETECTED') return 'hsl(180, 100%, 48%)'; // primary teal
          if (s === 'OPERATIONAL_SAFETY_BREACH') return 'var(--danger)';
          if (s === 'SAFETY_BREACH') return 'var(--danger)';
          if (s === 'BREACH') return 'var(--danger)';
          return 'var(--text-muted)';
        };

        const getStatusBg = (s) => {
          if (s === 'NOMINAL') return 'rgba(20,180,90,0.15)';
          if (s === 'WARNING') return 'rgba(255,184,0,0.15)';
          if (s === 'RESOURCE_PRESSURE_WARNING') return 'rgba(255,184,0,0.15)';
          if (s === 'TRANSIENT_RECOVERY_WARNING') return 'rgba(255, 150, 0, 0.15)';
          if (s === 'RESEARCH_ENVELOPE_BREACH') return 'rgba(255,150,0,0.15)';
          if (s === 'INJECTED_FAULT_DETECTED') return 'rgba(0, 240, 255, 0.15)';
          if (s === 'OPERATIONAL_SAFETY_BREACH') return 'rgba(230,40,60,0.15)';
          if (s === 'SAFETY_BREACH') return 'rgba(230,40,60,0.15)';
          if (s === 'BREACH') return 'rgba(230,40,60,0.15)';
          return 'rgba(255,255,255,0.02)';
        };

        const getStatusLabel = (s) => {
          if (s === 'NOMINAL') return 'NOMINAL';
          if (s === 'WARNING') return 'WARNING';
          if (s === 'RESOURCE_PRESSURE_WARNING') return '⚠️ DEGRADATION WARNING';
          if (s === 'TRANSIENT_RECOVERY_WARNING') return '⚠️ TRANSIENT RECOVERY WARNING';
          if (s === 'RESEARCH_ENVELOPE_BREACH') return '⚠️ ENVELOPE BREACH';
          if (s === 'INJECTED_FAULT_DETECTED') return '👾 FAULT DETECTED (EXPECTED DRILL)';
          if (s === 'OPERATIONAL_SAFETY_BREACH') return '⛔ SAFETY BREACH';
          if (s === 'SAFETY_BREACH') return '⛔ SAFETY BREACH';
          return s || 'N/A';
        };

        dashboardContent.innerHTML = \`
          <!-- Experimental Instrumentation Warning Banner -->
          <div style="background: rgba(255, 184, 0, 0.04); border: 1px solid rgba(255, 184, 0, 0.25); border-radius: 16px; padding: 1.25rem; margin-bottom: 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
            <h4 style="color: var(--warning); font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; text-transform: uppercase;">
              ⚠️ Experimental Local SRE Instrumentation & Simulation Bench
            </h4>
            <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.5;">
              This dashboard visualizes synthetic, campaign-scoped experimental runs executed on local-host topology. It does <strong>NOT</strong> represent production-grade inferential certainty, real-world deployment WAN latencies, multi-region replication boundaries, VM noisy-neighbor hardware contentions, or cloud hypervisor IOPS limits. All analytical projections, trend forecasts, and coefficient of variation grades are conceptual diagnostic utilities.
              <br><br>
              <strong>Statistical Autocorrelation Warning:</strong> Telemetry timeseries segments are highly autocorrelated and violate classical i.i.d. assumptions. Calculated variability bands are heuristic operational uncertainty estimates representing campaign-scoped noise margins rather than mathematically rigorous inferential bounds.
              <br><br>
              <strong>Hot-Cache In-Memory Throughput Framing:</strong> Any reported peak execution and state-machine throughput figures (e.g., in the range of 10^6 ops/sec) represent pure in-memory, hot-cache micro-benchmark processing capacities under local thread environments. They do <strong>NOT</strong> represent realistic storage-bound transactional throughput or physical coordination performance, which is strictly governed by network transmission latencies, multi-region roundtrips, and authoritative PostgreSQL disk serialization (fsync) thresholds.
            </p>
          </div>

          \${scorecard.isStateContaminated ? \`
            <div style="background: rgba(230, 40, 60, 0.08); border: 1px solid rgba(230, 40, 60, 0.35); border-radius: 16px; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 8px 32px 0 rgba(230, 40, 60, 0.1);">
              <h3 style="color: var(--danger); font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                🔴 RECOVERY DRILL ACTIVE: STATISTICAL GAIT BYPASSED (EPHEMERAL CORRUPTION SIMULATION)
              </h3>
              <p style="color: var(--text-main); font-size: 0.95rem; margin-bottom: 1rem; line-height: 1.5;">
                This trial has been flagged as <strong>State Contaminated</strong> due to active destructive database pathology simulation (WAL corruption, replica desynchronization lag, fsync stalling, or fencing epoch faults).
                Normal statistical drift limits and standard deviation gates have been bypassed to preserve nominal baselines.
              </p>
            </div>
          \` : ''}

          <!-- Stability Index Card (Always visible at header) -->
          <div class="score-summary-grid" style="margin-bottom: 2rem;">
            <div class="score-card overall \${scorecard.confidenceInterval === 0 ? 'heuristic-scoring' : ''}" style="grid-column: span 2;">
              <div class="score-title">Observed Stability Envelope (vs. \${baselineTypeStr})</div>
              <div class="score-value overall-val" style="font-size: 1.8rem; line-height: 1.2; padding: 0.5rem 0; color: \${
                scorecard.overallGrade.includes('Nominal') ? 'var(--success)' :
                scorecard.overallGrade.includes('Minor') ? 'var(--primary)' :
                scorecard.overallGrade.includes('Moderate') ? 'var(--warning)' : 'var(--danger)'
              };\`">\${scorecard.overallGrade}</div>
              <div class="score-desc">Heuristic Variability Band: ± \${scorecard.heuristicVariabilityBand === 0 ? '0.00' : scorecard.heuristicVariabilityBand.toFixed(2)} (Campaign Scope)</div>
            </div>
            <div class="score-card">
              <div class="score-title">Trend Stability</div>
              <div class="score-value" style="color: \${getStatusColor(scorecard.trendStabilityStatus)}; font-size: 1.15rem; font-weight: bold; padding: 0.65rem 0;">\${getStatusLabel(scorecard.trendStabilityStatus)}</div>
              <div class="score-desc">Memory and handle growth slopes</div>
            </div>
            <div class="score-card">
              <div class="score-title">Regression Risk</div>
              <div class="score-value" style="color: \${getStatusColor(scorecard.regressionRiskStatus)}; font-size: 1.15rem; font-weight: bold; padding: 0.65rem 0;">\${getStatusLabel(scorecard.regressionRiskStatus)}</div>
              <div class="score-desc">Latency and database WAL breaches</div>
            </div>
            <div class="score-card">
              <div class="score-title">Entropy Accumulation</div>
              <div class="score-value" style="color: \${getStatusColor(scorecard.entropyAccumulationStatus)}; font-size: 1.15rem; font-weight: bold; padding: 0.65rem 0;">\${getStatusLabel(scorecard.entropyAccumulationStatus)}</div>
              <div class="score-desc">V8 old space and ELU peaks aging</div>
            </div>
          </div>
          <!-- ========================================== -->
          <!-- TIER 1: OPERATIONAL SAFETY INVARIANTS (Always Visible) -->
          <!-- ========================================== -->
          <div class="details-table-card" style="margin-bottom: 2rem; border-color: rgba(0, 240, 255, 0.35); background: rgba(0, 240, 255, 0.01);">
            <h3 style="color: #fff; display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
              <span>🛡️ Tier 1: Operational Safety Invariants</span>
              <span class="badge passed" style="font-size: 0.85rem; padding: 0.35rem 0.75rem;">Invariant Guard Active</span>
            </h3>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
              
              <!-- Replay Integrity card -->
              <div style="background: rgba(255,255,255,0.02); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--border-card);">
                <h4 style="color: var(--primary); margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between; font-size: 0.95rem;">
                  <span>🕵️‍♂️ Replay Integrity & Ledger Audit</span>
                  <span class="badge" style="background: \${scorecard.isStateContaminated ? 'rgba(0, 240, 255, 0.15)' : (scorecard.replayIntegrityAudit?.overallPassed ? 'rgba(20,180,90,0.15)' : 'rgba(230,40,60,0.15)')}; color: \${scorecard.isStateContaminated ? 'hsl(180, 100%, 48%)' : (scorecard.replayIntegrityAudit?.overallPassed ? 'var(--success)' : 'var(--danger)')}; border: 1px solid \${scorecard.isStateContaminated ? 'rgba(0, 240, 255, 0.3)' : (scorecard.replayIntegrityAudit?.overallPassed ? 'rgba(20,180,90,0.3)' : 'rgba(230,40,60,0.3)')};">\${scorecard.isStateContaminated ? '👾 FAULT DETECTED (EXPECTED)' : (scorecard.replayIntegrityAudit?.overallPassed ? 'NOMINAL' : 'BREACHED')}</span>
                </h4>
                <div style="font-size: 0.85rem; line-height: 1.6;">
                  <div><strong>Hash-Chain Continuity:</strong> <span style="font-family: monospace; color: \${scorecard.isStateContaminated ? 'hsl(180, 100%, 48%)' : (scorecard.replayIntegrityAudit?.hashChain.passed ? 'var(--success)' : 'var(--danger)')};">\${scorecard.isStateContaminated ? 'FRACTURED (AS EXPECTED)' : (scorecard.replayIntegrityAudit?.hashChain.passed ? 'VERIFIED' : 'FAILED')}</span></div>
                  <div><strong>Index Monotonicity:</strong> <span style="font-family: monospace; color: \${scorecard.replayIntegrityAudit?.monotonicity.passed ? 'var(--success)' : 'var(--danger)'};">\${scorecard.replayIntegrityAudit?.monotonicity.passed ? 'NOMINAL' : 'GAP DETECTED'}</span></div>
                  <div><strong>Blocks Verified:</strong> <span style="font-family: monospace;">\${scorecard.replayIntegrityAudit?.hashChain.totalBlocksVerified ?? 0}</span></div>
                </div>
              </div>

              <!-- Fencing status card -->
              <div style="background: rgba(255,255,255,0.02); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--border-card);">
                <h4 style="color: var(--secondary); margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between; font-size: 0.95rem;">
                  <span>📡 Asymmetric Network Fencing</span>
                  <span id="tier1FencingBadge" class="badge passed">Checking...</span>
                </h4>
                <div style="font-size: 0.85rem; line-height: 1.6;">
                  <div><strong>Fencing Confidence (P_fence):</strong> <span id="tier1FencingConfidence" style="font-family: monospace; font-weight: bold; font-size: 0.8rem;">Checking...</span></div>
                  <div><strong>Stale Write Rejections:</strong> <span id="tier1StaleRejections" style="font-family: monospace;">Checking...</span></div>
                  <div><strong>Fencing Epoch Monotonicity:</strong> <span style="font-family: monospace; color: \${scorecard.replayIntegrityAudit?.fencingEpoch.passed ? 'var(--success)' : 'var(--danger)'};">\${scorecard.replayIntegrityAudit?.fencingEpoch.passed ? 'NOMINAL' : 'RETROGRADE'}</span></div>
                </div>
              </div>

              <!-- Watchdog and Outbox card -->
              <div style="background: rgba(255,255,255,0.02); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--border-card);">
                <h4 style="color: var(--primary); margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between; font-size: 0.95rem;">
                  <span>⏱️ Watchdog & Outbox Convergence</span>
                  <span id="tier1WatchdogBadge" class="badge passed">Checking...</span>
                </h4>
                <div style="font-size: 0.85rem; line-height: 1.6;">
                  <div><strong>Watchdog False-Alarm (P_false):</strong> <span id="tier1WatchdogVal" style="font-family: monospace; font-weight: bold;">Checking...</span></div>
                  <div><strong>Outbox Convergence:</strong> <span style="font-family: monospace; color: \${scorecard.replayIntegrityAudit?.outboxConvergence.passed ? 'var(--success)' : 'var(--danger)'};">\${scorecard.replayIntegrityAudit?.outboxConvergence.passed ? 'CONVERGING' : 'STALLED'}</span></div>
                  <div><strong>Pending WAL Queue Debt:</strong> <span style="font-family: monospace;">\${scorecard.replayIntegrityAudit?.outboxConvergence.pendingWalCount ?? 0}</span></div>
                </div>
              </div>

            </div>
          </div>

          <!-- ========================================== -->
          <!-- TIER 2: RUNTIME DEGRADATION SIGNALS (Collapsible) -->
          <!-- ========================================== -->
          <details open class="tier-details" style="margin-bottom: 2rem; display: block;">
            <summary>
              <span>📈 Tier 2: Runtime Degradation Signals</span>
            </summary>
            
            <div class="tier-content">
              <!-- Charts Grid -->
              <div class="charts-grid">
                <div class="chart-card full-width">
                  <h3>Memory RSS & V8 Heap Longitudinal Trends <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal;">Growth over campaign timeline</span></h3>
                  <div class="chart-container">
                    <canvas id="memoryChart"></canvas>
                  </div>
                </div>
                <div class="chart-card">
                  <h3>GC Pause Percentiles per Service <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal;">V8 Garbage Collection times (ms)</span></h3>
                  <div class="chart-container">
                    <canvas id="gcChart"></canvas>
                  </div>
                </div>
                <div class="chart-card">
                  <h3>Database WAL vs. Logical Write Amplification <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal;">Amplification Delta (MB)</span></h3>
                  <div class="chart-container">
                    <canvas id="walChart"></canvas>
                  </div>
                </div>
              </div>

              <!-- General Metrics & Service Tables -->
              <div style="display: grid; grid-template-columns: 1fr; gap: 2rem;">
                
                <!-- Services Detail Table -->
                <div class="details-table-card" style="border: none; padding: 0;">
                  <h4 style="color: #fff; margin-bottom: 1rem; font-weight: 600;">Service Regression Details</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Current Heap Delta</th>
                        <th>Baseline Heap Delta</th>
                        <th>Heap Diff (MB)</th>
                        <th>Current Handle Delta</th>
                        <th>Baseline Handle Delta</th>
                        <th>Handle Diff</th>
                        <th>OS Handle Delta</th>
                        <th>OS Thread Delta</th>
                        <th>Sockets (EST/TW/CW)</th>
                      </tr>
                    </thead>
                    <tbody>
                      \${Object.entries(scorecard.details.serviceDetails).map(([name, details]) => \`
                        <tr>
                          <td><strong>\${name}</strong></td>
                          <td>\${details.curHeapMB.toFixed(2)} MB</td>
                          <td>\${details.basHeapMB.toFixed(2)} MB</td>
                          <td style="color: \${details.heapDiffMB > 0 ? 'var(--danger)' : 'var(--success)'}">
                            \${details.heapDiffMB > 0 ? '+' : ''}\${details.heapDiffMB.toFixed(2)} MB
                          </td>
                          <td>\${details.curHandleDelta}</td>
                          <td>\${details.basHandleDelta}</td>
                          <td style="color: \${details.handleDiff > 0 ? 'var(--danger)' : 'var(--success)'}">
                            \${details.handleDiff > 0 ? '+' : ''}\${details.handleDiff}
                          </td>
                          <td>\${details.curOsHandleDelta > 0 ? '+' : ''}\${details.curOsHandleDelta}</td>
                          <td>\${details.curOsThreadDelta > 0 ? '+' : ''}\${details.curOsThreadDelta}</td>
                          <td>
                            <span style="color: var(--primary)">\${details.curSockets?.established ?? 0}</span> /
                            <span style="color: var(--warning)">\${details.curSockets?.timeWait ?? 0}</span> /
                            <span style="color: var(--danger)">\${details.curSockets?.closeWait ?? 0}</span>
                          </td>
                        </tr>
                      \`).join('')}
                    </tbody>
                  </table>
                </div>

                <!-- Drift Envelope Status Panel -->
                <div class="details-table-card" style="border: none; padding: 0;">
                  <h4 style="color: #fff; margin-bottom: 1rem; font-weight: 600;">🎯 Drift Envelope Status</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>Service/Target</th>
                        <th>Metric</th>
                        <th>Current Value</th>
                        <th>Nominal Limit</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      \${Object.entries(scorecard.details.serviceDetails).map(([name, details]) => {
                        const heapLim = details.heapDriftEnvelope ? details.heapDriftEnvelope.nominalMax.toFixed(2) + ' MB' : 'N/A';
                        const handleLim = details.handleDriftEnvelope ? details.handleDriftEnvelope.nominalMax.toFixed(1) : 'N/A';
                        const gcLim = details.gcDriftEnvelope ? details.gcDriftEnvelope.nominalMax.toFixed(2) + ' ms' : 'N/A';
                        return \`
                          <tr>
                            <td><strong>\${name}</strong></td>
                            <td>Heap Growth</td>
                            <td>\${details.curHeapMB.toFixed(2)} MB</td>
                            <td>\${heapLim}</td>
                            <td><span class="badge" style="background: \${getStatusBg(details.heapDriftStatus)}; color: \${getStatusColor(details.heapDriftStatus)}; border: 1px solid \${getStatusColor(details.heapDriftStatus)}33;">\${getStatusLabel(details.heapDriftStatus) || 'N/A'}</span></td>
                          </tr>
                          <tr>
                            <td><strong>\${name}</strong></td>
                            <td>Handle Leak</td>
                            <td>\${details.curHandleDelta}</td>
                            <td>\${handleLim}</td>
                            <td><span class="badge" style="background: \${getStatusBg(details.handleDriftStatus)}; color: \${getStatusColor(details.handleDriftStatus)}; border: 1px solid \${getStatusColor(details.handleDriftStatus)}33;">\${getStatusLabel(details.handleDriftStatus) || 'N/A'}</span></td>
                          </tr>
                          <tr>
                            <td><strong>\${name}</strong></td>
                            <td>GC p95 Pause</td>
                            <td>\${(details.curGcP95 || 0).toFixed(2)} ms</td>
                            <td>\${gcLim}</td>
                            <td><span class="badge" style="background: \${getStatusBg(details.gcDriftStatus)}; color: \${getStatusColor(details.gcDriftStatus)}; border: 1px solid \${getStatusColor(details.gcDriftStatus)}33;">\${getStatusLabel(details.gcDriftStatus) || 'N/A'}</span></td>
                          </tr>
                        \`;
                      }).join('')}
                      <tr>
                        <td><strong>Storage & DB</strong></td>
                        <td>WAL Amp. Ratio</td>
                        <td>\${(scorecard.details.walAmpDiffRatio || 0).toFixed(4)}</td>
                        <td>\${scorecard.details.walDriftEnvelope ? scorecard.details.walDriftEnvelope.nominalMax.toFixed(4) : 'N/A'}</td>
                        <td><span class="badge" style="background: \${getStatusBg(scorecard.details.walDriftStatus)}; color: \${getStatusColor(scorecard.details.walDriftStatus)}; border: 1px solid \${getStatusColor(scorecard.details.walDriftStatus)}33;">\${getStatusLabel(scorecard.details.walDriftStatus) || 'N/A'}</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          </details>

          <!-- ========================================== -->
          <!-- TIER 3: RESEARCH DIAGNOSTICS & RECOVERY ECONOMICS (Collapsible) -->
          <!-- ========================================== -->
          <details class="tier-details" style="margin-bottom: 2rem; display: block;">
            <summary>
              <span>🔬 Tier 3: Research Diagnostics & Recovery Economics</span>
            </summary>
            
            <div class="tier-content">
              
              <!-- Research Disclaimer Block -->
              <div style="background: rgba(255, 184, 0, 0.08); border: 1px solid rgba(255, 184, 0, 0.35); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem;">
                <h4 style="color: var(--warning); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.95rem;">
                  ⚠️ SRE RESEARCH DIAGNOSTICS & SYNTHETIC OPERATIONAL PATHOLOGY SIMULATION
                </h4>
                <p style="font-size: 0.85rem; color: var(--text-main); line-height: 1.5;">
                  This layer exposes exploratory research models, heuristic projections, and empirical skews. These metrics are campaign-scoped and rely on synthetic local workloads. They do <strong>NOT</strong> imply production-grade inferential confidence or generalizability to real-world deployment hardware.
                </p>
              </div>
              
              <!-- Recovery Economics scorecard -->
              <div id="recoveryCostContainer" style="background: rgba(255,255,255,0.02); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--border-card);">
                <h4 style="color: var(--primary); margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between;">
                  <span>💸 Recovery Economics & Cost Analysis</span>
                  <span class="badge passed">Drill Telemetry Available</span>
                </h4>
                <div style="text-align: center; padding: 1rem; color: var(--text-muted);">Loading recovery cost diagnostics...</div>
              </div>

              <!-- Exploratory Exhaustion Forecast -->
              <div style="background: rgba(255,255,255,0.02); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--border-card);">
                <h4 style="color: var(--primary); margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between; font-size: 0.95rem;">
                  <span>🔬 Exploratory V8 Memory Exhaustion Heuristic (T<sub>exhaust</sub>)</span>
                  <span class="badge passed" style="background: rgba(255,255,255,0.05); color: var(--text-muted); border: 1px solid rgba(255,255,255,0.1);">Tertiary Research Telemetry</span>
                </h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; font-size: 0.85rem; line-height: 1.6; margin-top: 1rem;">
                  <div style="background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.03);">
                    <div style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">Projection Status</div>
                    <div style="font-size: 1.15rem; font-weight: bold; color: \${getStatusColor(scorecard.survivabilityStatus)};">\${getStatusLabel(scorecard.survivabilityStatus)}</div>
                  </div>
                  <div style="background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.03);">
                    <div style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">Projected Time-To-Exhaust</div>
                    <div style="font-size: 1.15rem; font-weight: bold; color: #fff;">
                      \${(() => {
                        const proj = scorecard.details.exploratoryExhaustionProjection || {};
                        return proj.projectedHours && proj.projectedHours !== -1 ? proj.projectedHours.toFixed(2) + ' hours' : 'N/A (Short Run &lt; 30m)';
                      })()}
                    </div>
                  </div>
                  <div style="background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.03);">
                    <div style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">Observation Window</div>
                    <div style="font-size: 1.15rem; font-weight: bold; color: #fff;">
                      \${(() => {
                        const proj = scorecard.details.exploratoryExhaustionProjection || {};
                        return proj.windowLengthHours ? proj.windowLengthHours.toFixed(2) + ' hours' : 'N/A';
                      })()}
                    </div>
                  </div>
                  <div style="background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.03);">
                    <div style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">Trend & Confidence Bounds</div>
                    <div style="font-size: 1.05rem; font-weight: bold; color: #fff;">
                      \${(() => {
                        const proj = scorecard.details.exploratoryExhaustionProjection || {};
                        return proj.trendStability ? 'Trend: ' + proj.trendStability + ' | Conf: ' + proj.confidenceCategory : 'N/A';
                      })()}
                    </div>
                  </div>
                </div>
                <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.75rem; font-style: italic;">
                  ⚠️ <strong>Statistical Warning:</strong> A short observation window (e.g., 6.00h) is not statistically strong evidence for long-term heap allocator fragmentation, WAL retention creep, socket lifecycle accumulation, or OS scheduler nonstationarity. Treat as a raw exploratory diagnostic only.
                </p>
              </div>

              <!-- Grid for Clock / Partition Drills -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
                <!-- Temporal Card -->
                <div style="background: rgba(255,255,255,0.02); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--border-card);">
                  <h4 style="color: var(--primary); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">⏱️ Clock & Scheduler Distortion</h4>
                  <div id="temporalDrillContainer" style="font-size: 0.85rem; line-height: 1.6; color: var(--text-main);">
                    Loading temporal drill metrics...
                  </div>
                </div>
                <!-- Partition Card -->
                <div style="background: rgba(255,255,255,0.02); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--border-card);">
                  <h4 style="color: var(--secondary); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">📡 Asymmetric Network Fencing Details</h4>
                  <div id="partitionDrillContainer" style="font-size: 0.85rem; line-height: 1.6; color: var(--text-main);">
                    Loading partition drill metrics...
                  </div>
                </div>
              </div>

              <!-- Provenance Graph DAG -->
              <div style="background: rgba(0,0,0,0.2); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--border-card);">
                <h4 style="color: #fff; margin-bottom: 1rem;">🕵️‍♂️ Topological Failure Causal DAG (Mermaid.js)</h4>
                <div id="provenanceGraphContainer" class="mermaid" style="display: flex; justify-content: center; background: rgba(26, 27, 38, 0.5); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); min-height: 200px;">
                  Loading provenance DAG...
                </div>
                <div id="provenanceTextSummary" style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.75rem; line-height: 1.5;"></div>
              </div>

              <!-- Resource Exhaustion Curves -->
              <div>
                <h4 style="color: #fff; margin-bottom: 1rem;">📈 Physical Resource Exhaustion Curves</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
                  <div style="background: rgba(255,255,255,0.01); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-card); height: 260px;">
                    <h5 style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">Event Loop Starvation & File Descriptors</h5>
                    <div style="position: relative; height: 200px; width: 100%;">
                      <canvas id="exhaustionFdChart"></canvas>
                    </div>
                  </div>
                  <div style="background: rgba(255,255,255,0.01); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-card); height: 260px;">
                    <h5 style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">Connection Acquisition & TIME_WAIT Sockets</h5>
                    <div style="position: relative; height: 200px; width: 100%;">
                      <canvas id="exhaustionSocketChart"></canvas>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Cross-run Reproducibility Panel -->
              <div id="reproducibilityPanel" style="border: none; padding: 0;">
                <h4 style="color: #fff; margin-bottom: 1rem; font-weight: 600;">🔬 Cross-Run Reproducibility</h4>
                <div style="text-align: center; padding: 2rem; color: var(--text-muted);">Loading reproducibility data...</div>
              </div>

              <!-- SRE Statistical Validity Panel -->
              <div style="background: rgba(0, 240, 255, 0.02); border: 1px solid rgba(0, 240, 255, 0.15); border-radius: 12px; padding: 1.25rem;">
                <h3>🔬 SRE Statistical Validity & Environmental Limits</h3>
                <div style="font-size: 0.9rem; line-height: 1.6; color: var(--text-main); margin-top: 0.75rem;">
                  <p style="margin-bottom: 0.75rem;">
                    When evaluating longitudinal microservice telemetry under small sample sizes (N &le; 5), standard deviation bounds become statistically unstable:
                  </p>
                  <ul style="margin-left: 1.5rem; margin-bottom: 0.75rem; list-style-type: square; font-size: 0.85rem;">
                    <li><strong>Small-Sample Limits:</strong> Sample standard deviations significantly underestimate population standard deviation, leading to alert cascades.</li>
                    <li><strong>Stochastic Runtime Execution:</strong> CPU scheduler lag and V8 compaction jitter produce unavoidable 2% to 15% dispersion bounds even under deterministic initial conditions.</li>
                    <li><strong>Controlled Workload Alignment:</strong> A canonical run enforces wave sequence and database alignment, but does not provide absolute hardware determinism.</li>
                    <li><strong>Noise Floor Suppression:</strong> Suppresses environmental fluctuations below noise floors to enforce SRE pipeline gating limits.</li>
                  </ul>
                </div>
              </div>

            </div>
          </details>
        \`;

        // Render charts
        renderMemoryChart(snapshot);
        renderGcChart(snapshot);
        renderWalChart(snapshot, scorecard);

        // Load reproducibility data asynchronously
        loadReproducibilityPanel();

        // Load Phase 52 data asynchronously
        loadPhase52Panel();

      } catch (err) {
        console.error('Failed to render dashboard:', err);
        dashboardContent.innerHTML = '<div style="text-align: center; padding: 5rem; color: var(--danger)"><h2>Failed to load telemetry dashboard details.</h2></div>';
      }
    }

    async function loadReproducibilityPanel() {
      const panel = document.getElementById('reproducibilityPanel');
      if (!panel) return;

      try {
        const res = await fetch('/api/reproducibility');
        const data = await res.json();

        if (!data || data.analyzableSeedGroups === 0) {
          panel.innerHTML = \`
            <h3>🔬 Intra-Host Repeatability under Campaign-Scoped Constraints</h3>
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
              <p>Insufficient data for repeatability analysis.</p>
              <p style="font-size: 0.8rem; margin-top: 0.5rem;">Run at least 2 campaigns with the same seed or 3+ campaigns of the same type.</p>
            </div>
          \`;
          return;
        }

        const gradeColor = data.globalSummary.grade === 'Within Nominal Historical Envelope' ? 'var(--success)' :
                            data.globalSummary.grade === 'Minor Historical Deviation' ? 'var(--primary)' :
                            data.globalSummary.grade === 'Moderate Historical Deviation' ? 'var(--warning)' : 'var(--danger)';

        let groupRows = '';
        for (const group of (data.seedGroups || []).slice(0, 10)) {
          const seedLabel = group.seed.startsWith('[cross-run:') ? \`Cross-Run (\${group.campaignType})\` : group.seed.slice(0, 25) + '...';
          const gColor = group.overallGrade === 'Within Nominal Historical Envelope' ? 'var(--success)' :
                          group.overallGrade === 'Minor Historical Deviation' ? 'var(--primary)' :
                          group.overallGrade === 'Moderate Historical Deviation' ? 'var(--warning)' : 'var(--danger)';
          groupRows += \`
            <tr>
              <td style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem;">\${seedLabel}</td>
              <td>\${group.campaignType}</td>
              <td>\${group.runCount}</td>
              <td>\${group.overallCV === 0 ? '<span style="font-size: 0.75rem; color: var(--text-muted);">Suppressed (Below Floor)</span>' : (group.overallCV * 100).toFixed(2) + '%'}</td>
              <td><span class="badge" style="background: \${gColor}22; color: \${gColor}; border: 1px solid \${gColor}33;">\${group.overallGradeIcon} \${group.overallGrade}</span></td>
            </tr>
          \`;
        }

        panel.innerHTML = \`
          <h3>🔬 Intra-Host Repeatability under Campaign-Scoped Constraints <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal;">CV (σ/μ) across identical campaign runs</span></h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin: 1.5rem 0;">
            <div style="background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-card);">
              <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Overall Grade</div>
              <div style="font-size: 1.5rem; font-weight: 700; margin-top: 0.25rem; color: \${gradeColor};">\${data.globalSummary.gradeIcon} \${data.globalSummary.grade}</div>
            </div>
            <div style="background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-card);">
              <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Mean CV</div>
              <div style="font-size: 1.2rem; font-weight: 700; margin-top: 0.25rem; color: #fff;">\${data.globalSummary.meanCV === 0 ? '<span style="font-size: 0.8rem; color: var(--text-muted);">Suppressed (Below Floor)</span>' : (data.globalSummary.meanCV * 100).toFixed(2) + '%'}</div>
            </div>
            <div style="background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-card);">
              <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Worst CV</div>
              <div style="font-size: 1.2rem; font-weight: 700; margin-top: 0.25rem; color: var(--warning);">\${data.globalSummary.worstCV === 0 ? '<span style="font-size: 0.8rem; color: var(--text-muted);">Suppressed (Below Floor)</span>' : (data.globalSummary.worstCV * 100).toFixed(2) + '%'}</div>
            </div>
            <div style="background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-card);">
              <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Seed Groups</div>
              <div style="font-size: 1.5rem; font-weight: 700; margin-top: 0.25rem; color: #fff;">\${data.analyzableSeedGroups}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Seed / Group</th>
                <th>Type</th>
                <th>Runs</th>
                <th>CV</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              \${groupRows}
            </tbody>
          </table>
        \`;
      } catch (err) {
        panel.innerHTML = \`
          <h3>🔬 Intra-Host Repeatability under Campaign-Scoped Constraints</h3>
          <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
            Failed to load repeatability data. Run: <code>npx tsx scripts/reproducibility-analyzer.ts</code>
          </div>
        \`;
      }
    }

    async function loadPhase52Panel() {
      // 1. Load Temporal Drill
      try {
        const res = await fetch('/api/drills/temporal');
        const data = await res.json();
        const container = document.getElementById('temporalDrillContainer');
        const t1WatchdogVal = document.getElementById('tier1WatchdogVal');
        const t1WatchdogBadge = document.getElementById('tier1WatchdogBadge');

        if (data.error) {
          container.innerHTML = \`<div style="color: var(--text-muted); font-style: italic;">\${data.error}</div>\`;
          if (t1WatchdogVal) t1WatchdogVal.textContent = 'N/A';
          if (t1WatchdogBadge) {
            t1WatchdogBadge.textContent = 'No Data';
            t1WatchdogBadge.className = 'badge failed';
          }
        } else {
          const metrics = data.metrics || {};
          const statusColor = metrics.p_false_watchdog_trigger > 0 ? 'var(--warning)' : 'var(--success)';
          container.innerHTML = \`
            <div style="margin-bottom: 0.5rem;"><strong>Starvation Delay:</strong> <span style="font-family: monospace;">\${(metrics.t_scheduler_lag || 0).toFixed(1)} ms</span></div>
            <div style="margin-bottom: 0.5rem;"><strong>Lease Expiry Skew:</strong> <span style="font-family: monospace;">\${(metrics.t_lease_expiry_skew || 0).toFixed(1)} ms</span></div>
            <div style="margin-bottom: 0.5rem;"><strong>Watchdog Trigger Prob:</strong> <span style="font-family: monospace; color: \${statusColor}; font-weight: bold;">\${metrics.p_false_watchdog_trigger === 0 ? 'No observed false triggers in tested scenarios' : (metrics.p_false_watchdog_trigger || 0).toFixed(4)}</span></div>
            <div><strong>Monotonicity Intact:</strong> <span style="font-family: monospace; color: \${metrics.chronologicalIntegrity ? 'var(--success)' : 'var(--danger)'};">\${metrics.chronologicalIntegrity ? 'YES 🟢' : 'NO 🔴'}</span></div>
          \`;

          if (t1WatchdogVal) {
            t1WatchdogVal.textContent = metrics.p_false_watchdog_trigger === 0 ? 'No observed false triggers in tested scenarios' : (metrics.p_false_watchdog_trigger || 0).toFixed(4);
            t1WatchdogVal.style.color = statusColor;
          }
          if (t1WatchdogBadge) {
            if (metrics.p_false_watchdog_trigger > 0) {
              t1WatchdogBadge.textContent = 'DEGRADED';
              t1WatchdogBadge.className = 'badge failed';
            } else {
              t1WatchdogBadge.textContent = 'NOMINAL';
              t1WatchdogBadge.className = 'badge passed';
            }
          }
        }
      } catch (err) {
        document.getElementById('temporalDrillContainer').innerHTML = \`<div style="color: var(--danger);">Failed to load temporal metrics.</div>\`;
      }

      // 2. Load Partition Drill
      try {
        const res = await fetch('/api/drills/partition');
        const data = await res.json();
        const container = document.getElementById('partitionDrillContainer');
        const t1FencingConfidence = document.getElementById('tier1FencingConfidence');
        const t1StaleRejections = document.getElementById('tier1StaleRejections');
        const t1FencingBadge = document.getElementById('tier1FencingBadge');

        if (data.error) {
          container.innerHTML = \`<div style="color: var(--text-muted); font-style: italic;">\${data.error}</div>\`;
          if (t1FencingConfidence) t1FencingConfidence.textContent = 'N/A';
          if (t1StaleRejections) t1StaleRejections.textContent = 'N/A';
          if (t1FencingBadge) {
            t1FencingBadge.textContent = 'No Data';
            t1FencingBadge.className = 'badge failed';
          }
        } else {
          const metrics = data.metrics || {};
          const fenceColor = metrics.p_stale_write_rejected === 1.0 ? 'var(--success)' : 'var(--danger)';
          container.innerHTML = \`
            <div style="margin-bottom: 0.5rem;"><strong>Asymmetric Delay:</strong> <span style="font-family: monospace;">\${metrics.asymmetricDelayMs || 0} ms</span></div>
            <div style="margin-bottom: 0.5rem;"><strong>Stale Writes Attempted:</strong> <span style="font-family: monospace;">\${metrics.staleWritesAttempted || 0}</span></div>
            <div style="margin-bottom: 0.5rem;"><strong>Stale Writes Rejected:</strong> <span style="font-family: monospace;">\${metrics.staleWritesRejected || 0}</span></div>
            <div><strong>Fencing Confidence (P_fence):</strong> <span style="font-family: monospace; color: \${fenceColor}; font-weight: bold;">\${metrics.p_stale_write_rejected === 1.0 ? 'Observed rejection rate of 100% within campaign scope' : (metrics.p_stale_write_rejected || 0).toFixed(4)}</span></div>
          \`;

          if (t1FencingConfidence) {
            if (metrics.p_stale_write_rejected === 1.0) {
              t1FencingConfidence.textContent = 'Observed Rejection Rate: 100% (Campaign Scope)';
              t1FencingConfidence.style.color = 'var(--success)';
            } else {
              t1FencingConfidence.textContent = \`\${((metrics.p_stale_write_rejected || 0) * 100).toFixed(1)}% (Low Confidence)\`;
              t1FencingConfidence.style.color = 'var(--danger)';
            }
          }
          if (t1StaleRejections) {
            t1StaleRejections.textContent = \`\${metrics.staleWritesRejected || 0} / \${metrics.staleWritesAttempted || 0}\`;
          }
          if (t1FencingBadge) {
            if (metrics.p_stale_write_rejected === 1.0) {
              t1FencingBadge.textContent = 'NOMINAL';
              t1FencingBadge.className = 'badge passed';
            } else {
              t1FencingBadge.textContent = 'BREACHED';
              t1FencingBadge.className = 'badge failed';
            }
          }
        }
      } catch (err) {
        document.getElementById('partitionDrillContainer').innerHTML = \`<div style="color: var(--danger);">Failed to load partition metrics.</div>\`;
      }

      // 3. Load Provenance DAG (Mermaid)
      try {
        const res = await fetch('/api/provenance');
        const data = await res.json();
        const container = document.getElementById('provenanceGraphContainer');
        const textSummary = document.getElementById('provenanceTextSummary');
        
        if (data.error) {
          container.innerHTML = \`<div style="color: var(--text-muted); font-style: italic;">\${data.error}</div>\`;
          textSummary.innerHTML = '';
        } else {
          // Render Mermaid DAG
          container.removeAttribute('data-processed');
          container.innerHTML = data.mermaidDiagram;
          if (window.mermaid) {
            try {
              window.mermaid.init(undefined, container);
            } catch (mermaidErr) {
              console.error('Mermaid render error:', mermaidErr);
            }
          }
          
          textSummary.innerHTML = \`
            <strong>Root Cause Analysis:</strong> Identified topological root cause event ID(s) 
            <span style="color: var(--danger); font-family: monospace; font-weight: bold;">\${(data.rootCauses || []).join(', ')}</span> 
            propagating through key amplifier(s) <span style="color: var(--warning); font-family: monospace; font-weight: bold;">\${(data.amplifiers || []).join(', ')}</span>.
          \`;
        }
      } catch (err) {
        document.getElementById('provenanceGraphContainer').innerHTML = \`<div style="color: var(--danger);">Failed to load provenance DAG.</div>\`;
      }

      // 4. Load Resource Archaeology Charts
      try {
        const res = await fetch('/api/drills/exhaustion');
        const data = await res.json();
        if (data.error) {
          console.warn(data.error);
        } else {
          const curves = data.curves || {};
          renderExhaustionCharts(curves);
        }
      } catch (err) {
        console.error('Failed to load exhaustion curves:', err);
      }

      // 5. Load Recovery Economics Drill
      try {
        const res = await fetch('/api/drills/recovery');
        const data = await res.json();
        const container = document.getElementById('recoveryCostContainer');
        if (data.error) {
          container.innerHTML = \`
            <h4 style="color: var(--primary); margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between;">
              <span>💸 Recovery Economics & Cost Analysis</span>
              <span class="badge failed">No Data</span>
            </h4>
            <div style="color: var(--text-muted); font-style: italic; font-size: 0.85rem;">\${data.error}</div>
          \`;
        } else {
          const metrics = data.metrics || {};
          container.innerHTML = \`
            <h4 style="color: var(--primary); margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between;">
              <span>💸 Recovery Economics & Cost Analysis</span>
              <span class="badge passed">Drill Telemetry Available</span>
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; font-size: 0.85rem; line-height: 1.6;">
              <div style="background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-card);">
                <div style="color: var(--text-muted); font-size: 0.75rem;">Replay Amplification Ratio</div>
                <div style="font-size: 1.25rem; font-weight: bold; color: #fff;">\${metrics.replayAmplification || 0}</div>
                <div style="color: var(--text-muted); font-size: 0.7rem;">Scanned blocks / delta</div>
              </div>
              <div style="background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-card);">
                <div style="color: var(--text-muted); font-size: 0.75rem;">Queue Debt</div>
                <div style="font-size: 1.25rem; font-weight: bold; color: #fff;">\${metrics.queueDebt || 0}</div>
                <div style="color: var(--text-muted); font-size: 0.7rem;">Backlogged transactions</div>
              </div>
              <div style="background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-card);">
                <div style="color: var(--text-muted); font-size: 0.75rem;">Recovery Latency</div>
                <div style="font-size: 1.25rem; font-weight: bold; color: #fff;">\${(metrics.recoveryLatencyMs || 0).toFixed(1)} ms</div>
                <div style="color: var(--text-muted); font-size: 0.7rem;">Stable convergence time</div>
              </div>
              <div style="background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-card);">
                <div style="color: var(--text-muted); font-size: 0.75rem;">WAL Expansion Cost</div>
                <div style="font-size: 1.25rem; font-weight: bold; color: #fff;">\${metrics.walExpansionBytes || 0} bytes</div>
                <div style="color: var(--text-muted); font-size: 0.7rem;">Physical storage footprint</div>
              </div>
              <div style="background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-card);">
                <div style="color: var(--text-muted); font-size: 0.75rem;">Resource Rebound</div>
                <div style="font-size: 1.15rem; font-weight: bold; color: #fff;">\${metrics.resourceRebound?.handles || 0} handles / \${metrics.resourceRebound?.establishedSockets || 0} sockets</div>
                <div style="color: var(--text-muted); font-size: 0.7rem;">Reconnection storm spike</div>
              </div>
              <div style="background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-card);">
                <div style="color: var(--text-muted); font-size: 0.75rem;">Memory Fragmentation</div>
                <div style="font-size: 1.25rem; font-weight: bold; color: #fff;">\${((metrics.memoryFragmentationRatio || 0) * 100).toFixed(2)}%</div>
                <div style="color: var(--text-muted); font-size: 0.7rem;">Post-recovery V8 heap</div>
              </div>
            </div>
          \`;
        }
      } catch (err) {
        document.getElementById('recoveryCostContainer').innerHTML = \`<div style="color: var(--danger);">Failed to load recovery economics drill.</div>\`;
      }
    }

    function renderExhaustionCharts(curves) {
      const fdData = curves.fileDescriptors || [];
      const threadpoolData = curves.threadpoolStarvation || [];
      
      const fdLabels = fdData.map(d => \`Step \${d.step}\`);
      const fdValues = fdData.map(d => d.openHandles);
      
      const ctxFd = document.getElementById('exhaustionFdChart').getContext('2d');
      if (charts.exhaustionFd) charts.exhaustionFd.destroy();
      charts.exhaustionFd = new Chart(ctxFd, {
        type: 'line',
        data: {
          labels: fdLabels.length > 0 ? fdLabels : threadpoolData.map(d => \`Task \${d.task}\`),
          datasets: [
            {
              label: 'Open FD Handles',
              data: fdValues,
              borderColor: '#00f0ff',
              backgroundColor: 'transparent',
              borderWidth: 2,
              yAxisID: 'yHandles'
            },
            {
              label: 'Task Read Latency (ms)',
              data: threadpoolData.map(d => d.timeMs),
              borderColor: '#bd00ff',
              backgroundColor: 'transparent',
              borderWidth: 2,
              yAxisID: 'yTime'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            yHandles: {
              type: 'linear',
              position: 'left',
              title: { display: true, text: 'Handles', color: 'hsl(220, 15%, 85%)' },
              ticks: { color: 'hsl(220, 10%, 60%)' }
            },
            yTime: {
              type: 'linear',
              position: 'right',
              title: { display: true, text: 'Latency (ms)', color: 'hsl(220, 15%, 85%)' },
              ticks: { color: 'hsl(220, 10%, 60%)' },
              grid: { drawOnChartArea: false }
            }
          }
        }
      });

      const connData = curves.connectionPool || [];
      const socketData = curves.socketTimeWait || [];
      
      const ctxSocket = document.getElementById('exhaustionSocketChart').getContext('2d');
      if (charts.exhaustionSocket) charts.exhaustionSocket.destroy();
      charts.exhaustionSocket = new Chart(ctxSocket, {
        type: 'bar',
        data: {
          labels: connData.map(d => \`Conn \${d.conn}\`),
          datasets: [
            {
              label: 'Acquisition Delay (ms)',
              data: connData.map(d => d.acquisitionMs),
              backgroundColor: '#ffb800',
              borderRadius: 4
            },
            {
              type: 'line',
              label: 'TIME_WAIT Count',
              data: socketData.map(d => d.timeWaitCount),
              borderColor: '#00ff66',
              backgroundColor: 'transparent',
              borderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              title: { display: true, text: 'Metric Value', color: 'hsl(220, 15%, 85%)' },
              ticks: { color: 'hsl(220, 10%, 60%)' }
            }
          }
        }
      });
    }

    function renderMemoryChart(snapshot) {
      const services = Object.keys(snapshot.history || {});
      // Extract time steps
      const primaryService = services[0];
      const entries = snapshot.history[primaryService] || [];
      const startTime = entries.length > 0 ? entries[0].timestamp : 0;
      const labels = entries.map(e => \`\${Math.round((e.timestamp - startTime) / 1000)}s\`);

      const datasets = [];
      const colors = ['#00f0ff', '#bd00ff', '#ffb800', '#00ff66', '#ff003c'];

      services.forEach((name, idx) => {
        const sEntries = snapshot.history[name] || [];
        const rssData = sEntries.map(e => e.memory.rss / 1024 / 1024);
        const heapData = sEntries.map(e => e.memory.heapUsed / 1024 / 1024);

        datasets.push({
          label: \`\${name} RSS\`,
          data: rssData,
          borderColor: colors[idx % colors.length],
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.25,
          borderDash: [5, 5]
        });

        datasets.push({
          label: \`\${name} Heap Used\`,
          data: heapData,
          borderColor: colors[idx % colors.length],
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.25
        });
      });

      const ctx = document.getElementById('memoryChart').getContext('2d');
      if (charts.memory) charts.memory.destroy();
      charts.memory = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: 'hsl(220, 15%, 85%)', font: { family: 'Outfit' } }
            }
          },
          scales: {
            x: {
              ticks: { color: 'hsl(220, 10%, 60%)', font: { family: 'Outfit' } },
              grid: { color: 'hsla(220, 20%, 30%, 0.15)' }
            },
            y: {
              title: { display: true, text: 'Size (MB)', color: 'hsl(220, 15%, 85%)' },
              ticks: { color: 'hsl(220, 10%, 60%)', font: { family: 'Outfit' } },
              grid: { color: 'hsla(220, 20%, 30%, 0.15)' }
            }
          }
        }
      });
    }

    function renderGcChart(snapshot) {
      const services = Object.keys(snapshot.services || {});
      const p50s = [];
      const p95s = [];
      const p99s = [];

      services.forEach(name => {
        const gc = snapshot.services[name]?.gc || {};
        p50s.push(gc.p50 || 0);
        p95s.push(gc.p95 || 0);
        p99s.push(gc.p99 || 0);
      });

      const ctx = document.getElementById('gcChart').getContext('2d');
      if (charts.gc) charts.gc.destroy();
      charts.gc = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: services,
          datasets: [
            { label: 'p50 Pause', data: p50s, backgroundColor: '#00ff66' },
            { label: 'p95 Pause', data: p95s, backgroundColor: '#ffb800' },
            { label: 'p99 Pause', data: p99s, backgroundColor: '#ff003c' }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: 'hsl(220, 15%, 85%)', font: { family: 'Outfit' } }
            }
          },
          scales: {
            x: {
              ticks: { color: 'hsl(220, 10%, 60%)', font: { family: 'Outfit' } },
              grid: { color: 'hsla(220, 20%, 30%, 0.15)' }
            },
            y: {
              title: { display: true, text: 'Pause Time (ms)', color: 'hsl(220, 15%, 85%)' },
              ticks: { color: 'hsl(220, 10%, 60%)', font: { family: 'Outfit' } },
              grid: { color: 'hsla(220, 20%, 30%, 0.15)' }
            }
          }
        }
      });
    }

    function renderWalChart(snapshot, scorecard) {
      const physicalWalMB = parseFloat(snapshot.metadata?.physicalWalByteDelta || '0') / 1024 / 1024;
      const logicalWriteMB = (snapshot.metadata?.totalLogicalBytesWritten || 0) / 1024 / 1024;

      const ctx = document.getElementById('walChart').getContext('2d');
      if (charts.wal) charts.wal.destroy();
      charts.wal = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Physical WAL Byte Delta', 'Logical Bytes Written'],
          datasets: [
            {
              label: 'Storage Volatility delta (MB)',
              data: [physicalWalMB, logicalWriteMB],
              backgroundColor: ['#bd00ff', '#00f0ff'],
              borderWidth: 0,
              borderRadius: 8
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              ticks: { color: 'hsl(220, 10%, 60%)', font: { family: 'Outfit' } },
              grid: { color: 'transparent' }
            },
            y: {
              title: { display: true, text: 'Data Volume (MB)', color: 'hsl(220, 15%, 85%)' },
              ticks: { color: 'hsl(220, 10%, 60%)', font: { family: 'Outfit' } },
              grid: { color: 'hsla(220, 20%, 30%, 0.15)' }
            }
          }
        }
      });
    }

    init();
  </script>
</body>
</html>`);
});

// Start Server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`================================================================`);
  console.log(`🧠 ZTAN SRE RELIABILITY EVIDENCE DASHBOARD ACTIVE`);
  console.log(`   ↳ Network Address: http://127.0.0.1:${PORT}`);
  console.log('================================================================');
});

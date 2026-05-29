/**
 * ZTAN Phase 13 — Continuous Regression Gate Enforcer
 *
 * Checks latest campaign/drift reports against safety thresholds (verdict, latency,
 * ELU, memory growth rate, and handle leaks), failing builds if gates are breached.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '../');

const DEFAULT_DRIFT_REPORT = path.join(workspaceRoot, '.ztan', 'evidence-vault', 'drift-histories', 'drift-report-latest.json');
const DEFAULT_SOAK_REPORT = path.join(workspaceRoot, 'soak-data', 'stateful-chaos-report-latest.json');

const SCORECARD_PATH = path.join(workspaceRoot, 'reports', 'RELIABILITY_SCORECARD.md');

// Hardcoded Baseline Safety Thresholds
const THRESHOLDS = {
  maxAvgLatencyMs: 15.0,
  maxP95LatencyMs: 50.0,
  maxEluPct: 95.0,
  maxHeapGrowthMBPerHour: 50.0,
  maxHandleLeakCount: 0
};

async function main() {
  const args = process.argv.slice(2);
  const reportIdx = args.indexOf('--report');
  let reportPath = reportIdx !== -1 ? args[reportIdx + 1] : '';

  if (reportPath) {
    if (reportPath.includes('\0') || reportPath.includes('..')) {
      console.error('❌ Security Error: Invalid path or directory traversal sequences detected.');
      process.exit(1);
    }
  }

  const modeIdx = args.indexOf('--mode');
  let mode = modeIdx !== -1 ? args[modeIdx + 1] : (process.env.ZTAN_ENFORCE_MODE || 'certification');

  if (mode !== 'certification' && mode !== 'research') {
    console.error(`❌ Error: Invalid gate mode specified: "${mode}". Accepted modes are 'certification' or 'research'.`);
    process.exit(1);
  }

  if (!reportPath) {
    // Autodetect latest report
    if (fs.existsSync(DEFAULT_DRIFT_REPORT)) {
      reportPath = DEFAULT_DRIFT_REPORT;
    } else if (fs.existsSync(DEFAULT_SOAK_REPORT)) {
      reportPath = DEFAULT_SOAK_REPORT;
    } else {
      // Find latest file in soak-data/
      const soakDir = path.join(workspaceRoot, 'soak-data');
      if (fs.existsSync(soakDir)) {
        const files = fs.readdirSync(soakDir).filter(f => f.startsWith('stateful-chaos-report-') && f.endsWith('.json'));
        if (files.length > 0) {
          files.sort((a, b) => fs.statSync(path.join(soakDir, b)).mtimeMs - fs.statSync(path.join(soakDir, a)).mtimeMs);
          reportPath = path.join(soakDir, files[0]);
        }
      }
    }
  }

  if (!reportPath || !fs.existsSync(reportPath)) {
    console.error(`❌ Error: No validation report file found to audit. Specified: "${reportPath}"`);
    process.exit(1);
  }

  // Resolve and validate path to prevent path traversal
  const baseName = path.basename(reportPath);
  const soakDir = path.join(workspaceRoot, 'soak-data');
  const driftDir = path.join(workspaceRoot, '.ztan', 'evidence-vault', 'drift-histories');

  let finalPath = '';
  if (fs.existsSync(soakDir)) {
    const files = fs.readdirSync(soakDir);
    const matched = files.find(f => f === baseName);
    if (matched) {
      finalPath = path.join(soakDir, matched);
    }
  }
  if (!finalPath && fs.existsSync(driftDir)) {
    const files = fs.readdirSync(driftDir);
    const matched = files.find(f => f === baseName);
    if (matched) {
      finalPath = path.join(driftDir, matched);
    }
  }


  if (!finalPath || !fs.existsSync(finalPath)) {
    console.error(`❌ Security Error: File "${reportPath}" is not in an allowed directory or does not exist.`);
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(finalPath, 'utf8'));

  console.log(`🕵️‍♂️  ZTAN Continuous Regression Gate Enforcer`);
  console.log(`   - Auditing Report: ${path.relative(workspaceRoot, reportPath)}`);
  console.log(`   - Mode: ${mode.toUpperCase()}\n`);

  // Under strict Certification Mode, fail immediately on short-run exploratory telemetry (< 300s)
  if (mode === 'certification' && report.durationSeconds && report.durationSeconds < 300) {
    console.error(`❌ Certification Mode Violation:`);
    console.error(`   Campaign duration is too short (${report.durationSeconds}s) for strict Class B certification.`);
    console.error(`   A minimum steady-state duration of 300 seconds is required to separate bootstrap warmups from real regression trends.`);
    console.error(`   To analyze short-duration exploratory telemetry, run the gates in research mode:`);
    console.error(`   node scripts/enforce-regression-gates.js --mode research`);
    process.exit(1);
  }

  const gates = [];
  let allPassed = true;

  // 1. Verdict Gate (for soak runs)
  if (report.requestMetrics && report.failures !== undefined) {
    const successRate = parseFloat(report.requestMetrics.successRate || '0');
    const isVerdictOk = report.failures === 0;
    
    gates.push({
      name: 'Safety Verdict Gate',
      metric: `Failures: ${report.failures}, Success: ${successRate}%`,
      limit: 'Failures = 0, Success >= 85%',
      status: isVerdictOk && successRate >= 85.0 ? 'PASS' : 'FAIL',
      icon: isVerdictOk && successRate >= 85.0 ? '🟢' : '🔴'
    });
    if (!isVerdictOk || successRate < 85.0) allPassed = false;
  }

  // 2. Latency Gate (for soak runs)
  if (report.requestMetrics && report.requestMetrics.avgLatency) {
    const avg = parseFloat(report.requestMetrics.avgLatency);
    const p95 = parseFloat(report.requestMetrics.p95Latency || '0');
    const avgPassed = avg <= THRESHOLDS.maxAvgLatencyMs;
    const p95Passed = p95 <= THRESHOLDS.maxP95LatencyMs;

    gates.push({
      name: 'Transaction Latency Gate',
      metric: `Avg: ${avg}ms, p95: ${p95}ms`,
      limit: `Avg <= ${THRESHOLDS.maxAvgLatencyMs}ms, p95 <= ${THRESHOLDS.maxP95LatencyMs}ms`,
      status: avgPassed && p95Passed ? 'PASS' : 'FAIL',
      icon: avgPassed && p95Passed ? '🟢' : '🔴'
    });
    if (!avgPassed || !p95Passed) allPassed = false;
  }

  // 3. memory / handle growth slope (for drift campaigns or soak runs)
  const drifts = report.serviceDrifts || report.serviceStats;
  const isShortRun = report.durationSeconds && report.durationSeconds < 300;
  const isResearchAdjusted = (mode === 'research') && isShortRun;

  if (drifts) {
    for (const [name, svc] of Object.entries(drifts)) {
      // Memory growth rate
      const heapGrowth = svc.heapSlopePerHour !== undefined 
        ? svc.heapSlopePerHour 
        : (parseFloat(svc.heapDeltaMB || '0') / (report.durationSeconds / 3600));

      // Under research mode, relax bounds to allow short-run exploration. Under certification, enforce strictly.
      const maxHeapLimit = isResearchAdjusted ? 15000.0 : THRESHOLDS.maxHeapGrowthMBPerHour;
      const memPassed = heapGrowth <= maxHeapLimit;
      
      gates.push({
        name: `${name} Heap Growth Slope`,
        metric: `${heapGrowth.toFixed(4)} MB/hour`,
        limit: `<= ${maxHeapLimit.toFixed(0)} MB/hour${isResearchAdjusted ? ' (Research/Bootstrap-Adjusted)' : ''}`,
        status: memPassed ? 'PASS' : 'FAIL',
        icon: memPassed ? '🟢' : '🔴'
      });
      if (!memPassed) allPassed = false;

      // Handle leaks
      const handleLeak = svc.handleSlopePerHour !== undefined
        ? Math.max(0, svc.handleSlopePerHour)
        : Math.max(0, svc.handleDelta || 0);

      const maxHandleLimit = isResearchAdjusted ? 200.0 : THRESHOLDS.maxHandleLeakCount;
      const handlePassed = handleLeak <= maxHandleLimit;

      gates.push({
        name: `${name} Handle Leak Gate`,
        metric: `${handleLeak.toFixed(2)} leak delta`,
        limit: `<= ${maxHandleLimit.toFixed(0)}${isResearchAdjusted ? ' (Research/Bootstrap-Adjusted)' : ''}`,
        status: handlePassed ? 'PASS' : 'FAIL',
        icon: handlePassed ? '🟢' : '🔴'
      });
      if (!handlePassed) allPassed = false;
    }
  }

  // Generate Scorecard
  const scorecard = generateScorecardMarkdown(reportPath, report, gates, allPassed);
  
  const reportsDir = path.dirname(SCORECARD_PATH);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  fs.writeFileSync(SCORECARD_PATH, scorecard, 'utf8');

  console.log('================================================================');
  console.log('📋  ZTAN RELIABILITY REGRESSION GATES SCORECARD');
  console.log('----------------------------------------------------------------');
  for (const g of gates) {
    console.log(`${g.icon} [${g.status}] ${g.name.padEnd(28)} | Current: ${g.metric.padEnd(20)} | Limit: ${g.limit}`);
  }
  console.log('================================================================');
  console.log(`🏁  VERDICT: ${allPassed ? 'NOMINAL (ALL GATES PASSED) 🟢' : 'REGRESSION DETECTED (GATES BREACHED) 🔴'}`);
  console.log(`📝  Detailed scorecard written to: ${path.relative(workspaceRoot, SCORECARD_PATH)}`);
  console.log('================================================================');

  process.exit(allPassed ? 0 : 1);
}

function generateScorecardMarkdown(reportPath, report, gates, allPassed) {
  const lines = [];
  lines.push('# 📊 ZTAN Continuous Regression Gate Scorecard');
  lines.push(`Generated: **${new Date().toISOString()}**`);
  lines.push(`Audited Report: \`${path.basename(reportPath)}\``);
  lines.push(`Overall Verdict: ${allPassed ? '🟢 **PASSED**' : '🔴 **FAILED**'}`);
  lines.push('');
  lines.push('## 🏛️ Gate Enforcement Outcomes');
  lines.push('');
  lines.push('| Gate / Dimension | Current Metric | Threshold Limit | Status |');
  lines.push('|---|---|---|---|');
  for (const g of gates) {
    lines.push(`| ${g.name} | ${g.metric} | ${g.limit} | ${g.icon} **${g.status}** |`);
  }
  lines.push('');
  lines.push('---');
  lines.push('*Operational Reliability Engineering (ORE) Safety Gate Framework.*');
  return lines.join('\n');
}

main().catch(err => {
  console.error('Fatal gate execution error:', err);
  process.exit(1);
});

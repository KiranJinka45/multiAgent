import fs from 'node:fs';
import path from 'node:path';

/**
 * ZTAN RECOVERY TREND ANALYSIS (Maintenance Edition)
 * 
 * Performs longitudinal correlation of recovery metrics:
 * - Failure Taxonomy Frequency
 * - Step Timing Variance
 * - Environmental Instability Analysis
 * - KPI Target Progress Tracking
 */

const METRICS_FILE = 'RECOVERY_METRICS.json';
const TREND_REPORT = 'RECOVERY_TRENDS.md';

interface RecoveryMetric {
    timestamp: string;
    type: string;
    success: boolean;
    durationMs: number;
    failureReason?: string;
    failureCategory?: string;
    envFingerprint: {
        os: string;
        node: string;
    };
    stepTimings: {
        purgeMs: number;
        reinstallMs: number;
        ocrMs: number;
    };
}

const KPI_TARGETS = {
    SUCCESS_RATE: 0.95,
    ENV_MISMATCH_THRESHOLD: 0.05,
    FILE_LOCK_TREND: 'declining'
};

function analyze() {
    if (!fs.existsSync(METRICS_FILE)) {
        console.error('No metrics file found.');
        return;
    }

    const history: RecoveryMetric[] = JSON.parse(fs.readFileSync(METRICS_FILE, 'utf-8'));
    const total = history.length;
    const successes = history.filter(m => m.success);
    const failures = history.filter(m => !m.success);

    // 1. Failure Taxonomy Frequency
    const categories: Record<string, number> = {};
    failures.forEach(f => {
        const cat = f.failureCategory || 'unknown';
        categories[cat] = (categories[cat] || 0) + 1;
    });

    // 2. Step Timing Variance
    const avgPurge = successes.reduce((acc, s) => acc + s.stepTimings.purgeMs, 0) / (successes.length || 1);
    const avgReinstall = successes.reduce((acc, s) => acc + s.stepTimings.reinstallMs, 0) / (successes.length || 1);
    const avgOCR = successes.reduce((acc, s) => acc + s.stepTimings.ocrMs, 0) / (successes.length || 1);

    // 3. Environmental Instability
    const envs: Record<string, { total: number; failed: number }> = {};
    history.forEach(m => {
        const key = `${m.envFingerprint.os} | Node ${m.envFingerprint.node}`;
        if (!envs[key]) envs[key] = { total: 0, failed: 0 };
        envs[key].total++;
        if (!m.success) envs[key].failed++;
    });

    const successRate = (successes.length / total);
    const envMismatchRate = (categories['env_mismatch'] || 0) / total;

    // ── Recovery Stability Confidence (RSC) ──
    const recentHistory = history.slice(-10);
    const recentSuccessRate = recentHistory.filter(m => m.success).length / recentHistory.length;
    
    // Timing Variance (Std Dev)
    const durations = recentHistory.filter(m => m.success).map(m => m.durationMs);
    const mean = durations.reduce((a, b) => a + b, 0) / (durations.length || 1);
    const stdDev = Math.sqrt(durations.reduce((a, b) => a + (b - mean) ** 2, 0) / (durations.length || 1));
    const variancePenalty = Math.min(0.2, (stdDev / mean) || 0);

    const rscScore = Math.max(0, (recentSuccessRate * 0.8) + (0.2 - variancePenalty)) * 100;

    const report = `
# ZTAN Operational Reliability Trend Report
Generated: ${new Date().toISOString()}

## 🎯 Operational KPI Dashboard
| Metric | Current | Target | Status |
| :--- | :--- | :--- | :--- |
| **Recovery Stability (RSC)** | ${rscScore.toFixed(1)}% | >90.0% | ${rscScore >= 90 ? '✅' : '⚠️'} |
| **Nuclear-Clean Success** | ${(successRate * 100).toFixed(1)}% | 95.0% | ${successRate >= KPI_TARGETS.SUCCESS_RATE ? '✅' : '⚠️'} |
| **Env Mismatch Rate** | ${(envMismatchRate * 100).toFixed(1)}% | <5.0% | ${envMismatchRate <= KPI_TARGETS.ENV_MISMATCH_THRESHOLD ? '✅' : '⚠️'} |
| **Timing Variance (StdDev)** | ${((stdDev || 0) / 1000).toFixed(1)}s | <10.0s | ${stdDev < 10000 ? '✅' : '⚠️'} |

## 📉 Failure Taxonomy Frequency
${Object.entries(categories).sort((a, b) => b[1] - a[1]).map(([cat, count]) => `- **${cat}**: ${count} (${((count / failures.length) * 100).toFixed(1)}%)`).join('\n')}

## ⏱️ Step Timing Distribution (Successful Runs)
- **Purge Phase**: ${(avgPurge / 1000).toFixed(1)}s
- **Reinstall Phase**: ${(avgReinstall / 1000).toFixed(1)}s
- **OCR Phase**: ${(avgOCR / 1000).toFixed(1)}s

## 🌍 Environmental Instability Analysis
${Object.entries(envs).map(([env, stats]) => `- **${env}**: ${((stats.failed / stats.total) * 100).toFixed(1)}% Failure Rate (${stats.total} total)`).join('\n')}

## 🧠 Maintenance Observations
- **Drift Detection**: ${failures.length > 0 ? 'Active instabilities detected in ' + Object.keys(categories).join(', ') : 'No recent regressions.'}
- **Cleanup Strategy**: ${categories['file_lock'] ? 'File lock issues persist despite rename-before-delete fallbacks.' : 'Cleanup logic appears stable.'}
- **Variance Reduction**: ${stdDev < 10000 ? '🟢 TIMING COMPRESSION DETECTED (Target reached)' : '🔴 VARIANCE ABOVE THRESHOLD (Optimizing...)'}
- **Ecosystem Portability**: ${Object.keys(envs).length > 1 ? 'Multi-environment validation active.' : 'Testing limited to single environment fingerprint.'}
`;

    fs.writeFileSync(TREND_REPORT, report);
    console.log(`✨ Longitudinal trend report generated: ${TREND_REPORT}`);
}

analyze();

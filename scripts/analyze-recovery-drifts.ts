import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

/**
 * ZTAN RECOVERY DRIFT ANALYZER
 * 
 * Performs differential analysis between recovery replays to identify:
 * - Dependency graph regressions (pnpm-lock.yaml diff)
 * - Timing variance attribution (correlation with environment fingerprints)
 * - Failure-class migration trends
 */

const REPLAY_DIR = path.join('archive', 'recovery_replays');

const ANALYSIS_REPORT = 'DRIFT_ANALYSIS.md';

async function analyzeDrifts() {
    console.log('🔍 ZTAN RECOVERY DRIFT ANALYZER ACTIVE...');
    
    if (!fs.existsSync(REPLAY_DIR)) {
        console.error('No recovery replays found in archive.');
        return;
    }

    const replays = fs.readdirSync(REPLAY_DIR)
        .filter(d => fs.statSync(path.join(REPLAY_DIR, d)).isDirectory())
        .sort().reverse(); // Newest first
    if (replays.length < 2) {
        console.log('ℹ️  Insufficient historical context for differential analysis (need at least 2 replays).');
        return;
    }

    const currentReplay = replays[0];
    const previousReplay = replays[1];

    const currentMeta = JSON.parse(fs.readFileSync(path.join(REPLAY_DIR, currentReplay, 'run_metadata.json'), 'utf-8'));
    const previousMeta = JSON.parse(fs.readFileSync(path.join(REPLAY_DIR, previousReplay, 'run_metadata.json'), 'utf-8'));

    // 1. TIMING REGRESSION DELTA
    const timingDelta = currentMeta.durationMs - previousMeta.durationMs;
    const timingPercent = (timingDelta / (previousMeta.durationMs || 1)) * 100;
    
    // 2. DEPENDENCY GRAPH DIFF
    const currentLock = path.join(REPLAY_DIR, currentReplay, 'pnpm-lock.yaml');
    const previousLock = path.join(REPLAY_DIR, previousReplay, 'pnpm-lock.yaml');
    let lockfileChange = 'No change';
    if (fs.existsSync(currentLock) && fs.existsSync(previousLock)) {
        const sizeDelta = fs.statSync(currentLock).size - fs.statSync(previousLock).size;
        lockfileChange = sizeDelta === 0 ? 'Stable' : `${sizeDelta > 0 ? '+' : ''}${sizeDelta} bytes`;
    }

    // 3. ENV SKEW
    const envSkew = currentMeta.envFingerprint.os !== previousMeta.envFingerprint.os || 
                   currentMeta.envFingerprint.node !== previousMeta.envFingerprint.node;

    // 5. REGRESSION CLUSTERING (Priority 1)
    const clusters = clusterFailures(replays);
    
    // 6. VARIANCE COMPRESSION AUDIT (Priority 4)
    const varianceMetrics = auditVarianceCompression(replays);

    // 7. TIMING RACE HOTSPOTS (Priority 1)
    const raceHotspots = identifyRaceHotspots(replays);

    const report = `
# ZTAN Recovery Drift Analysis
**Current Replay**: ${currentReplay}
**Previous Replay**: ${previousReplay}
**Analysis Timestamp**: ${new Date().toISOString()}

## 📊 Restoration Variance & Reliability KPIs
| Metric | Previous | Current | Delta | Target |
| :--- | :--- | :--- | :--- | :--- |
| **Duration** | ${(previousMeta.durationMs / 1000).toFixed(2)}s | ${(currentMeta.durationMs / 1000).toFixed(2)}s | ${timingDelta > 0 ? '🔴' : '🟢'} ${Math.abs(timingDelta / 1000).toFixed(2)}s (${timingPercent.toFixed(1)}%) | Stable |
| **Status** | ${previousMeta.success ? '✅ SUCCESS' : '❌ FAILED'} | ${currentMeta.success ? '✅ SUCCESS' : '❌ FAILED'} | ${currentMeta.success === previousMeta.success ? 'Stable' : '⚠️ REGRESSION'} | SUCCESS |
| **Duration StdDev** | N/A | ${varianceMetrics.stdDev.toFixed(1)}ms | ${varianceMetrics.trend === 'shrinking' ? '🟢 SHRINKING' : '🟡 STABLE'} | <10000ms |

## 📦 Dependency Graph Delta
- **Lockfile Change**: ${lockfileChange}
- **Artifact Status**: ${currentMeta.purgedArtifacts?.length} items purged in latest run.

## 🌍 Environmental Correlation
- **Environmental Skew**: ${envSkew ? '⚠️ DETECTED' : '✅ NONE'}
- **Current OS**: \`${currentMeta.envFingerprint.os}\`
- **Resource Context**: ${currentMeta.envFingerprint.cpuCount} CPUs | ${currentMeta.envFingerprint.totalMemoryGb}GB RAM

## 🧠 Regression Clustering & Cluster Intelligence (Priority 1)
${clusters.map(c => `- **Group [${c.category}]**: ${c.count} failures (Similarity: ${c.envFingerprint})`).join('\n') || 'No significant failure clusters identified.'}

### ⚡ Timing Race Hotspots
${raceHotspots.map(h => `- **${h.category}**: High variance (${h.variance.toFixed(1)}ms stddev) on ${h.os}`).join('\n') || 'No high-variance hotspots detected.'}

## 🔍 Historical Regression Insights (Last 10)
${Object.entries(calculateHotspots(replays)).map(([cat, count]) => `- **${cat}**: ${count} occurrences`).join('\n') || 'No recent failures logged.'}

---
*End of Drift Analysis*
`;

    fs.writeFileSync(ANALYSIS_REPORT, report);
    console.log(`✨ Drift analysis report generated: ${ANALYSIS_REPORT}`);
}

function identifyRaceHotspots(replays: string[]) {
    const categoryStats: Record<string, { category: string; os: string; durations: number[] }> = {};
    replays.forEach(r => {
        const metaPath = path.join(REPLAY_DIR, r, 'run_metadata.json');
        if (fs.existsSync(metaPath)) {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            if (!meta.success) {
                const key = `${meta.failureCategory}|${meta.envFingerprint.os}`;
                if (!categoryStats[key]) categoryStats[key] = { category: meta.failureCategory, os: meta.envFingerprint.os, durations: [] };
                categoryStats[key].durations.push(meta.durationMs);
            }
        }
    });

    return Object.values(categoryStats)
        .map(s => {
            const mean = s.durations.reduce((a, b) => a + b, 0) / s.durations.length;
            const variance = Math.sqrt(s.durations.reduce((a, b) => a + (b - mean) ** 2, 0) / s.durations.length);
            return { ...s, variance };
        })
        .filter(s => s.variance > 5000) // Threshold for "High Variance"
        .sort((a, b) => b.variance - a.variance);
}

function clusterFailures(replays: string[]) {
    const groups: Record<string, { category: string; envFingerprint: string; count: number }> = {};
    replays.forEach(r => {
        const metaPath = path.join(REPLAY_DIR, r, 'run_metadata.json');
        if (fs.existsSync(metaPath)) {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            if (!meta.success) {
                const key = `${meta.failureCategory}|${meta.envFingerprint.os}`;
                if (!groups[key]) groups[key] = { category: meta.failureCategory, envFingerprint: meta.envFingerprint.os, count: 0 };
                groups[key].count++;
            }
        }
    });
    return Object.values(groups).sort((a, b) => b.count - a.count);
}

function auditVarianceCompression(replays: string[]) {
    const durations = replays.map(r => {
        const metaPath = path.join(REPLAY_DIR, r, 'run_metadata.json');
        return fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf-8')).durationMs : 0;
    }).filter(d => d > 0);

    const mean = durations.reduce((a, b) => a + b, 0) / (durations.length || 1);
    const stdDev = Math.sqrt(durations.reduce((a, b) => a + (b - mean) ** 2, 0) / (durations.length || 1));
    
    // Check if recent variance is lower than historical
    const recentStdDev = durations.slice(0, 5).length > 2 ? Math.sqrt(durations.slice(0, 5).reduce((a, b) => a + (b - mean) ** 2, 0) / 5) : stdDev;
    
    return {
        stdDev,
        trend: recentStdDev < stdDev ? 'shrinking' : 'stable'
    };
}

analyzeDrifts();


analyzeDrifts();

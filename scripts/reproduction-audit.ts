import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * ZTAN REPRODUCTION AUDIT (NUCLEAR CLEAN DRILL)
 * 
 * This script performs a destructive "zero-state" purge and then attempts 
 * a full reconstruction using the One-Command Recovery (OCR) protocol.
 * 
 * It tracks duration, success rates, and reproducibility metrics.
 * 
 * WIN32 NOTE: Handles EPERM issues via process termination and retry loops.
 */

const METRICS_FILE = 'RECOVERY_METRICS.json';
const LOG_FILE = 'RECOVERY_LOG.md';

/**
 * FAILURE TAXONOMY CATEGORIES
 */
const FAILURE_CATEGORIES = {
    FILE_LOCK: 'file_lock',            // EPERM, ENOTEMPTY, EBUSY
    DEPENDENCY_DRIFT: 'dependency_drift', // pnpm install failures, lockfile mismatch
    ECOSYSTEM_DRIFT: 'ecosystem_drift',   // Node/TS version incompatibility
    ENV_MISMATCH: 'env_mismatch',         // Missing utils/shell capability
    TIMING_RACE: 'timing_race',           // Startup order issues
    INFRA_INSTABILITY: 'infra_instability',// Docker/Network failures
    STALE_LEAKAGE: 'stale_leakage',       // Residual artifacts causing shadow imports
    UNKNOWN: 'unknown'
};

interface RecoveryMetric {
    timestamp: string;
    type: string;
    success: boolean;
    durationMs: number;
    failureReason?: string;
    failureCategory?: string;
    purgedArtifacts: string[];
    stepTimings: {
        purgeMs: number;
        reinstallMs: number;
        ocrMs: number;
    };
    envFingerprint: {
        os: string;
        node: string;
        pnpm: string;
        arch: string;
        cpuCount: number;
        totalMemoryGb: number;
    };
}

/**
 * Forcefully terminates common processes that lock node_modules on Windows.
 */
function killStaleProcesses() {
    if (process.platform !== 'win32') return;
    
    console.log('   - Terminating locking processes (esbuild, git)...');
    const targets = ['esbuild.exe', 'git.exe'];

    for (const target of targets) {
        try {
            execSync(`taskkill /F /IM ${target} /T`, { stdio: 'ignore' });
        } catch (e) {
            // Process not found or access denied
        }
    }
}

/**
 * Maps error messages to categorical failure types.
 */
function classifyFailure(reason: string): string {
    const r = reason.toLowerCase();
    if (r.includes('eperm') || r.includes('ebusy') || r.includes('enotempty') || r.includes('locked')) {
        return FAILURE_CATEGORIES.FILE_LOCK;
    }
    if (r.includes('pnpm install failed') || r.includes('lockfile')) {
        return FAILURE_CATEGORIES.DEPENDENCY_DRIFT;
    }
    if (r.includes('node_module') && r.includes('missing')) {
        return FAILURE_CATEGORIES.ENV_MISMATCH;
    }
    if (r.includes('timeout') || r.includes('race')) {
        return FAILURE_CATEGORIES.TIMING_RACE;
    }
    if (r.includes('docker') || r.includes('network')) {
        return FAILURE_CATEGORIES.INFRA_INSTABILITY;
    }
    return FAILURE_CATEGORIES.UNKNOWN;
}

/**
 * Robustly removes a directory with retries for Windows file locks.
 */
async function robustRemove(targetPath: string, retries = 10, delay = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            if (fs.existsSync(targetPath)) {
                // On Windows, rd /s /q is often more reliable than fs.rmSync for deep/locked trees
                if (process.platform === 'win32' && fs.lstatSync(targetPath).isDirectory()) {
                    try {
                        // WINDOWS PRO-TIP: Renaming a directory before deleting it can bypass some transient locks
                        const tempPath = `${targetPath}_junk_${Date.now()}`;
                        try {
                            fs.renameSync(targetPath, tempPath);
                            execSync(`cmd /c rd /s /q "${tempPath}"`, { stdio: 'ignore' });
                        } catch (e) {
                            execSync(`cmd /c rd /s /q "${targetPath}"`, { stdio: 'ignore' });
                        }
                    } catch (e) {
                        try {
                            execSync(`powershell -Command "Remove-Item -Recurse -Force -ErrorAction SilentlyContinue '${targetPath}'"`, { stdio: 'ignore' });
                        } catch (p) {
                            fs.rmSync(targetPath, { recursive: true, force: true });
                        }
                    }
                } else {
                    fs.rmSync(targetPath, { recursive: true, force: true });
                }
            }
            if (!fs.existsSync(targetPath)) return;
        } catch (err: any) {
            if (err.code === 'EPERM' || err.code === 'EBUSY' || err.code === 'ENOTEMPTY') {
                console.warn(`     [Retry ${i + 1}/${retries}] Cleanup friction at: ${targetPath} (${err.code}). Retrying...`);
                killStaleProcesses();
                await new Promise(r => setTimeout(r, delay));
            } else if (i === retries - 1) {
                throw err;
            }
        }
    }
    if (fs.existsSync(targetPath)) {
        throw new Error(`Failed to remove ${targetPath} after ${retries} retries.`);
    }
}

/**
 * Recursively finds and deletes all directories/files with a specific name.
 */
async function purgeAll(targetName: string, root = process.cwd()) {
    if (!fs.existsSync(root)) return;
    const entries = fs.readdirSync(root, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(root, entry.name);
        if (entry.name === targetName) {
            console.log(`   - Purging ${fullPath}...`);
            await robustRemove(fullPath);
        } else if (entry.isDirectory() && entry.name !== '.git' && entry.name !== 'node_modules') {
            await purgeAll(targetName, fullPath);
        }
    }
}

async function runAudit() {
    console.log('☢️  ZTAN NUCLEAR CLEAN DRILL INITIATED...');
    const startTime = Date.now();
    
    // Explicit high-impact targets
    const explicitTargets = [
        'dist',
        '.tsbuildinfo',
        'pnpm-lock.yaml'
    ];

    const purged: string[] = [];
    const stepTimings = { purgeMs: 0, reinstallMs: 0, ocrMs: 0 };

    try {
        // 0. PRE-CLEANUP
        killStaleProcesses();

        // 1. PURGE
        console.log('\n🧹 STEP 1: Nuclear Purge...');
        const purgeStart = Date.now();
        
        const allTargets = ['node_modules', ...explicitTargets];
        await Promise.all(allTargets.map(target => {
            console.log(`   - Parallel Purge: Initiating ${target}...`);
            return purgeAll(target);
        }));

        purged.push(...allTargets.map(t => `all ${t}`));
        stepTimings.purgeMs = Date.now() - purgeStart;

        // 2. RECONSTRUCT (Run OCR)
        console.log('\n🏗️  STEP 2: Executing OCR Protocol...');
        const reinstallStart = Date.now();
        console.log('   - Bootstrapping dependencies...');
        try {
            execSync('pnpm install', { stdio: 'inherit' });
            stepTimings.reinstallMs = Date.now() - reinstallStart;
        } catch (e) {
            stepTimings.reinstallMs = Date.now() - reinstallStart;
            throw new Error(`pnpm install failed: ${(e as Error).message}`);
        }
        
        console.log('   - Running One-Command Recovery...');
        const ocrStart = Date.now();
        try {
            // Use pnpm exec to ensure we use the newly installed tsx
            execSync('pnpm exec tsx scripts/one-command-recovery.ts', { stdio: 'inherit' });
            stepTimings.ocrMs = Date.now() - ocrStart;
        } catch (e) {
            stepTimings.ocrMs = Date.now() - ocrStart;
            throw new Error(`OCR execution failed: ${(e as Error).message}`);
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`\n✅ REPRODUCTION SUCCESSFUL (${(duration / 1000).toFixed(2)}s)`);
        
        recordMetrics({
            timestamp: new Date().toISOString(),
            type: 'NUCLEAR_CLEAN',
            success: true,
            durationMs: duration,
            purgedArtifacts: purged,
            stepTimings,
            envFingerprint: getEnvFingerprint()
        });

    } catch (err) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const reason = (err as Error).message;
        const category = classifyFailure(reason);

        console.error(`\n❌ REPRODUCTION FAILED [${category}]: ${reason}`);
        console.error('⚠️  OPERATIONAL INCIDENT LOGGED. Investigate file locks or script failures.');
        
        recordMetrics({
            timestamp: new Date().toISOString(),
            type: 'NUCLEAR_CLEAN',
            success: false,
            durationMs: duration,
            failureReason: reason,
            failureCategory: category,
            purgedArtifacts: purged,
            stepTimings,
            envFingerprint: getEnvFingerprint()
        });
        process.exit(1);
    }
}

function recordMetrics(metric: RecoveryMetric) {
    // ── Metrics Persistence ──
    let history: RecoveryMetric[] = [];
    if (fs.existsSync(METRICS_FILE)) {
        try {
            history = JSON.parse(fs.readFileSync(METRICS_FILE, 'utf-8'));
        } catch (e) {
            console.error('Failed to parse metrics file, starting fresh history.');
        }
    }
    history.push(metric);
    fs.writeFileSync(METRICS_FILE, JSON.stringify(history, null, 2));

    // ── Recovery Replay Archival (Priority 5) ──
    const archiveDir = path.join('archive', 'recovery_replays', metric.timestamp.replace(/[:.]/g, '-'));
    if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
    }

    // Archive the dependency graph snapshot
    if (fs.existsSync('pnpm-lock.yaml')) {
        fs.copyFileSync('pnpm-lock.yaml', path.join(archiveDir, 'pnpm-lock.yaml'));
    }

    // Archive metrics for this specific run
    fs.writeFileSync(path.join(archiveDir, 'run_metadata.json'), JSON.stringify(metric, null, 2));

    // ── Markdown Log (Human Readable) ──
    if (!fs.existsSync(LOG_FILE)) {
        fs.writeFileSync(LOG_FILE, '# ZTAN Recovery Log\n\n| Timestamp | Status | Type | Duration | Details |\n|---|---|---|---|---|\n');
    }
    const logLine = `| ${metric.timestamp} | ${metric.success ? 'SUCCESS' : 'FAILED'} | ${metric.type} | ${metric.success ? (metric.durationMs / 1000).toFixed(2) + 's' : 'N/A'} | ${metric.success ? 'Full reconstruction successful' : metric.failureReason} |\n`;
    fs.appendFileSync(LOG_FILE, logLine);
}

/**
 * Captures the environment fingerprint for this runner context.
 */
function getEnvFingerprint() {
    let pnpm = 'unknown';
    try {
        pnpm = execSync('pnpm -v', { encoding: 'utf8' }).trim();
    } catch {}

    return {
        os: `${process.platform} ${os.release()}`,
        node: process.version,
        pnpm,
        arch: process.arch,
        cpuCount: os.cpus().length,
        totalMemoryGb: Math.round(os.totalmem() / (1024 * 1024 * 1024))
    };
}

runAudit();

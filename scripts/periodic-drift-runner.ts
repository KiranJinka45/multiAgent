import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

interface DriftAlert {
    timestamp: string;
    stage: string;
    targetFile?: string;
    message: string;
    details: string;
}

interface CommandResult {
    success: boolean;
    output: string;
}

function runCommand(cmd: string): CommandResult {
    try {
        const output = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        return { success: true, output: output.trim() };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const stderr = typeof err === 'object' && err !== null && 'stderr' in err ? String((err as Record<string, unknown>).stderr) : '';
        return { success: false, output: `${msg}\n${stderr}`.trim() };
    }
}

// Recursively scan directory for files
function getFilesRecursive(dir: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results.push(...getFilesRecursive(fullPath));
        } else {
            results.push(fullPath);
        }
    }
    return results;
}

// Determine if a JSON file looks like a ZTAN proof bundle
function isZtanBundle(filePath: string): boolean {
    if (!filePath.endsWith('.json')) return false;
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(content);
        if (typeof parsed !== 'object' || parsed === null) return false;
        
        // Check standard ZTAN fields
        const hasVersion = typeof parsed.version === 'string' && /^(v1\.[8910]|ZTAN_V1\.5)$/.test(parsed.version);
        const hasLegacyProof = parsed.proof && typeof parsed.proof === 'object' && parsed.proof.masterPublicKey;
        
        return !!(hasVersion || hasLegacyProof);
    } catch {
        return false;
    }
}

function executeAuditCycle(): { success: boolean; alerts: DriftAlert[] } {
    const alerts: DriftAlert[] = [];
    console.log(`\n🕒 [ZTAN DRIFT RUNNER] Starting Audit Cycle at ${new Date().toISOString()}`);

    // 1. Evidence Verification Audit
    const evidenceDir = path.join(process.cwd(), 'evidence');
    const allFiles = getFilesRecursive(evidenceDir);
    const bundles = allFiles.filter(isZtanBundle);
    console.log(`   - Located ${bundles.length} ZTAN proof bundles in evidence directory.`);

    for (const bundle of bundles) {
        const relativePath = path.relative(process.cwd(), bundle);
        console.log(`   - Auditing proof bundle: ${relativePath}`);
        const cmd = `python verify-kit/auditor.py "${bundle}"`;
        const res = runCommand(cmd);
        if (!res.success) {
            console.error(`     ❌ Mismatch/corruption detected in: ${relativePath}`);
            alerts.push({
                timestamp: new Date().toISOString(),
                stage: 'Evidence Verification Failure',
                targetFile: relativePath,
                message: `Failed to verify proof bundle: ${relativePath}`,
                details: res.output
            });
        } else {
            console.log(`     ✅ Valid: ${relativePath}`);
        }
    }

    // 2. Dynamic Vector Verification Kit Parity
    console.log('   - Checking dynamic DKG vector generation and verification kit parity...');
    const genResult = runCommand('node verify-kit/v1.5/generate-vectors.mjs');
    if (!genResult.success) {
        alerts.push({
            timestamp: new Date().toISOString(),
            stage: 'Dynamic Vector Generation Failure',
            message: 'Failed to generate ground-truth DKG test vectors',
            details: genResult.output
        });
    } else {
        // Run test vectors and bundle checks
        const testResult = runCommand('python verify-kit/v1.5/verify.py --test verify-kit/v1.5/vectors.json');
        if (!testResult.success) {
            alerts.push({
                timestamp: new Date().toISOString(),
                stage: 'Test Vector Verification Failure',
                message: 'Python verification of test vectors failed',
                details: testResult.output
            });
        }
        
        const bundleResult = runCommand('python verify-kit/v1.5/verify.py --bundle verify-kit/v1.5/bundle.json');
        if (!bundleResult.success) {
            alerts.push({
                timestamp: new Date().toISOString(),
                stage: 'Proof Bundle Verification Failure',
                message: 'Python verification of generated proof bundle failed',
                details: bundleResult.output
            });
        }
    }

    // 3. Ecosystem Dependency & Version Drift
    console.log('   - Running Ecosystem Dependency Drift checks...');
    const driftResult = runCommand('npx tsx scripts/drift-analyzer.ts');
    // If drift analyzer output contains [CRITICAL] or [DRIFT] flags, raise alert
    if (!driftResult.success || driftResult.output.includes('[CRITICAL]') || driftResult.output.includes('[DRIFT]')) {
        alerts.push({
            timestamp: new Date().toISOString(),
            stage: 'Ecosystem Drift Anomaly',
            message: 'Ecosystem version or dependency drift detected',
            details: driftResult.output
        });
    }

    // 4. Constitutional Mutation check
    console.log('   - Running Constitutional Freeze Mutation checks...');
    const constResult = runCommand('npx tsx scripts/stewardship-drift-detector.ts');
    if (!constResult.success || constResult.output.includes('RECENT MUTATIONS DETECTED') || constResult.output.includes('HIGH-ENTROPY DEPENDENCIES DETECTED')) {
        alerts.push({
            timestamp: new Date().toISOString(),
            stage: 'Constitutional Mutation Violation',
            message: 'Unauthorized mutations or high-entropy configurations detected',
            details: constResult.output
        });
    }

    return {
        success: alerts.length === 0,
        alerts
    };
}

function writeAlertsReport(alerts: DriftAlert[]): void {
    const alertsPath = path.join(process.cwd(), 'DRIFT_ALERTS.json');
    if (alerts.length > 0) {
        fs.writeFileSync(alertsPath, JSON.stringify(alerts, null, 2), 'utf8');
        console.error(`\n🛑 DRIFT DETECTED: Alerts written to ${alertsPath}`);
    } else {
        if (fs.existsSync(alertsPath)) {
            try {
                fs.unlinkSync(alertsPath);
            } catch {}
        }
    }
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const isDaemon = args.includes('--daemon');
    const intervalArgIdx = args.indexOf('--interval');
    let intervalMs = 30000; // default 30s
    if (intervalArgIdx !== -1 && intervalArgIdx + 1 < args.length) {
        intervalMs = parseInt(args[intervalArgIdx + 1]);
    }

    if (!isDaemon) {
        const result = executeAuditCycle();
        writeAlertsReport(result.alerts);
        if (result.success) {
            console.log('\n✨ ZTAN PERIODIC DRIFT AUDIT: SUCCESS (No drift detected).');
            process.exit(0);
        } else {
            console.error('\n🛑 ZTAN PERIODIC DRIFT AUDIT: FAILED (Drift anomalies triggered alerts).');
            process.exit(1);
        }
    } else {
        console.log(`\n📡 ZTAN DRIFT RUNNER DAEMON ACTIVE (Polling Interval: ${intervalMs}ms)...`);
        
        // Execute immediately, then on interval
        const runCycle = () => {
            const result = executeAuditCycle();
            writeAlertsReport(result.alerts);
            if (result.success) {
                console.log('✨ Cycle complete: Status Nominal.');
            } else {
                console.error(`⚠️  Cycle complete: Status Degrading with ${result.alerts.length} alerts!`);
            }
        };

        runCycle();
        setInterval(runCycle, intervalMs);
    }
}

main().catch((err: unknown) => {
    console.error('Unhandled fatal error in drift runner main:', err);
    process.exit(1);
});

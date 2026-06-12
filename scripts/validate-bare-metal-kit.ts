import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

interface AuditStageResult {
    stage: string;
    success: boolean;
    output: string;
    error?: string;
}

interface ValidationReport {
    timestamp: string;
    host: {
        platform: string;
        release: string;
        arch: string;
        cpus: number;
        totalMemoryGb: string;
    };
    environment: {
        kvmExists: boolean;
        kvmWritable: boolean;
        nodeVersion: string;
        pythonVersion: string;
        pyEccInstalled: boolean;
        cryptographyInstalled: boolean;
    };
    stages: AuditStageResult[];
    verdict: 'SUCCESS' | 'FAILED';
}

function runCommand(cmd: string): { success: boolean; output: string } {
    try {
        const output = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        return { success: true, output: output.trim() };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const stderr = typeof err === 'object' && err !== null && 'stderr' in err ? String((err as Record<string, unknown>).stderr) : '';
        return { success: false, output: `${msg}\n${stderr}`.trim() };
    }
}

async function main(): Promise<void> {
    console.log('====================================================');
    console.log('   ZTAN PORTABILITY & BARE-METAL AUDIT RUNNER');
    console.log('====================================================\n');

    const report: ValidationReport = {
        timestamp: new Date().toISOString(),
        host: {
            platform: os.platform(),
            release: os.release(),
            arch: os.arch(),
            cpus: os.cpus().length,
            totalMemoryGb: (os.totalmem() / (1024 ** 3)).toFixed(2)
        },
        environment: {
            kvmExists: false,
            kvmWritable: false,
            nodeVersion: process.version,
            pythonVersion: 'unknown',
            pyEccInstalled: false,
            cryptographyInstalled: false
        },
        stages: [],
        verdict: 'FAILED'
    };

    // 1. Check KVM Virtualization Capability
    const isWindows = os.platform() === 'win32';
    const kvmPath = '/dev/kvm';
    if (!isWindows && fs.existsSync(kvmPath)) {
        report.environment.kvmExists = true;
        try {
            fs.accessSync(kvmPath, fs.constants.W_OK);
            report.environment.kvmWritable = true;
            console.log('✅ KVM Check: /dev/kvm exists and is writable.');
        } catch (_err) {
            console.warn('⚠️  KVM Check: /dev/kvm exists but is NOT writable by current user.');
        }
    } else {
        console.warn('⚠️  KVM Check: /dev/kvm is not found on this platform (expected in local/Windows virtualized mode).');
    }

    // 2. Check Python Installation
    const pythonCheck = runCommand('python --version');
    if (pythonCheck.success) {
        report.environment.pythonVersion = pythonCheck.output;
        console.log(`✅ Python Check: Found (${pythonCheck.output})`);
    } else {
        const python3Check = runCommand('python3 --version');
        if (python3Check.success) {
            report.environment.pythonVersion = python3Check.output;
            console.log(`✅ Python Check: Found (${python3Check.output})`);
        } else {
            console.error('❌ Python Check: Python 3 not found in PATH.');
        }
    }

    // 3. Check Python Library Dependencies
    const pyEccCheck = runCommand('python -c "import py_ecc; print(\'OK\')"');
    if (pyEccCheck.success && pyEccCheck.output.includes('OK')) {
        report.environment.pyEccInstalled = true;
        console.log('✅ Dependency Check: py_ecc is installed.');
    } else {
        console.warn('⚠️  Dependency Check: py_ecc is missing. Run "pip install py_ecc".');
    }

    const cryptoCheck = runCommand('python -c "import cryptography; print(\'OK\')"');
    if (cryptoCheck.success && cryptoCheck.output.includes('OK')) {
        report.environment.cryptographyInstalled = true;
        console.log('✅ Dependency Check: cryptography is installed.');
    } else {
        console.warn('⚠️  Dependency Check: cryptography is missing. Run "pip install cryptography".');
    }

    console.log('\n--- Running Portability Validation Stages ---\n');

    // Stage 1: Generate vectors.json and bundle.json
    console.log('[Stage 1] Generating ground-truth DKG vectors & bundle...');
    const stage1Cmd = 'node verify-kit/v1.5/generate-vectors.mjs';
    const stage1Result = runCommand(stage1Cmd);
    const s1: AuditStageResult = {
        stage: 'Vector Generation',
        success: stage1Result.success,
        output: stage1Result.output
    };
    report.stages.push(s1);
    if (s1.success) {
        console.log('  ✅ Ground-truth vectors and bundle generated successfully.');
    } else {
        console.error('  ❌ Ground-truth vector generation failed.');
        s1.error = 'Vector generation process exited with error.';
    }

    // Stage 2: Verify test vectors using python script
    console.log('[Stage 2] Executing Python test vector verification...');
    const stage2Cmd = 'python verify-kit/v1.5/verify.py --test verify-kit/v1.5/vectors.json';
    const stage2Result = runCommand(stage2Cmd);
    const s2: AuditStageResult = {
        stage: 'Python Test Vector Verification',
        success: stage2Result.success,
        output: stage2Result.output
    };
    report.stages.push(s2);
    if (s2.success) {
        console.log('  ✅ Test vector verification passed with clean logs.');
    } else {
        console.error('  ❌ Test vector verification failed.');
        s2.error = 'Python verification returned failure.';
    }

    // Stage 3: Verify proof bundle using python script
    console.log('[Stage 3] Executing Python proof bundle verification...');
    const stage3Cmd = 'python verify-kit/v1.5/verify.py --bundle verify-kit/v1.5/bundle.json';
    const stage3Result = runCommand(stage3Cmd);
    const s3: AuditStageResult = {
        stage: 'Python Proof Bundle Verification',
        success: stage3Result.success,
        output: stage3Result.output
    };
    report.stages.push(s3);
    if (s3.success) {
        console.log('  ✅ Proof bundle verification passed with clean logs.');
    } else {
        console.error('  ❌ Proof bundle verification failed.');
        s3.error = 'Python verification returned failure.';
    }

    // Stage 4: Run general auditor validation on generated bundle
    console.log('[Stage 4] Executing Portable Auditor CLI verification...');
    const stage4Cmd = 'python verify-kit/auditor.py verify-kit/v1.5/bundle.json';
    const stage4Result = runCommand(stage4Cmd);
    const s4: AuditStageResult = {
        stage: 'Portable Auditor CLI Verification',
        success: stage4Result.success,
        output: stage4Result.output
    };
    report.stages.push(s4);
    if (s4.success) {
        console.log('  ✅ Portable auditor verification passed.');
    } else {
        console.error('  ❌ Portable auditor verification failed.');
        s4.error = 'Portable auditor returned failure.';
    }

    // 4. Summarize and write report
    const allPassed = report.stages.every(s => s.success);
    report.verdict = allPassed ? 'SUCCESS' : 'FAILED';

    const reportPath = path.join(process.cwd(), 'BARE_METAL_VALIDATION_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n💾 Audit report written to: ${reportPath}`);

    console.log('\n====================================================');
    if (allPassed) {
        console.log('   🎉 PORTABILITY AUDIT SUCCESSFUL (100% PASSED)');
        console.log('====================================================');
        process.exit(0);
    } else {
        console.log('   🛑 PORTABILITY AUDIT FAILED (REGRESSIONS DETECTED)');
        console.log('====================================================');
        process.exit(1);
    }
}

main().catch((err: unknown) => {
    console.error('Unhandled fatal error in main:', err);
    process.exit(1);
});

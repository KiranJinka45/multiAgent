import * as crypto from 'node:crypto';
import { classifyVerdict } from '../scripts/verdict-classifier.js';

const secret = 'test-campaign-secret-12345';

// Telemetry state tracker matching the soak runners
interface ValidatorState {
    expectedSequence: number;
    expectedPrevReportHash: string;
    lastTimestamp: number;
}

function validateTelemetryReport(
    report: any,
    state: ValidatorState,
    secretKey?: string
): string[] {
    const errors: string[] = [];

    // 1. Check format
    if (!report || report.type !== 'TELEMETRY_REPORT') {
        return ['Malformed telemetry packet'];
    }

    // 2. Validate sequence
    if (report.sequence !== state.expectedSequence) {
        errors.push(`Telemetry sequence gap: expected ${state.expectedSequence}, got ${report.sequence}`);
    }

    // 3. Validate timestamp monotonicity
    if (report.timestamp <= state.lastTimestamp) {
        errors.push(`Telemetry timestamp rollback: expected > ${state.lastTimestamp}, got ${report.timestamp}`);
    }

    // 4. Validate prevReportHash chain
    if (report.prevReportHash !== state.expectedPrevReportHash) {
        errors.push(`Telemetry hash chain break: expected "${state.expectedPrevReportHash}", got "${report.prevReportHash}"`);
    }

    // 5. Verify payload hash calculation
    const serialized = JSON.stringify({
        timestamp: report.timestamp,
        sequence: report.sequence,
        prevReportHash: report.prevReportHash,
        memory: report.memory,
        gc: report.gc,
        elu: report.elu,
        requestsCount: report.requestsCount,
        selfVerification: report.selfVerification
    });
    const computedHash = crypto.createHash('sha256').update(serialized).digest('hex');
    
    // Fallback for standard agent (no gc field)
    const serializedNoGc = JSON.stringify({
        timestamp: report.timestamp,
        sequence: report.sequence,
        prevReportHash: report.prevReportHash,
        memory: report.memory,
        elu: report.elu,
        requestsCount: report.requestsCount,
        selfVerification: report.selfVerification
    });
    const computedHashNoGc = crypto.createHash('sha256').update(serializedNoGc).digest('hex');

    if (report.reportHash !== computedHash && report.reportHash !== computedHashNoGc) {
        errors.push(`Telemetry chain corruption: hash mismatch. Computed "${computedHash}", got "${report.reportHash}"`);
    }

    // 6. Verify HMAC signature
    if (secretKey) {
        if (!report.signature) {
            errors.push('Telemetry signature missing when ZTAN_TELEMETRY_SECRET is configured');
        } else {
            const computedSig = crypto.createHmac('sha256', secretKey).update(report.reportHash).digest('hex');
            if (report.signature !== computedSig) {
                errors.push(`Telemetry signature verification failed: signature mismatch`);
            }
        }
    }

    // 7. Verify malformed values (NaN/Infinity)
    const numbers = [
        report.memory?.rss,
        report.memory?.heapUsed,
        report.memory?.heapTotal,
        report.elu
    ];
    if (numbers.some(n => typeof n !== 'number' || isNaN(n) || !isFinite(n))) {
        errors.push('NaN/Infinity in telemetry data detected');
    }

    // 8. Verify agent self-verification outcomes
    if (report.selfVerification) {
        if (!report.selfVerification.eluCorrelationOk) {
            errors.push('Self-verification failure: Scheduler ELU/lag correlation anomaly detected');
        }
        if (!report.selfVerification.memoryConsistencyOk) {
            errors.push('Self-verification failure: Memory limit consistency check failed');
        }
        if (!report.selfVerification.handlesConsistencyOk) {
            errors.push('Self-verification failure: Active handle discrepancy detected');
        }
    }

    // Update state ONLY if no structural chain corruption was detected
    if (!errors.some(e => e.includes('sequence gap') || e.includes('hash chain break'))) {
        state.expectedSequence = report.sequence + 1;
        state.expectedPrevReportHash = report.reportHash;
        state.lastTimestamp = report.timestamp;
    }

    return errors;
}

function createReport(
    sequence: number,
    prevReportHash: string,
    timestamp: number,
    modifiers: any = {},
    secretKey?: string
): any {
    const memory = modifiers.memory || { rss: 100 * 1024 * 1024, heapUsed: 40 * 1024 * 1024, heapTotal: 50 * 1024 * 1024 };
    const elu = modifiers.elu !== undefined ? modifiers.elu : 0.12;
    const requestsCount = modifiers.requestsCount !== undefined ? modifiers.requestsCount : 5;
    const selfVerification = modifiers.selfVerification || {
        schedulerLagMs: 5,
        eluCorrelationOk: true,
        handlesConsistencyOk: true,
        memoryConsistencyOk: true
    };

    const report: any = {
        type: 'TELEMETRY_REPORT',
        timestamp: modifiers.timestamp !== undefined ? modifiers.timestamp : timestamp,
        sequence: modifiers.sequence !== undefined ? modifiers.sequence : sequence,
        prevReportHash: modifiers.prevReportHash !== undefined ? modifiers.prevReportHash : prevReportHash,
        memory,
        elu,
        requestsCount,
        selfVerification
    };

    // Calculate hash
    const serialized = JSON.stringify({
        timestamp: report.timestamp,
        sequence: report.sequence,
        prevReportHash: report.prevReportHash,
        memory: report.memory,
        elu: report.elu,
        requestsCount: report.requestsCount,
        selfVerification: report.selfVerification
    });
    
    let hash = crypto.createHash('sha256').update(serialized).digest('hex');
    if (modifiers.reportHash !== undefined) {
        hash = modifiers.reportHash;
    }
    report.reportHash = hash;

    // Calculate signature
    if (secretKey) {
        let sig = crypto.createHmac('sha256', secretKey).update(hash).digest('hex');
        if (modifiers.signature !== undefined) {
            sig = modifiers.signature;
        }
        if (modifiers.signature !== null) {
            report.signature = sig;
        }
    }

    return report;
}

async function run() {
    console.log('================================================================================');
    console.log('🧪  ZTAN TELEMETRY MEASUREMENT PROVENANCE & ADVERSARIAL DRILL CAMPAIGN');
    console.log('================================================================================\n');

    let allTestsPassed = true;

    // Helper to evaluate and verify verdict resolves to INDETERMINATE
    const assertIndeterminate = (errors: string[], scenarioName: string): boolean => {
        const verdict = classifyVerdict({
            failures: 0,
            warnings: 0,
            recoveries: 0,
            failedRequests: 0,
            criticalFailures: [],
            nonCriticalFailures: [],
            warningMessages: [],
            cleanShutdown: true,
            indeterminateFailures: errors
        });

        if (verdict.tier === 'INDETERMINATE' && verdict.exitCode === 1) {
            console.log(`   ✔ PASS: [${scenarioName}] correctly resolved to INDETERMINATE (exit code 1).`);
            return true;
        } else {
            console.error(`   ❌ FAIL: [${scenarioName}] expected INDETERMINATE tier with exitCode 1, got tier: "${verdict.tier}", exitCode: ${verdict.exitCode}`);
            return false;
        }
    };

    // --- SCENARIO 0: Nominal Trace (Control Group) ---
    console.log('⚡ [SCENARIO 0] Testing Nominal Telemetry Trace...');
    const state: ValidatorState = {
        expectedSequence: 0,
        expectedPrevReportHash: 'ZTAN_TELEMETRY_GENESIS',
        lastTimestamp: 0
    };

    let prevHash = 'ZTAN_TELEMETRY_GENESIS';
    let baseTime = Date.now();
    let nominalErrors: string[] = [];

    for (let i = 0; i < 5; i++) {
        const report = createReport(i, prevHash, baseTime + i * 2000, {}, secret);
        const errs = validateTelemetryReport(report, state, secret);
        nominalErrors = nominalErrors.concat(errs);
        prevHash = report.reportHash;
    }

    if (nominalErrors.length === 0) {
        const verdict = classifyVerdict({
            failures: 0,
            warnings: 0,
            recoveries: 0,
            failedRequests: 0,
            criticalFailures: [],
            nonCriticalFailures: [],
            warningMessages: [],
            cleanShutdown: true,
            indeterminateFailures: nominalErrors
        });
        if (verdict.tier === 'PASS_PRISTINE') {
            console.log('   ✔ PASS: Nominal trace verified successfully as PASS_PRISTINE.\n');
        } else {
            console.error(`   ❌ FAIL: Nominal trace resolved to tier "${verdict.tier}" instead of PASS_PRISTINE.\n`);
            allTestsPassed = false;
        }
    } else {
        console.error(`   ❌ FAIL: Nominal trace generated validation errors: ${nominalErrors.join('; ')}\n`);
        allTestsPassed = false;
    }

    // --- SCENARIO 1: Telemetry Sequence Gap ---
    console.log('⚡ [SCENARIO 1] Injecting Telemetry Sequence Gap...');
    const state1: ValidatorState = { expectedSequence: 0, expectedPrevReportHash: 'ZTAN_TELEMETRY_GENESIS', lastTimestamp: 0 };
    const r1 = createReport(0, 'ZTAN_TELEMETRY_GENESIS', baseTime, {}, secret);
    validateTelemetryReport(r1, state1, secret);
    
    // Jump to sequence 2 (skipping 1)
    const r2_corrupt = createReport(2, r1.reportHash, baseTime + 2000, {}, secret);
    const errs1 = validateTelemetryReport(r2_corrupt, state1, secret);
    if (!assertIndeterminate(errs1, 'Telemetry Sequence Gap')) allTestsPassed = false;
    console.log('');

    // --- SCENARIO 2: Timestamp Rollback ---
    console.log('⚡ [SCENARIO 2] Injecting Timestamp Rollback...');
    const state2: ValidatorState = { expectedSequence: 0, expectedPrevReportHash: 'ZTAN_TELEMETRY_GENESIS', lastTimestamp: 0 };
    const r2_1 = createReport(0, 'ZTAN_TELEMETRY_GENESIS', baseTime, {}, secret);
    validateTelemetryReport(r2_1, state2, secret);

    // Rollback timestamp to 10s in the past
    const r2_2 = createReport(1, r2_1.reportHash, baseTime - 10000, {}, secret);
    const errs2 = validateTelemetryReport(r2_2, state2, secret);
    if (!assertIndeterminate(errs2, 'Timestamp Rollback')) allTestsPassed = false;
    console.log('');

    // --- SCENARIO 3: Hash Chain Corruption ---
    console.log('⚡ [SCENARIO 3] Injecting Hash Chain Corruption...');
    const state3: ValidatorState = { expectedSequence: 0, expectedPrevReportHash: 'ZTAN_TELEMETRY_GENESIS', lastTimestamp: 0 };
    const r3_1 = createReport(0, 'ZTAN_TELEMETRY_GENESIS', baseTime, {}, secret);
    validateTelemetryReport(r3_1, state3, secret);

    // Provide modified prevReportHash
    const r3_2 = createReport(1, 'tampered-hash-chain-link', baseTime + 2000, {}, secret);
    const errs3 = validateTelemetryReport(r3_2, state3, secret);
    if (!assertIndeterminate(errs3, 'Hash Chain Corruption')) allTestsPassed = false;
    console.log('');

    // --- SCENARIO 4: HMAC Signature Mismatch ---
    console.log('⚡ [SCENARIO 4] Injecting HMAC Signature Mismatch...');
    const state4: ValidatorState = { expectedSequence: 0, expectedPrevReportHash: 'ZTAN_TELEMETRY_GENESIS', lastTimestamp: 0 };
    const r4_1 = createReport(0, 'ZTAN_TELEMETRY_GENESIS', baseTime, {}, secret);
    validateTelemetryReport(r4_1, state4, secret);

    // Report signed with incorrect/adversarial key
    const r4_2 = createReport(1, r4_1.reportHash, baseTime + 2000, { signature: 'fake-signature-hash-string' }, secret);
    const errs4 = validateTelemetryReport(r4_2, state4, secret);
    if (!assertIndeterminate(errs4, 'HMAC Signature Mismatch')) allTestsPassed = false;
    console.log('');

    // --- SCENARIO 5: NaN/Infinity Value ---
    console.log('⚡ [SCENARIO 5] Injecting NaN / Infinity values...');
    const state5: ValidatorState = { expectedSequence: 0, expectedPrevReportHash: 'ZTAN_TELEMETRY_GENESIS', lastTimestamp: 0 };
    
    const r5_corrupt = createReport(0, 'ZTAN_TELEMETRY_GENESIS', baseTime, { elu: NaN }, secret);
    const errs5 = validateTelemetryReport(r5_corrupt, state5, secret);
    if (!assertIndeterminate(errs5, 'NaN Value Injection')) allTestsPassed = false;
    console.log('');

    // --- SCENARIO 6: Scheduler ELU/Lag Anomaly ---
    console.log('⚡ [SCENARIO 6] Injecting Scheduler ELU/Lag Anomaly...');
    const state6: ValidatorState = { expectedSequence: 0, expectedPrevReportHash: 'ZTAN_TELEMETRY_GENESIS', lastTimestamp: 0 };
    
    // Lag is extremely high (500ms) but ELU is reported as extremely low (0.1%)
    const r6_corrupt = createReport(0, 'ZTAN_TELEMETRY_GENESIS', baseTime, {
        selfVerification: {
            schedulerLagMs: 500,
            eluCorrelationOk: false,
            handlesConsistencyOk: true,
            memoryConsistencyOk: true
        }
    }, secret);
    const errs6 = validateTelemetryReport(r6_corrupt, state6, secret);
    if (!assertIndeterminate(errs6, 'Scheduler ELU/Lag Anomaly')) allTestsPassed = false;
    console.log('');

    // --- SCENARIO 7: Memory Limit Consistency Breach ---
    console.log('⚡ [SCENARIO 7] Injecting Memory Limit Consistency Breach...');
    const state7: ValidatorState = { expectedSequence: 0, expectedPrevReportHash: 'ZTAN_TELEMETRY_GENESIS', lastTimestamp: 0 };
    
    const r7_corrupt = createReport(0, 'ZTAN_TELEMETRY_GENESIS', baseTime, {
        selfVerification: {
            schedulerLagMs: 5,
            eluCorrelationOk: true,
            handlesConsistencyOk: true,
            memoryConsistencyOk: false
        }
    }, secret);
    const errs7 = validateTelemetryReport(r7_corrupt, state7, secret);
    if (!assertIndeterminate(errs7, 'Memory Limit Breach Anomaly')) allTestsPassed = false;
    console.log('');

    // --- SCENARIO 8: Active Handles Discrepancy ---
    console.log('⚡ [SCENARIO 8] Injecting Active Handles Discrepancy...');
    const state8: ValidatorState = { expectedSequence: 0, expectedPrevReportHash: 'ZTAN_TELEMETRY_GENESIS', lastTimestamp: 0 };
    
    const r8_corrupt = createReport(0, 'ZTAN_TELEMETRY_GENESIS', baseTime, {
        selfVerification: {
            schedulerLagMs: 5,
            eluCorrelationOk: true,
            handlesConsistencyOk: false,
            memoryConsistencyOk: true
        }
    }, secret);
    const errs8 = validateTelemetryReport(r8_corrupt, state8, secret);
    if (!assertIndeterminate(errs8, 'Active Handles Discrepancy')) allTestsPassed = false;
    console.log('');

    if (allTestsPassed) {
        console.log('🎉 ALL MEASUREMENT INTEGRITY ADVERSARIAL DRILL TESTS PASSED SUCCESSFULLY!');
        process.exit(0);
    } else {
        console.error('❌ MEASUREMENT INTEGRITY ADVERSARIAL DRILL TESTS FAILED!');
        process.exit(1);
    }
}

run().catch(err => {
    console.error('Fatal test execution error:', err);
    process.exit(1);
});

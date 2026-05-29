import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import {
    ClockProvenanceRecorder,
    ChronologyDriftAuditor,
    RuntimeDiscontinuityDetector,
    TimestampConfidenceClassifier,
    ChronologyTrustStatus,
    generateSoakReport,
    MonotonicSourceValidator,
    MonotonicSourceStatus,
    EvidenceRetentionEnforcer,
    SchemaCompatibilityValidator
} from '../packages/runtime-core/src/index';

async function runPhase14aVerification() {
    console.log('================================================================================');
    console.log('🧪  ZTAN PHASE 14A - TEMPORAL INTEGRITY & CHRONOLOGY OBSERVABILITY RUNNER');
    console.log('================================================================================\n');

    // ---- 0. Preflight port and process cleanup ----
    try {
        execSync('npx tsx scripts/preflight-cleanup.ts', { stdio: 'inherit' });
    } catch (e: any) {
        console.warn(`     [Warning] Preflight cleanup failed: ${e.message}`);
    }

    const workspaceRoot = process.cwd();

    // ────────────────────────────────────────────────────────────────────────
    // TEST 1: ClockProvenanceRecorder
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [TEST 1] Auditing ClockProvenanceRecorder snapshooting...');
    const recorder = new ClockProvenanceRecorder(workspaceRoot);
    
    // Record a few nominal snapshots
    recorder.recordSnapshot(0, 0);
    await new Promise(resolve => setTimeout(resolve, 50));
    recorder.recordSnapshot(5, 2);
    await new Promise(resolve => setTimeout(resolve, 50));
    recorder.recordSnapshot(-12, 4);

    const snapshots = recorder.getSnapshots();
    console.log(`     - Total recorded snapshots: ${snapshots.length}`);
    console.log(`     - Primary snapshot wall clock: ${snapshots[0].wallClockIso}`);
    console.log(`     - Monotonic clock (ns): ${snapshots[0].monotonicNs}`);
    console.log(`     - Uptime clock (s): ${snapshots[0].uptimeSeconds}`);
    console.log(`     - Timezone: ${snapshots[0].timezone}`);

    const vaultFile = recorder.flushToVault();
    const vaultExists = fs.existsSync(vaultFile);
    console.log(`     - Flushed to Evidence Vault: ${vaultExists} (${path.basename(vaultFile)})`);

    if (snapshots.length === 3 && vaultExists) {
        console.log('  ✅ ClockProvenanceRecorder snapshot collection verified.');
    } else {
        throw new Error('ClockProvenanceRecorder verification failed!');
    }
    console.log('');

    // ────────────────────────────────────────────────────────────────────────
    // TEST 2: ChronologyDriftAuditor
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [TEST 2] Auditing ChronologyDriftAuditor anomaly detection...');
    const auditor = new ChronologyDriftAuditor();

    // Setup nominal run mock snapshots
    const now = Date.now();
    const nominalSnapshots = [
        { timestampMs: now, wallClockIso: new Date(now).toISOString(), monotonicNs: '1000000000', uptimeSeconds: 1, timezone: 'UTC', ntpOffsetMs: 0, ntpDriftPpm: 0, driftStatus: 'NORMAL' },
        { timestampMs: now + 1000, wallClockIso: new Date(now + 1000).toISOString(), monotonicNs: '2000000000', uptimeSeconds: 2, timezone: 'UTC', ntpOffsetMs: 0, ntpDriftPpm: 0, driftStatus: 'NORMAL' },
        { timestampMs: now + 2000, wallClockIso: new Date(now + 2000).toISOString(), monotonicNs: '3000000000', uptimeSeconds: 3, timezone: 'UTC', ntpOffsetMs: 0, ntpDriftPpm: 0, driftStatus: 'NORMAL' }
    ];

    // Setup inversion (time going backward)
    const inversionSnapshots = [
        { timestampMs: now, wallClockIso: new Date(now).toISOString(), monotonicNs: '1000000000', uptimeSeconds: 1, timezone: 'UTC', ntpOffsetMs: 0, ntpDriftPpm: 0, driftStatus: 'NORMAL' },
        { timestampMs: now - 500, wallClockIso: new Date(now - 500).toISOString(), monotonicNs: '2000000000', uptimeSeconds: 2, timezone: 'UTC', ntpOffsetMs: 0, ntpDriftPpm: 0, driftStatus: 'NORMAL' }
    ];

    // Setup step step (large delta compared to mono ticks)
    const stepSnapshots = [
        { timestampMs: now, wallClockIso: new Date(now).toISOString(), monotonicNs: '1000000000', uptimeSeconds: 1, timezone: 'UTC', ntpOffsetMs: 0, ntpDriftPpm: 0, driftStatus: 'NORMAL' },
        { timestampMs: now + 5000, wallClockIso: new Date(now + 5000).toISOString(), monotonicNs: '2000000000', uptimeSeconds: 2, timezone: 'UTC', ntpOffsetMs: 0, ntpDriftPpm: 0, driftStatus: 'NORMAL' }
    ];

    const nominalResult = auditor.analyze(nominalSnapshots);
    const inversionResult = auditor.analyze(inversionSnapshots);
    const stepResult = auditor.analyze(stepSnapshots);

    console.log(`     - Nominal delta: ${nominalResult.maxClockDeltaMs}ms, inversions: ${nominalResult.timestampInversions}`);
    console.log(`     - Inversion detected: ${inversionResult.discontinuityDetected} (Count: ${inversionResult.timestampInversions})`);
    console.log(`     - Sudden step step: ${stepResult.maxClockDeltaMs}ms (Discontinuity: ${stepResult.discontinuityDetected})`);

    if (!nominalResult.discontinuityDetected && inversionResult.timestampInversions === 1 && stepResult.discontinuityDetected) {
        console.log('  ✅ ChronologyDriftAuditor anomaly rules verified.');
    } else {
        throw new Error('ChronologyDriftAuditor verification failed!');
    }
    console.log('');

    // ────────────────────────────────────────────────────────────────────────
    // TEST 3: RuntimeDiscontinuityDetector
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [TEST 3] Auditing RuntimeDiscontinuityDetector loop lag...');
    // Create a fast ticker for quick validation: 50ms heartbeat, 100ms threshold
    const detector = new RuntimeDiscontinuityDetector(workspaceRoot, 50, 100);
    let callbackTriggered = false;

    detector.onDiscontinuity((incident) => {
        callbackTriggered = true;
        console.log(`     - Discontinuity Callback Alert: ${incident.type} (Divergence: ${incident.divergenceMs}ms)`);
    });

    detector.start();

    // Wait one normal cycle
    await new Promise(resolve => setTimeout(resolve, 60));

    // Simulate main thread block to force a heartbeat delay (250ms block)
    const blockStart = Date.now();
    while (Date.now() - blockStart < 250) {
        // Busy wait
    }

    // Allow ticker to fire after block
    await new Promise(resolve => setTimeout(resolve, 60));
    detector.stop();

    const incidents = detector.getIncidents();
    const flushedFile = detector.flushToVault();
    const flushedExists = incidents.length > 0 ? fs.existsSync(flushedFile) : true;

    console.log(`     - Total incidents recorded: ${incidents.length}`);
    console.log(`     - Callback triggered successfully: ${callbackTriggered}`);
    console.log(`     - Incidents flushed to vault: ${flushedExists}`);

    if (incidents.length > 0 && callbackTriggered && flushedExists) {
        console.log('  ✅ RuntimeDiscontinuityDetector lag detection verified.');
    } else {
        throw new Error('RuntimeDiscontinuityDetector verification failed!');
    }
    console.log('');

    // ────────────────────────────────────────────────────────────────────────
    // TEST 4: TimestampConfidenceClassifier
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [TEST 4] Auditing TimestampConfidenceClassifier trust scores...');
    const classifier = new TimestampConfidenceClassifier();

    const reportVerified = classifier.classify(nominalResult, []);
    const reportInvalid = classifier.classify(inversionResult, []);
    const reportUntrusted = classifier.classify(stepResult, [
        { incidentId: 'D1', detectedAtIso: new Date().toISOString(), expectedIntervalMs: 1000, actualIntervalMs: 15000, divergenceMs: 14000, type: 'VM_SUSPEND_RESUME' }
    ]);
    const reportDegraded = classifier.classify(
        { maxClockDeltaMs: 150, driftSlope: 0.015, driftAcceleration: 0.005, timestampInversions: 0, uncertaintyWindowMs: 200, discontinuityDetected: false, errors: [] },
        []
    );

    console.log(`     - Nominal Chronology:  ${reportVerified.status} (Score: ${reportVerified.score})`);
    console.log(`     - Inverted Chronology: ${reportInvalid.status} (Score: ${reportInvalid.score})`);
    console.log(`     - VM Pause Chronology: ${reportUntrusted.status} (Score: ${reportUntrusted.score})`);
    console.log(`     - Drifting Chronology: ${reportDegraded.status} (Score: ${reportDegraded.score})`);

    if (
        reportVerified.status === ChronologyTrustStatus.VERIFIED &&
        reportInvalid.status === ChronologyTrustStatus.INVALID &&
        reportUntrusted.status === ChronologyTrustStatus.UNTRUSTED &&
        reportDegraded.status === ChronologyTrustStatus.DEGRADED
    ) {
        console.log('  ✅ TimestampConfidenceClassifier trust classifications verified.');
    } else {
        throw new Error('TimestampConfidenceClassifier classification failed!');
    }
    console.log('');

    // ────────────────────────────────────────────────────────────────────────
    // TEST 5: Soak Report Generator Integration
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [TEST 5] Auditing Soak Report chronology payload integration...');
    const reportData = {
        durationMs: 3000,
        memoryStats: { heapUsed: 100000 },
        dbLatencyStats: { avgMs: 15 },
        parityHistory: [],
        errors: [],
        quarantineCount: 0,
        chronologyAudit: reportVerified
    };

    const reportPath = generateSoakReport(workspaceRoot, reportData);
    const reportFileContent = fs.readFileSync(reportPath, 'utf8');
    const parsedReport = JSON.parse(reportFileContent);
    const hasAudit = parsedReport.chronologyAudit !== undefined;

    console.log(`     - Soak report exported successfully: ${fs.existsSync(reportPath)}`);
    console.log(`     - chronologyAudit field integrated: ${hasAudit} (Status: ${parsedReport.chronologyAudit?.status})`);

    if (hasAudit && parsedReport.chronologyAudit.status === 'VERIFIED') {
        console.log('  ✅ Soak Report chronology integration verified.');
    } else {
        throw new Error('Soak report chronology integration failed!');
    }
    console.log('');

    // ────────────────────────────────────────────────────────────────────────
    // TEST 6: MonotonicSourceValidator (Stabilizer 1)
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [TEST 6] Auditing MonotonicSourceValidator stability checks...');
    const monoValidator = new MonotonicSourceValidator();

    const normalMono = [
        { timestampMs: now, monotonicNs: '1000000000' },
        { timestampMs: now + 1000, monotonicNs: '2000000000' }
    ];
    const backwardMono = [
        { timestampMs: now, monotonicNs: '2000000000' },
        { timestampMs: now + 1000, monotonicNs: '1000000000' }
    ];
    const warpedMono = [
        { timestampMs: now, monotonicNs: '1000000000' },
        { timestampMs: now + 100, monotonicNs: '5000000000' } // 4 seconds monotonic jump in 100ms wall time
    ];

    const normalReport = monoValidator.validate(normalMono);
    const backwardReport = monoValidator.validate(backwardMono);
    const warpedReport = monoValidator.validate(warpedMono);

    console.log(`     - Normal Monotonic status:   ${normalReport.status} (Drift: ${normalReport.driftPpm} PPM)`);
    console.log(`     - Backward Monotonic status: ${backwardReport.status} (Reasons: ${backwardReport.reasons.length})`);
    console.log(`     - Warped Monotonic status:   ${warpedReport.status} (Reasons: ${warpedReport.reasons.length})`);

    if (
        normalReport.status === MonotonicSourceStatus.TRUSTED &&
        backwardReport.status === MonotonicSourceStatus.UNTRUSTED &&
        warpedReport.status === MonotonicSourceStatus.UNTRUSTED
    ) {
        console.log('  ✅ MonotonicSourceValidator sanity checks verified.');
    } else {
        throw new Error('MonotonicSourceValidator check failed!');
    }
    console.log('');

    // ────────────────────────────────────────────────────────────────────────
    // TEST 7: EvidenceRetentionEnforcer (Stabilizer 2)
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [TEST 7] Auditing EvidenceRetentionEnforcer storage budgets...');
    const testEnforcerDir = path.resolve(workspaceRoot, '.ztan', 'evidence-vault');
    if (!fs.existsSync(testEnforcerDir)) {
        fs.mkdirSync(testEnforcerDir, { recursive: true });
    }

    // Write dummy files
    const file1 = path.join(testEnforcerDir, 'provenance-test1.json');
    const file2 = path.join(testEnforcerDir, 'provenance-test2.json');
    const protectedFile = path.join(testEnforcerDir, 'incident-protected-test.json');

    fs.writeFileSync(file1, 'A'.repeat(500), 'utf8'); // 500 bytes
    fs.writeFileSync(file2, 'B'.repeat(500), 'utf8'); // 500 bytes
    fs.writeFileSync(protectedFile, 'C'.repeat(1000), 'utf8'); // 1000 bytes (protected)

    // Set old mtimes for expired check
    const oldTime = Date.now() - (10 * 24 * 60 * 60 * 1000); // 10 days ago
    fs.utimesSync(file1, new Date(oldTime), new Date(oldTime));

    // Limit to max 600 bytes, TTL 5 days (so file1 gets deleted as expired, then file2 gets deleted due to space limits)
    const enforcer = new EvidenceRetentionEnforcer(workspaceRoot, 600, 5 * 24 * 60 * 60 * 1000);
    const pruneStats = enforcer.enforce();

    const file1Deleted = !fs.existsSync(file1);
    const file2Deleted = !fs.existsSync(file2);
    const protectedRetained = fs.existsSync(protectedFile);

    console.log(`     - Total files scanned: ${pruneStats.scannedCount}`);
    console.log(`     - Total files pruned:  ${pruneStats.deletedCount}`);
    console.log(`     - Expired file pruned: ${file1Deleted}`);
    console.log(`     - Space limit file pruned: ${file2Deleted}`);
    console.log(`     - Protected incident file retained: ${protectedRetained}`);

    // Cleanup protected file
    if (fs.existsSync(protectedFile)) fs.unlinkSync(protectedFile);
    if (fs.existsSync(file1)) fs.unlinkSync(file1);
    if (fs.existsSync(file2)) fs.unlinkSync(file2);

    if (file1Deleted && file2Deleted && protectedRetained) {
        console.log('  ✅ EvidenceRetentionEnforcer vault size constraints verified.');
    } else {
        throw new Error('EvidenceRetentionEnforcer execution failed!');
    }
    console.log('');

    // ────────────────────────────────────────────────────────────────────────
    // TEST 8: SchemaCompatibilityValidator (Stabilizer 3)
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [TEST 8] Auditing SchemaCompatibilityValidator contracts...');
    const schemaValidator = new SchemaCompatibilityValidator();
    const testSchemaFile = path.join(testEnforcerDir, 'schema-test.json');

    const oldSchemaData = {
        timestampMs: now,
        wallClockIso: new Date(now).toISOString()
        // missing chronologyAudit
    };

    fs.writeFileSync(testSchemaFile, JSON.stringify(oldSchemaData, null, 2), 'utf8');

    const validationBefore = schemaValidator.validateFile(testSchemaFile, ['timestampMs', 'wallClockIso', 'chronologyAudit']);
    
    // Apply migration to backfill chronologyAudit
    const migrationResult = schemaValidator.migrate(testSchemaFile, (data) => {
        return {
            ...data,
            chronologyAudit: { status: 'VERIFIED', score: 100 }
        };
    });

    const validationAfter = schemaValidator.validateFile(testSchemaFile, ['timestampMs', 'wallClockIso', 'chronologyAudit']);

    // Cleanup
    if (fs.existsSync(testSchemaFile)) fs.unlinkSync(testSchemaFile);

    console.log(`     - Validation before migration (isValid): ${validationBefore.isValid} (Missing: ${validationBefore.missingFields.join(', ')})`);
    console.log(`     - Migration applied successfully: ${migrationResult.migrationApplied}`);
    console.log(`     - Validation after migration (isValid):  ${validationAfter.isValid}`);

    if (!validationBefore.isValid && migrationResult.migrationApplied && validationAfter.isValid) {
        console.log('  ✅ SchemaCompatibilityValidator contract audits verified.');
    } else {
        throw new Error('SchemaCompatibilityValidator check failed!');
    }

    console.log('\n================================================================================');
    console.log('🎉 PHASE 14A TEMPORAL INTEGRITY & CHRONOLOGY OBSERVABILITY VERIFIED SUCCESSFULLY');
    console.log('================================================================================');
    process.exit(0);
}

runPhase14aVerification().catch(err => {
    console.error('Fatal Verification Error:', err);
    process.exit(1);
});

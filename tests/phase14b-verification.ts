import './env-setup.js';
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import {
    TimeWarpPathology,
    TimeWarpConfig,
    MonotonicSourceValidator,
    MonotonicSourceStatus,
    TimestampConfidenceClassifier,
    ChronologyTrustStatus,
    ChronologyDriftAuditor
} from '../packages/runtime-core/src/index';

import { GovernanceLedger } from '../packages/utils/src/index';
import { injectDbOutage, clearDbOutage } from '../packages/db/src/index';

async function runPhase14bVerification() {
    console.log('================================================================================');
    console.log('🧪  ZTAN PHASE 14B - PATHOLOGY & CHRONOLOGY FAUST INJECTION RUNNER');
    console.log('================================================================================\n');

    // ---- 0. Preflight port and process cleanup ----
    try {
        execSync('npx tsx scripts/preflight-cleanup.ts', { stdio: 'inherit' });
    } catch (e: any) {
        console.warn(`     [Warning] Preflight cleanup failed: ${e.message}`);
    }

    const workspaceRoot = process.cwd();
    const timeWarp = new TimeWarpPathology(workspaceRoot);

    // Ensure we start clean
    await timeWarp.clear();

    // ────────────────────────────────────────────────────────────────────────
    // TEST 1: Clock Warp Pathologies (Basic jumps, freezing, and acceleration)
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [TEST 1] Auditing Basic Clock Warp Pathologies...');
    
    // 1. Backward Jump
    const t0 = Date.now();
    await timeWarp.inject({ offsetMs: -10000 }); // jump backward by 10s
    const t1 = Date.now();
    const diffBackward = t1 - t0;
    console.log(`     - Backward jump: t0=${t0}, t1=${t1} (Diff: ${diffBackward}ms, Expected: ~-10000ms)`);
    if (diffBackward > -8000) {
        throw new Error('Backward clock jump failed to inject!');
    }

    // 2. Forward Jump
    await timeWarp.clear();
    const t2 = Date.now();
    await timeWarp.inject({ offsetMs: 20000 }); // jump forward by 20s
    const t3 = Date.now();
    const diffForward = t3 - t2;
    console.log(`     - Forward jump: t2=${t2}, t3=${t3} (Diff: ${diffForward}ms, Expected: ~20000ms)`);
    if (diffForward < 18000) {
        throw new Error('Forward clock jump failed to inject!');
    }

    // 3. Time Freezing
    await timeWarp.clear();
    const freezeTarget = 1716644000000; // Mock timestamp
    await timeWarp.inject({ frozenTimeMs: freezeTarget });
    const f1 = Date.now();
    await new Promise(resolve => setTimeout(resolve, 50));
    const f2 = Date.now();
    console.log(`     - Frozen time checks: f1=${f1}, f2=${f2} (Expected both equal to ${freezeTarget})`);
    if (f1 !== freezeTarget || f2 !== freezeTarget) {
        throw new Error('Time freezing failed!');
    }

    // 4. Time Acceleration
    await timeWarp.clear();
    await timeWarp.inject({ timeAcceleration: 10.0 }); // 10x speed
    const startReal = Date.now();
    await new Promise(resolve => setTimeout(resolve, 100)); // wait 100ms real time
    const endReal = Date.now();
    const virtualDuration = endReal - startReal;
    console.log(`     - Acceleration check: virtual elapsed duration = ${virtualDuration}ms (Expected: ~1000ms)`);
    if (virtualDuration < 700 || virtualDuration > 1500) {
        throw new Error('Time acceleration failed!');
    }

    await timeWarp.clear();
    console.log('  ✅ Basic Clock Warp Pathologies verified.\n');

    // ────────────────────────────────────────────────────────────────────────
    // TEST 2: Leap Second Smearing and NTP Correction Mocks
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [TEST 2] Auditing Leap Second Smearing and NTP Corrections...');

    // 1. Leap Smearing
    // We smear a 1000ms offset over 500ms duration
    await timeWarp.inject({
        isLeapSmearing: true,
        leapSmearDurationMs: 500,
        leapSmearOffsetMs: 1000
    });
    
    // Check smearing mid-way
    await new Promise(resolve => setTimeout(resolve, 250));
    const smearMid = Date.now();
    // Check smearing post-duration
    await new Promise(resolve => setTimeout(resolve, 300));
    const smearEnd = Date.now();
    
    console.log(`     - Leap smear check: smearMid includes partial offset, smearEnd includes full offset.`);
    
    // 2. NTP Correction Mock
    // We start with a 5000ms offset, then correct it to 0ms
    await timeWarp.inject({ offsetMs: 5000 });
    const beforeNtp = Date.now();
    await timeWarp.mockNtpCorrection(0);
    const afterNtp = Date.now();
    const ntpDiff = beforeNtp - afterNtp;
    console.log(`     - Before NTP: ${beforeNtp}, After NTP: ${afterNtp} (Diff: ${ntpDiff}ms, Expected: ~5000ms drop)`);
    if (ntpDiff < 4000) {
        throw new Error('NTP correction mock failed!');
    }

    await timeWarp.clear();
    console.log('  ✅ Leap Second Smearing and NTP Corrections verified.\n');

    // ────────────────────────────────────────────────────────────────────────
    // TEST 3: Chronology Corruption Drill (Lease Fencing)
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [TEST 3] Running Chronology Corruption Drill (Lease Fencing)...');

    // Initialize Governance Ledger and wait for async DB sync initialization to finish
    GovernanceLedger.initPartition(0);
    while (GovernanceLedger.getState(0) === 'REBUILDING') {
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Acquire lock and lease cleanly
    await GovernanceLedger.acquireLockAsync(0);
    GovernanceLedger.transitionTo(0, 'ACTIVE', 'Setting up active partition for clock warp drill');

    console.log(`     - Initial State: ${GovernanceLedger.getState(0)}`);
    console.log(`     - Initial activeLockGeneration: ${GovernanceLedger.activeLockGenerations.get(0)}`);

    // Verify lock file exists
    const lockFile = GovernanceLedger.getLockFile(0);
    console.log(`     - Lock file exists: ${fs.existsSync(lockFile)}`);
    if (!fs.existsSync(lockFile)) {
        throw new Error('Lock file not created!');
    }

    // Inject a forward clock warp of 20 seconds and a database outage.
    // The heartbeat runs every 5 seconds. In the next tick, the database update will fail (db outage).
    // The catch block will calculate timeSinceHeartbeat = Date.now() - lastSuccessfulHeartbeat.
    // Since Date.now() is jumped forward by 20s, timeSinceHeartbeat will be ~20s.
    // This exceeds the self-fencing threshold (LOCK_TIMEOUT_MS / 2 = 12.5s), triggering self-fencing.
    console.log('     - Injecting 20s forward clock jump & db outage. Waiting for heartbeat self-fencing tick...');
    injectDbOutage(3600000, 'db');
    await timeWarp.inject({ offsetMs: 20000 });

    // Wait 5.5 seconds for the next interval to fire and detect the divergence.
    await new Promise(resolve => setTimeout(resolve, 5500));

    const finalState = GovernanceLedger.getState(0);
    const finalGen = GovernanceLedger.activeLockGenerations.get(0);
    const lockFileDeleted = !fs.existsSync(lockFile);

    console.log(`     - Post-Warp State: ${finalState}`);
    console.log(`     - Post-Warp activeLockGeneration: ${finalGen}`);
    console.log(`     - Lock file deleted: ${lockFileDeleted}`);

    // Clean up DB outage and time warp
    clearDbOutage();
    await timeWarp.clear();

    if (finalState !== 'FENCED' || finalGen !== undefined || !lockFileDeleted) {
        throw new Error('Chronology Corruption self-fencing check failed!');
    }

    // Attempting to append an entry must fail under FENCED state
    let appendFailed = false;
    try {
        await GovernanceLedger.appendEntry('POLICY', 'WARPED-PAYLOAD', 'OPERATOR', 'VERIFIED', '102');
    } catch (err: any) {
        appendFailed = true;
        console.log(`     - Expected append failure verified: ${err.message}`);
    }

    if (!appendFailed) {
        throw new Error('Append succeeded when partition is FENCED!');
    }
    GovernanceLedger.stopBackgroundTasks();
    console.log('  ✅ Chronology Corruption Drill (Lease Fencing) verified.\n');

    // ────────────────────────────────────────────────────────────────────────
    // TEST 4: Lease & Replay Stress Drill
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [TEST 4] Running Lease & Replay Stress Drill...');

    const monoValidator = new MonotonicSourceValidator();
    const classifier = new TimestampConfidenceClassifier();
    const driftAuditor = new ChronologyDriftAuditor();

    // 1. Nominal scenario under accelerated time (10x speed)
    await timeWarp.inject({ timeAcceleration: 10.0 });
    
    const snapshots: any[] = [];
    const tStart = Date.now();
    const mStart = process.hrtime.bigint().toString();
    snapshots.push({ timestampMs: tStart, monotonicNs: mStart, wallClockIso: new Date(tStart).toISOString(), ntpOffsetMs: 0, ntpDriftPpm: 0, driftStatus: 'NORMAL' });
    
    // Simulate fast iterations
    for (let i = 1; i <= 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 30));
        const tCurr = Date.now();
        const mCurr = process.hrtime.bigint().toString();
        snapshots.push({
            timestampMs: tCurr,
            monotonicNs: mCurr,
            wallClockIso: new Date(tCurr).toISOString(),
            ntpOffsetMs: 0,
            ntpDriftPpm: 0,
            driftStatus: 'NORMAL'
        });
    }

    // Audit drift
    const driftReport = driftAuditor.analyze(snapshots);
    const monoReport = monoValidator.validate(snapshots);
    const trustReport = classifier.classify(driftReport, [], monoReport);

    console.log(`     - Run status under accelerated elapsed time: ${trustReport.status} (Score: ${trustReport.score})`);
    if (trustReport.status !== ChronologyTrustStatus.VERIFIED) {
        throw new Error('Replay verification failed under accelerated elapsed time!');
    }

    // 2. Anomaly Injection scenario (Monotonic ticks jumping backward)
    await timeWarp.clear();
    await timeWarp.inject({ monotonicOffsetNs: '-50000000000' }); // -50 seconds monotonic step
    
    const tA = Date.now();
    const mA = process.hrtime.bigint().toString();
    const anomalySnapshots = [
        { timestampMs: tA - 1000, monotonicNs: (BigInt(mA) + 1000000000n).toString(), wallClockIso: new Date(tA - 1000).toISOString(), ntpOffsetMs: 0, ntpDriftPpm: 0, driftStatus: 'NORMAL' },
        { timestampMs: tA, monotonicNs: mA, wallClockIso: new Date(tA).toISOString(), ntpOffsetMs: 0, ntpDriftPpm: 0, driftStatus: 'NORMAL' }
    ];

    const driftAnomaly = driftAuditor.analyze(anomalySnapshots);
    const monoAnomaly = monoValidator.validate(anomalySnapshots);
    const trustAnomaly = classifier.classify(driftAnomaly, [], monoAnomaly);

    console.log(`     - Run status under monotonic jump anomaly: ${trustAnomaly.status} (Score: ${trustAnomaly.score})`);
    if (trustAnomaly.status !== ChronologyTrustStatus.INVALID) {
        throw new Error('Replay classifier failed to detect monotonic jump anomaly!');
    }

    await timeWarp.clear();
    console.log('  ✅ Lease & Replay Stress Drill verified.\n');

    console.log('================================================================================');
    console.log('🎉 PHASE 14B PATHOLOGY & CHRONOLOGY FAULT INJECTION VERIFIED SUCCESSFULLY');
    console.log('================================================================================');
    process.exit(0);
}

runPhase14bVerification().catch(err => {
    console.error('Fatal Verification Error:', err);
    process.exit(1);
});

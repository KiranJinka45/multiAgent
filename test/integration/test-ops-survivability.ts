import { execSync } from 'node:child_process';
import { LongitudinalAnalyzer } from '../../packages/core-engine/src/reporting/longitudinal-analyzer.js';

function assert(condition: any, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

async function run() {
    console.log('🏁 [TEST] Starting Phase 9.3: Operational Survivability & Trust Regression Testing');

    // ─── Test 1: Trust Regression Scoring & Elevated Risk Detection ───
    console.log('\n📊 [Test 1] Simulating packet drift and verifying risk detection envelopes...');

    // Scenario A: Boring Baseline (No Drift)
    const boringPackets = Array.from({ length: 10 }, (_, i) => ({
        semanticDrift: 0.01,
        recovery: { revertible: true },
        attestation: { isolationLevel: 'sandbox' }
    }));
    const boringTrend = LongitudinalAnalyzer.analyze(boringPackets);
    console.log(`- Boring Trend Status: ${boringTrend.status}, Regression Score: ${boringTrend.regressionScore}`);
    assert(boringTrend.status === 'BORING', 'Nominal conditions should map to BORING');
    assert(boringTrend.regressionScore >= 95, 'Nominal conditions should keep regression score >= 95');

    // Scenario B: Synthetic Drift (Elevated Risk)
    // Drift goes from 0.01 up to 0.07, introducing positive acceleration trend
    const elevatedPackets = Array.from({ length: 10 }, (_, i) => ({
        semanticDrift: 0.01 + (i * 0.0067), // 0.01 to ~0.07
        recovery: { revertible: true },
        attestation: { isolationLevel: 'sandbox' }
    }));
    const elevatedTrend = LongitudinalAnalyzer.analyze(elevatedPackets);
    console.log(`- Elevated Trend Status: ${elevatedTrend.status}, Regression Score: ${elevatedTrend.regressionScore}`);
    assert(elevatedTrend.status === 'ELEVATED_RISK', 'Increasing/moderate drift should map to ELEVATED_RISK');
    assert(elevatedTrend.regressionScore < 95 && elevatedTrend.regressionScore >= 85, 'Elevated conditions should map regression score between 85 and 95');

    // Scenario C: Severe Drift (Regression Risk)
    const criticalPackets = Array.from({ length: 10 }, (_, i) => ({
        semanticDrift: 0.12,
        recovery: { revertible: true },
        attestation: { isolationLevel: 'sandbox' }
    }));
    const criticalTrend = LongitudinalAnalyzer.analyze(criticalPackets);
    console.log(`- Critical Trend Status: ${criticalTrend.status}, Regression Score: ${criticalTrend.regressionScore}`);
    assert(criticalTrend.status === 'REGRESSION_RISK', 'Severe drift should map to REGRESSION_RISK');
    assert(criticalTrend.regressionScore < 85, 'Critical conditions should map regression score below 85');

    console.log('✅ PASS: LongitudinalAnalyzer correctly calculates Trust Regression and categorizes ELEVATED_RISK.');

    // ─── Test 2: Operator Survival Drill Instructional Execution ───
    console.log('\n📖 [Test 2] Simulating non-author survival drill execution in Instructional Mode...');
    try {
        const output = execSync('npx tsx scripts/survival-drill.ts --instructional', { encoding: 'utf8' });
        console.log(output);
        assert(output.includes('ALL OPERATIONAL SURVIVABILITY DRILLS PASSED IN INSTRUCTIONAL MODE!'), 
               'Instructional mode must sequentially play and pass all recovery scenarios');
        console.log('✅ PASS: Interactive survival drill executes flawlessly in Instructional Mode.');
    } catch (e: any) {
        console.error('❌ FAIL: Survival Drill test failed to execute in Instructional Mode:', e.message);
        throw e;
    }

    console.log('\n🏁 [TEST] COMPLETED: Phase 9.3 Operational Survivability Drills Certified.');
}

run().catch((err) => {
    console.error('Fatal test failure:', err.message);
    process.exit(1);
});

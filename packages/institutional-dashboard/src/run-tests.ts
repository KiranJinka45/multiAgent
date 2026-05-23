import { getHealthOverview, getDriftSummary } from './index.js';

function assert(condition: any, message: string) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        throw new Error(message);
    } else {
        console.log(`✅ PASSED: ${message}`);
    }
}

async function runTests() {
    console.log('\n==================================================');
    console.log('🚀 TESTING INSTITUTIONAL DASHBOARD LAYER');
    console.log('==================================================\n');

    try {
        console.log('👉 Running Test 1: Health overview telemetry...');
        const health = getHealthOverview();
        assert(health.status === 'OPTIMAL', 'Health status must be OPTIMAL');
        assert(health.overallHealthScore === 98, 'Health score must be 98');
        assert(health.activeTenants === 4, 'Active tenants must be 4');
        assert(health.telemetryLagMs === 12, 'Lag should be nominal 12ms');

        console.log('\n👉 Running Test 2: Drift summary audits...');
        const drift = getDriftSummary();
        assert(drift.detectedDrifts === 1, 'Detected drift count should be 1');
        assert(drift.driftByComponent['outbox-queue'] === 'LOW', 'Outbox queue should have LOW drift');
        assert(drift.driftByComponent['governance-replica'] === 'NONE', 'Governance replica should have NONE drift');

        console.log('\n==================================================');
        console.log('🎉 INSTITUTIONAL DASHBOARD LAYER PASSED ALL TESTS!');
        console.log('==================================================\n');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ TEST RUN FAILED:\n', error);
        process.exit(1);
    }
}

runTests();

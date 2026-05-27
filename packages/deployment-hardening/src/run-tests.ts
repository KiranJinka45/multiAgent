import { validateDeploymentReady, applySafetyDefaults } from './index.js';

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
    console.log('🚀 TESTING DEPLOYMENT HARDENING LAYER');
    console.log('==================================================\n');

    try {
        console.log('👉 Running Test 1: Validate highly vulnerable config...');
        const weakConfig = {
            debug: true,
            forceSsl: false,
            maxReplicas: 12,
            walEnabled: false,
            rateLimitEnabled: false
        };
        const validation1 = validateDeploymentReady(weakConfig);
        assert(validation1.ready === false, 'Config should not be ready');
        assert(validation1.criticalBlockers.length === 2, 'Should have 2 critical blockers (SSL, WAL)');
        assert(validation1.risksDetected.length === 3, 'Should have 3 risks');
        assert(validation1.score === 0, 'Score should be 0 due to penalties');

        console.log('\n👉 Running Test 2: Validate healthy config...');
        const healthyConfig = {
            debug: false,
            forceSsl: true,
            maxReplicas: 3,
            walEnabled: true,
            rateLimitEnabled: true
        };
        const validation2 = validateDeploymentReady(healthyConfig);
        assert(validation2.ready === true, 'Config should be ready');
        assert(validation2.criticalBlockers.length === 0, 'Should have 0 blockers');
        assert(validation2.risksDetected.length === 0, 'Should have 0 risks');
        assert(validation2.score === 100, 'Score should be 100');

        console.log('\n👉 Running Test 3: Apply safety defaults to vulnerable config...');
        const hardenedResult = applySafetyDefaults(weakConfig);
        assert(hardenedResult.securityLevel === 'MAXIMUM', 'Security level must be MAXIMUM');
        assert(hardenedResult.enforcedSettings.debug === false, 'Debug should be forced false');
        assert(hardenedResult.enforcedSettings.forceSsl === true, 'SSL should be forced true');
        assert(hardenedResult.enforcedSettings.walEnabled === true, 'WAL should be forced true');
        assert(hardenedResult.enforcedSettings.maxReplicas === 5, 'Max replicas should be capped at 5');

        console.log('\n==================================================');
        console.log('🎉 DEPLOYMENT HARDENING LAYER PASSED ALL TESTS!');
        console.log('==================================================\n');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ TEST RUN FAILED:\n', error);
        process.exit(1);
    }
}

runTests();

import { summarizeGovernanceState, generateRecoveryGuidance } from './index.js';

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
    console.log('🚀 TESTING OPERATOR COMPRESSION ENGINE');
    console.log('==================================================\n');

    try {
        console.log('👉 Running Test 1: Nominal state summary...');
        const nomSummary = summarizeGovernanceState({
            epoch: 12,
            activeRulesCount: 15,
            driftDetected: false,
            activeAlertCount: 0,
            latencyMs: 45
        });
        assert(nomSummary.epoch === 12, 'Epoch must be 12');
        assert(nomSummary.activeRulesCount === 15, 'Rules count must be 15');
        assert(nomSummary.driftDetected === false, 'Drift should be false');
        assert(nomSummary.cognitiveLoadScore === 10, 'Cognitive load should be nominal baseline (10)');
        assert(nomSummary.summaryMessage.includes('nominally'), 'Message should indicate nominal state');

        console.log('\n👉 Running Test 2: High stress state summary...');
        const stressSummary = summarizeGovernanceState({
            epoch: 12,
            activeRulesCount: 15,
            driftDetected: true,
            activeAlertCount: 4,
            latencyMs: 350
        });
        assert(stressSummary.driftDetected === true, 'Drift should be true');
        assert(stressSummary.cognitiveLoadScore === 100, 'Cognitive load should be capped at 100 (10 + 60 + 20 + 30)');
        assert(stressSummary.summaryMessage.includes('WARNING'), 'Message should flag high cognitive load warning');

        console.log('\n👉 Running Test 3: Recovery playbook generation (Region Loss)...');
        const regionalGuidance = generateRecoveryGuidance({
            id: 'INC-TEST-001',
            type: 'REGION_LOSS',
            severity: 'CRITICAL'
        });
        assert(regionalGuidance.incidentId === 'INC-TEST-001', 'Incident ID should match');
        assert(regionalGuidance.severity === 'CRITICAL', 'Severity should be CRITICAL');
        assert(regionalGuidance.guidance.length === 3, 'Guidance should contain exactly 3 steps');
        assert(regionalGuidance.remediationAction.includes('FAILOVER'), 'Remediation action should suggest failover');

        console.log('\n==================================================');
        console.log('🎉 OPERATOR COMPRESSION ENGINE PASSED ALL TESTS!');
        console.log('==================================================\n');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ TEST RUN FAILED:\n', error);
        process.exit(1);
    }
}

runTests();

import { FederatedGovernanceEngine } from '../packages/governance-core/src/federation.js';

function runVerification() {
    console.log('🌐 Starting Federated Semantic Alignment & Invariant Consensus Verification...\n');

    const engine = new FederatedGovernanceEngine();

    // 1. Verify semantic alignment on ORG-002 (93% alignment expected)
    console.log('🔍 Test 1: Evaluating Semantic Alignment for ORG-002...');
    const align2 = engine.align('ORG-002');
    console.log(`   Target Org:      ${align2.targetOrg}`);
    console.log(`   Alignment Score: ${align2.overallScore}%`);
    console.log(`   Perfect Matches: ${align2.perfectMatches.join(', ')}`);
    console.log(`   Synonym Matches: ${align2.synonymMatches.map(m => `${m.standardKey}➔${m.remoteTerm}`).join(', ')}`);
    console.log(`   Missing:         ${align2.missingMappings.join(', ') || 'None'}`);

    if (align2.overallScore !== 93) {
        console.error(`   ❌ FAIL: Expected 93% alignment score, got ${align2.overallScore}%`);
        process.exit(1);
    }
    console.log('   ✅ PASS: Alignment score and synonym mappings match specifications.');

    // 2. Verify semantic alignment on ORG-003 (68% alignment and missing FINALITY_COMMITMENT expected)
    console.log('\n🔍 Test 2: Evaluating Semantic Alignment for ORG-003...');
    const align3 = engine.align('ORG-003');
    console.log(`   Target Org:      ${align3.targetOrg}`);
    console.log(`   Alignment Score: ${align3.overallScore}%`);
    console.log(`   Missing:         ${align3.missingMappings.join(', ')}`);

    if (align3.overallScore !== 68) {
        console.error(`   ❌ FAIL: Expected 68% alignment score, got ${align3.overallScore}%`);
        process.exit(1);
    }
    if (!align3.missingMappings.includes('FINALITY_COMMITMENT')) {
        console.error('   ❌ FAIL: Expected missing mapping for FINALITY_COMMITMENT');
        process.exit(1);
    }
    console.log('   ✅ PASS: Missing core finality commitment correctly flagged.');

    // 3. Verify Treaty compliance (compliant under default terms)
    console.log('\n🔍 Test 3: Evaluating Default Treaty Terms for ORG-002...');
    const treatyCompliant = engine.treaty('ORG-002');
    console.log(`   Treaty ID:      ${treatyCompliant.treatyId}`);
    console.log(`   Status:         ${treatyCompliant.status}`);
    console.log(`   Proof Hash:     ${treatyCompliant.proofHash}`);

    if (treatyCompliant.status !== 'COMPLIANT') {
        console.error(`   ❌ FAIL: Expected treaty to be COMPLIANT, got ${treatyCompliant.status}`);
        process.exit(1);
    }
    console.log('   ✅ PASS: Default treaty is fully compliant.');

    // 4. Verify Treaty compliance rejection when latency threshold is set below current 110ms system telemetry (e.g. 80ms)
    console.log('\n🔍 Test 4: Evaluating Rejection of Tight Latency Treaty Terms for ORG-002...');
    const treatyViolated = engine.treaty('ORG-002', JSON.stringify({ latencyLimitMs: 80 }));
    console.log(`   Treaty ID:      ${treatyViolated.treatyId}`);
    console.log(`   Latency Limit:  ${treatyViolated.terms.latencyLimitMs}ms`);
    console.log(`   Status:         ${treatyViolated.status}`);

    if (treatyViolated.status !== 'VIOLATED') {
        console.error(`   ❌ FAIL: Expected treaty to be VIOLATED, got ${treatyViolated.status}`);
        process.exit(1);
    }
    console.log('   ✅ PASS: Treaty successfully violated due to latency threshold breach.');

    // 5. Verify invariant check (AP-SOUTH-1 regional lag, epochs desynchronized)
    console.log('\n🔍 Test 5: Checking Regional Invariant Consensus (MONOTONIC_SEQUENCE)...');
    const consensus = engine.invariantCheck('MONOTONIC_SEQUENCE');
    console.log(`   Status:         ${consensus.consensusStatus}`);
    console.log(`   Agreement:      ${(consensus.agreementRatio * 100).toFixed(1)}%`);
    console.log(`   Signers:        ${consensus.signers.join(', ')}`);

    if (consensus.consensusStatus !== 'DIVERGENT' || consensus.agreementRatio !== 0.67) {
        console.error(`   ❌ FAIL: Expected DIVERGENT consensus with 67% agreement ratio, got ${consensus.consensusStatus} and ${consensus.agreementRatio}`);
        process.exit(1);
    }
    console.log('   ✅ PASS: Regional lag warning correctly triggered for AP-SOUTH-1.');

    console.log('\n🎉 ALL FEDERATION VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');
}

runVerification();

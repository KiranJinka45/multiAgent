import * as dotenv from 'dotenv';
import * as dotenvExpand from 'dotenv-expand';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from workspace root
const rootEnv = path.resolve(process.cwd(), '.env');
if (fs.existsSync(rootEnv)) {
    const envConfig = dotenv.config({ path: rootEnv });
    dotenvExpand.expand(envConfig);
}

// Simple lightweight assertion helper
function assert(condition: any, message: string) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        throw new Error(message);
    } else {
        console.log(`✅ PASSED: ${message}`);
    }
}

async function runAllTests() {
    const { EvidenceLedgerService } = await import('./index.js');
    const { ForensicResilienceEngine } = await import('./resilience-engine.js');
    const { EventCategory, VerificationState } = await import('@packages/contracts');
    const { redis } = await import('@packages/utils');
    const { db } = await import('@packages/db');

    console.log('\n==================================================');
    console.log('🚀 INITIATING ZTAN RECORDER INTEGRATION TEST SUITE');
    console.log('==================================================\n');

    // Helper to clear Redis and Database state using immutability bypass
    const clearAllState = async () => {
        const keys = await redis.keys('ztan:*');
        if (keys.length > 0) {
            await redis.del(...keys);
        }
        await db.$transaction(async (tx: any) => {
            await tx.$executeRawUnsafe("SET LOCAL ztan.bypass_immutability = 'on';");
            await tx.ztanLedgerBlock.deleteMany({});
            await tx.ztanWalLog.deleteMany({});
            await tx.ztanSnapshot.deleteMany({});
        });
    };

    try {
        // --- TEST 1: Replay-chain verification ---
        console.log('👉 Running Test 1: Replay-chain verification...');
        await clearAllState();
        const correlationId1 = 'test-incident-1';

        const entry1 = await EvidenceLedgerService.append({
            category: EventCategory.MUTATION,
            source: { service: 'auth-service', node: 'node-1', version: '2.4.0' },
            payload: { action: 'deploy', version: '2.4.0' },
            correlationId: correlationId1,
            signerId: 'operator-alice'
        });

        const entry2 = await EvidenceLedgerService.append({
            category: EventCategory.OBSERVATION,
            source: { service: 'auth-service', node: 'node-1', version: '2.4.0' },
            payload: { cpu: 92 },
            correlationId: correlationId1,
            parentEventId: entry1.id,
            signerId: 'operator-alice'
        });

        assert(entry1.sequence === 1, 'Entry 1 sequence must be 1');
        assert(entry2.sequence === 2, 'Entry 2 sequence must be 2');
        assert(entry2.integrity.previousHash === entry1.integrity.hash, 'Entry 2 previousHash must match Entry 1 hash');

        const chain = await EvidenceLedgerService.getChain(correlationId1);
        assert(chain.entries.length === 2, 'Chain length must be 2');
        assert(chain.verificationState === VerificationState.VERIFIED, 'Chain verificationState must be VERIFIED');
        assert(chain.metrics.chainIntegrityRate === 1.0, 'Chain integrity rate must be 1.0');
        assert(chain.metrics.evidenceCompleteness === 1.0, 'Evidence completeness must be 1.0');
        assert(chain.metrics.causalCertainty === 0.9, 'Causal certainty must be 0.9');

        // --- TEST 2: Corrupted-hash rejection ---
        console.log('\n👉 Running Test 2: Corrupted-hash rejection...');
        await clearAllState();
        const correlationId2 = 'test-incident-2';

        const cEntry1 = await EvidenceLedgerService.append({
            category: EventCategory.MUTATION,
            source: { service: 'auth-service', node: 'node-1', version: '2.4.0' },
            payload: { action: 'deploy' },
            correlationId: correlationId2,
            signerId: 'operator-alice'
        });

        const cEntry2 = await EvidenceLedgerService.append({
            category: EventCategory.OBSERVATION,
            source: { service: 'auth-service', node: 'node-1', version: '2.4.0' },
            payload: { cpu: 45 },
            correlationId: correlationId2,
            parentEventId: cEntry1.id,
            signerId: 'operator-alice'
        });

        // Corrupt the second entry
        await ForensicResilienceEngine.injectChainCorruption(cEntry2.id);

        const corruptedChain = await EvidenceLedgerService.getChain(correlationId2);
        assert(corruptedChain.verificationState === VerificationState.UNTRUSTED, 'Corrupted chain must be UNTRUSTED');
        assert(corruptedChain.metrics.chainIntegrityRate === 0.5, 'Integrity rate must degrade to 0.5');
        assert(corruptedChain.metrics.recoveryConfidence === 0.6, 'Recovery confidence must degrade to 0.6');

        // --- TEST 3: Signer revocation ---
        console.log('\n👉 Running Test 3: Signer revocation...');
        await clearAllState();
        const correlationId3 = 'test-incident-3';

        await EvidenceLedgerService.append({
            category: EventCategory.MUTATION,
            source: { service: 'gateway-service', node: 'node-2', version: '2.4.0' },
            payload: { action: 'config_change' },
            correlationId: correlationId3,
            signerId: 'compromised-signer-id'
        });

        let signerChain = await EvidenceLedgerService.getChain(correlationId3);
        assert(signerChain.verificationState === VerificationState.VERIFIED, 'Initial chain must be VERIFIED');

        // Revoke the signer
        await ForensicResilienceEngine.revokeSigner('compromised-signer-id');

        signerChain = await EvidenceLedgerService.getChain(correlationId3);
        assert(signerChain.verificationState === VerificationState.DEGRADED, 'Revoked signer chain must be DEGRADED');
        assert(signerChain.metrics.epochTrustValidity === 0.3, 'Epoch trust validity must degrade to 0.3');

        // --- TEST 4: Rollback safety gate ---
        console.log('\n👉 Running Test 4: Rollback safety gate...');
        await clearAllState();
        const correlationId4 = 'test-incident-4';

        const unsafeEntry = await EvidenceLedgerService.append({
            category: EventCategory.MUTATION,
            source: { service: 'auth-service', node: 'node-1', version: '2.3.9' }, // below 2.4.0
            payload: { version: '2.3.9', action: 'rollback_target' },
            correlationId: correlationId4,
            signerId: 'operator-alice'
        });

        const assessment1 = await EvidenceLedgerService.assessRollbackImpact(unsafeEntry.id);
        assert(assessment1.isSafe === false, 'Rollback below 2.4.0 must be unsafe');
        assert(assessment1.recommendation === 'PROHIBITED', 'Rollback below 2.4.0 must be PROHIBITED');
        assert(assessment1.violatedInvariants[0].includes('Unsafe software baseline'), 'Must flag unsafe software baseline');

        const telemetryMissingEntry = await EvidenceLedgerService.append({
            category: EventCategory.MUTATION,
            source: { service: 'auth-service', node: 'node-1', version: '2.4.0' },
            payload: { version: '2.4.0', dependency_health: 'MISSING' },
            correlationId: correlationId4,
            signerId: 'operator-alice'
        });

        const assessment2 = await EvidenceLedgerService.assessRollbackImpact(telemetryMissingEntry.id);
        assert(assessment2.isSafe === false, 'Rollback with missing telemetry must be unsafe');
        assert(assessment2.recommendation === 'PROHIBITED', 'Rollback with missing telemetry must be PROHIBITED');
        assert(assessment2.violatedInvariants[0].includes('Mandatory dependency telemetry missing'), 'Must flag missing telemetry');

        // --- TEST 5: Concurrent sequence appends ---
        console.log('\n👉 Running Test 5: Concurrent sequence appends...');
        await clearAllState();
        const correlationId5 = 'test-incident-5';

        const appends = Array.from({ length: 10 }, (_, i) => 
            EvidenceLedgerService.append({
                category: EventCategory.MUTATION,
                source: { service: 'load-balancer', node: `node-${i}`, version: '2.4.0' },
                payload: { requestId: `req-${i}` },
                correlationId: correlationId5,
                signerId: 'operator-alice'
            })
        );

        const results = await Promise.all(appends);
        const sequences = results.map((r: any) => r.sequence).sort((a: any, b: any) => a - b);
        
        let allValid = true;
        for (let i = 0; i < 10; i++) {
            if (sequences[i] !== i + 1) allValid = false;
        }
        assert(allValid, 'Sequence numbers must be monotonically increasing from 1 to 10');

        // Verifies previous hashes chain sequentially
        let hashChainingValid = true;
        for (let i = 1; i < results.length; i++) {
            const currentEntry = results.find((r: any) => r.sequence === i + 1);
            const prevEntry = results.find((r: any) => r.sequence === i);
            if (currentEntry?.integrity.previousHash !== prevEntry?.integrity.hash) {
                hashChainingValid = false;
            }
        }
        assert(hashChainingValid, 'Causal hash chaining must link sequentially for concurrent appends');

        const concurrentChain = await EvidenceLedgerService.getChain(correlationId5);
        assert(concurrentChain.entries.length === 10, 'Reconstructed concurrent chain must contain 10 entries');
        assert(concurrentChain.verificationState === VerificationState.VERIFIED, 'Concurrent chain verification must be VERIFIED');

        console.log('\n==================================================');
        console.log('🎉 ALL INTEGRATION TESTS COMPLETED SUCCESSFULLY!');
        console.log('==================================================\n');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ TEST RUN ENCOUNTERED FAILURE:\n', error);
        process.exit(1);
    }
}

runAllTests();

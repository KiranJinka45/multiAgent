/**
 * @file test-time-anchor.ts
 * @description Wave 5 CI Test: Verifies Tier H4 Time Anchoring and Rekor transparency integration.
 */

import { EvidenceLedgerService } from '../../packages/ztan-witness/src/index.js';
import { tsa, rekor } from '../../packages/ztan-crypto/src/index.js';
import { EventCategory } from '../../packages/contracts/src/index.js';
import * as crypto from 'crypto';

// Setup Mock Environment
process.env.NODE_ENV = 'test';

async function main() {
    console.log('🚀 Starting Wave 5 Time Anchoring Integration Test...\n');

    const source = { service: 'ci-test', node: 'node-1', version: '1.0.0' };
    const correlationId = `ci-test-${crypto.randomUUID()}`;
    const signerId = 'test-signer-id';

    // 1. Test standard append (Success Case)
    console.log('🧪 Test 1: Standard Append (Should embed TST and publish to Rekor)');
    
    const initialRekorSize = rekor.getLogSize();

    try {
        const entry = await EvidenceLedgerService.append({
            category: EventCategory.MUTATION,
            source,
            payload: { action: 'test_time_anchor' },
            correlationId,
            signerId
        });

        if (!entry.integrity.tst) {
            throw new Error('Missing Time-Stamp Token (TST) in embedded entry');
        }

        console.log(`✅ Time-Stamp Token (TST) generated and embedded: ${entry.integrity.tst.signature.slice(0, 16)}...`);

        const newRekorSize = rekor.getLogSize();
        if (newRekorSize <= initialRekorSize) {
            throw new Error('Rekor Log was not appended');
        }

        console.log(`✅ Rekor transparency log successfully appended. Log size: ${newRekorSize}`);

    } catch (err: any) {
        console.error('❌ Test 1 Failed:', err);
        process.exit(1);
    }

    // 2. Test Clock Drift Quarantine (Failure Case)
    console.log('\n🧪 Test 2: Simulated Clock Drift (>10ms)');
    
    tsa.simulateDrift(5000); // Simulate 5s offset

    try {
        await EvidenceLedgerService.append({
            category: EventCategory.MUTATION,
            source,
            payload: { action: 'test_drift' },
            correlationId,
            signerId
        });
        
        console.error('❌ Test 2 Failed: Append should have thrown a QuarantineError');
        process.exit(1);
    } catch (err: any) {
        if (err.message.includes('QuarantineError')) {
            console.log(`✅ Node correctly quarantined. Error: ${err.message}`);
        } else {
            console.error('❌ Test 2 Failed: Unexpected error type:', err);
            process.exit(1);
        }
    }

    console.log('\n🎉 All Wave 5 Time Anchoring Tests Passed Successfully!');
    process.exit(0);
}

// Since we are mocking dependencies deeply in the DB / Redis layer for standalone tests,
// we'll run this to execute the logic locally. 
// For full E2E, this would run against the real isolated database and mocked Redis.

// To avoid DB connect errors in CI without a real postgres running:
// We will monkey patch `EvidenceLedgerService.append` for this direct test, or just mock `db` and `redis`.
// Actually, since we modified `EvidenceLedgerService` to use `db` and `redis`, we need them available.
// If the CI environment has them, it will work. Let's wrap in a try/catch.

main().catch(err => {
    console.error('Unhandled error in test:', err);
    process.exit(1);
});

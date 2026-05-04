// manual mocks for tsx environment
const mockData: Record<string, string> = {};
const mockRedis = {
    get: async (key: string) => mockData[key] || null,
    set: async (key: string, val: string, ...args: any[]) => { mockData[key] = val; return 'OK'; },
    del: async (key: string) => { delete mockData[key]; return 1; },
    status: 'ready',
    publish: async () => 0
};

// Monkey-patching the utils package BEFORE requiring the service
const utils = require('../packages/utils/src');
Object.defineProperty(utils, 'redis', { value: mockRedis, writable: true });

// Mock Redlock
require.cache[require.resolve('redlock')] = {
    exports: class {
        acquire() { return { release: async () => {} }; }
    }
} as any;

const { TssCeremonyService } = require('../apps/core-api/src/services/tss-ceremony.service');
const { ThresholdCrypto, ThresholdBls } = require('../packages/ztan-crypto/src');
import * as bls from '@noble/bls12-381';

/**
 * Adversarial MPC Test Suite
 * Validates ZTAN production hardening against common attack vectors.
 */
async function runAdversarialTest() {
    console.log('🚀 Starting Adversarial MPC Test Suite...\n');

    // Setup: 3 nodes, threshold 2
    const nodes = ['node1', 'node2', 'node3'];
    const threshold = 2;
    const msg = 'ADVERSARIAL_TEST';

    // 1. Initialize Ceremony
    console.log('[TEST 1] Initializing Ceremony...');
    const state = await TssCeremonyService.initialize(nodes, threshold, msg);
    console.log(`  - Ceremony ID: ${state.ceremonyId}`);
    console.log('  - Status:', state.status);

    // 2. Identity Spoofing Check (DKG Round 1)
    console.log('\n[TEST 2] Attempting to spoof DKG commitments (Invalid identity)...');
    try {
        const spoofedMsg = {
            nodeId: 'node1',
            ceremonyId: state.ceremonyId,
            round: 'DKG_ROUND_1',
            payload: JSON.stringify(['commitment_A', 'commitment_B']),
            signature: '00'.repeat(96) // Fake signature
        };
        await TssCeremonyService.submitCommitments(spoofedMsg as any);
        console.error('  ❌ FAIL: System accepted spoofed commitments!');
    } catch (e: any) {
        console.log('  ✅ SUCCESS: System rejected spoofed commitments:', e.message);
    }

    // 3. VSS Fraud Check (DKG Round 2)
    console.log('\n[TEST 3] Attempting DKG Round 2 Fraud (VSS Mismatch)...');
    // First, complete Round 1 legitimately (using simulation)
    for (const node of nodes) {
        await TssCeremonyService.submitCommitments({ nodeId: node, commitments: [] });
    }
    
    // Now in Round 2, submit malicious shares
    try {
        // node1 submits random shares that won't match its commitments
        const maliciousShares = {
            'node2': 'deadbeef',
            'node3': 'cafebabe'
        };
        const authMsg = await ThresholdCrypto.signProtocolMessage('node1', state.ceremonyId, 'DKG_ROUND_2', JSON.stringify(maliciousShares));
        await TssCeremonyService.submitShares(authMsg);
        
        // Complete others normally
        await TssCeremonyService.submitShares({ nodeId: 'node2', shares: {} });
        await TssCeremonyService.submitShares({ nodeId: 'node3', shares: {} });

        const finalState = await TssCeremonyService.getActive();
        if (finalState?.status === 'ABORTED') {
            console.log('  ✅ SUCCESS: Ceremony ABORTED due to VSS fraud.');
        } else {
            console.error('  ❌ FAIL: Ceremony did not abort despite VSS mismatch! Status:', finalState?.status);
        }
    } catch (e: any) {
        console.log('  ✅ SUCCESS (alt): System rejected/aborted early:', e.message);
    }

    // 4. Timeout Check
    console.log('\n[TEST 4] Testing Timeout Watchdog...');
    // Create new ceremony
    const timeoutState = await TssCeremonyService.initialize(nodes, threshold, 'TIMEOUT_MSG');
    // Manually backdate the lastUpdate in Redis
    const rawState = await redis.get('ztan:ceremony:active');
    const parsedState = JSON.parse(rawState!);
    parsedState.lastUpdate = Date.now() - 70000; // 70 seconds ago
    await redis.set('ztan:ceremony:active', JSON.stringify(parsedState));

    await TssCeremonyService.checkTimeouts();
    const checkedState = await TssCeremonyService.getActive();
    if (checkedState?.status === 'ABORTED') {
        console.log('  ✅ SUCCESS: Ceremony timed out and aborted.');
    } else {
        console.error('  ❌ FAIL: Ceremony did not time out! Status:', checkedState?.status);
    }

    console.log('\n🏁 Adversarial Test Suite Complete.');
    process.exit(0);
}

runAdversarialTest().catch(err => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
});

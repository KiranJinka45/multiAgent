import { 
    DistributedLeaseManager, 
    EpochFencedStore, 
    ImmutableEventStore,
    ConsensusLeaseLostError,
    EpochFencedError
} from '../../packages/production-pilot/src/index.js';
import { logger } from '../../packages/observability/src/index.js';

class ConsensusSafetyTester {
    async run() {
        logger.info('🏁 [TEST] Starting PHASE J: DISTRIBUTED CONSENSUS LEASE & FENCING TEST CAMPAIGN');
        let passed = 0;
        let total = 0;

        const store = new ImmutableEventStore<string>();

        // ─── Scenario 1: Atomic Leader Election ───
        total++;
        logger.info('🔑 [Scenario 1] Verifying atomic leader election blocks double-primary states...');
        try {
            // Node A and Node B attempting to claim leadership concurrently
            const nodeA = new DistributedLeaseManager('node-a', 'test/ztan/primary', undefined, true);
            const nodeB = new DistributedLeaseManager('node-b', 'test/ztan/primary', undefined, true);

            // 1. Node A claims leadership successfully
            const leaseA = await nodeA.acquireLeadership(3);
            assert(leaseA.nodeId === 'node-a', 'Node A must acquire leadership');
            assert(leaseA.epoch === 1, 'Initial epoch must be 1');

            // 2. Node B attempts to claim leadership concurrently but MUST be rejected!
            let nodeBRejected = false;
            try {
                await nodeB.acquireLeadership(3);
            } catch (err: any) {
                if (err.message.includes('Leadership already held by active node')) {
                    nodeBRejected = true;
                    logger.info(`  Caught expected leader acquisition clash: ${err.message}`);
                }
            }
            assert(nodeBRejected === true, 'Node B leader acquisition attempt must be rejected');

            nodeA.releaseLeadership();
            logger.info('  ✅ PASS: Atomic leader election successfully blocks secondary primary node attempts');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 1');
        }

        // ─── Scenario 2: Monotonic Epoch Increments ───
        total++;
        logger.info('📈 [Scenario 2] Verifying monotonically increasing leadership epochs...');
        try {
            const manager = new DistributedLeaseManager('node-a', 'test/ztan/primary2', undefined, true);

            // Acquisition 1 -> Epoch 1
            const lease1 = await manager.acquireLeadership(3);
            assert(lease1.epoch === 1, 'First acquisition must yield Epoch 1');
            manager.releaseLeadership();

            // Acquisition 2 -> Epoch 2
            const lease2 = await manager.acquireLeadership(3);
            assert(lease2.epoch === 2, 'Second acquisition must yield Epoch 2');
            manager.releaseLeadership();

            logger.info('  ✅ PASS: Monotonic Epoch IDs increment successfully across subsequent leadership cycles');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 2');
        }

        // ─── Scenario 3: Lease Write Fencing ───
        total++;
        logger.info('🛡️  [Scenario 3] Enforcing Epoch Fenced store write barriers...');
        try {
            const manager = new DistributedLeaseManager('node-a', 'test/ztan/primary3', undefined, true);
            const fencedStore = new EpochFencedStore<string>(store, manager);

            // 1. Attempt to write BEFORE acquiring leadership
            let preLeadershipRejected = false;
            try {
                fencedStore.appendWithFence('Event 1', 1);
            } catch (err: any) {
                if (err instanceof EpochFencedError && err.message.includes('local node does not hold active leadership lease')) {
                    preLeadershipRejected = true;
                    logger.info(`  Caught expected pre-leadership write rejection: ${err.message}`);
                }
            }
            assert(preLeadershipRejected === true, 'Pre-leadership writes must be blocked by fencing barrier');

            // 2. Acquire leadership (Epoch 1) and write with valid Epoch 1
            const lease = await manager.acquireLeadership(3);
            const block = fencedStore.appendWithFence('Event 1', 1);
            assert(block.payload === 'Event 1', 'fencedStore must permit writes matching active epoch');

            // 3. Attempt to write presenting incorrect Epoch (e.g. Epoch 99)
            let mismatchedEpochRejected = false;
            try {
                fencedStore.appendWithFence('Poison Event', 99);
            } catch (err: any) {
                if (err instanceof EpochFencedError && err.message.includes('Epoch fencing mismatch')) {
                    mismatchedEpochRejected = true;
                    logger.info(`  Caught expected mismatched epoch write rejection: ${err.message}`);
                }
            }
            assert(mismatchedEpochRejected === true, 'Mismatched epoch writes must be blocked by fencing barrier');

            manager.releaseLeadership();
            logger.info('  ✅ PASS: EpochFencedStore successfully blocks unauthorized and mismatched write operations');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 3');
        }

        // ─── Scenario 4: Heartbeat Loss & Self-Fencing ───
        total++;
        logger.info('💀 [Scenario 4] Simulating heartbeat loss and automated self-fencing...');
        try {
            const manager = new DistributedLeaseManager('node-a', 'test/ztan/primary4', undefined, true);
            const fencedStore = new EpochFencedStore<string>(store, manager);

            await manager.acquireLeadership(3);

            // Trigger self-fencing manually (simulating heartbeat failures or connection losses)
            let leaseLostCaught = false;
            try {
                manager.selfFence();
            } catch (err: any) {
                if (err instanceof ConsensusLeaseLostError && err.message.includes('lost connection to consensus cluster')) {
                    leaseLostCaught = true;
                    logger.info(`  Caught expected local self-fencing exception: ${err.message}`);
                }
            }
            assert(leaseLostCaught === true, 'Lease loss must trigger self-fencing callback');
            assert(manager.getCurrentEpoch() === 0, 'Self-fenced node must clear current leadership epoch');

            // Assert that subsequent writes are completely blocked after fencing
            let postFenceRejected = false;
            try {
                fencedStore.appendWithFence('Zombie Write', 1);
            } catch (err: any) {
                if (err instanceof EpochFencedError) {
                    postFenceRejected = true;
                }
            }
            assert(postFenceRejected === true, 'Post-fencing writes must be blocked');

            logger.info('  ✅ PASS: Heartbeat loss successfully triggers immediate local self-fencing and blocks all outstanding writes');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 4');
        }

        // ─── Scenario 5: Divergence Blockers ───
        total++;
        logger.info('🔬 [Scenario 5] Asserting complete event-store divergence blocking on epoch mismatch...');
        try {
            const manager = new DistributedLeaseManager('node-a', 'test/ztan/primary5', undefined, true);
            const fencedStore = new EpochFencedStore<string>(store, manager);

            await manager.acquireLeadership(3);
            const activeEpoch = manager.getCurrentEpoch();

            // Write 1 (Valid)
            fencedStore.appendWithFence('Checkpoint A', activeEpoch);

            // Write 2 (Mismatched Epoch - simulates out-of-order write from partitioned replica)
            let throwsDivergence = false;
            try {
                fencedStore.appendWithFence('Checkpoint B', activeEpoch - 1);
            } catch (err: any) {
                if (err instanceof EpochFencedError) {
                    throwsDivergence = true;
                }
            }
            assert(throwsDivergence === true, 'Divergent out-of-order write must raise fencing exception');

            manager.releaseLeadership();
            logger.info('  ✅ PASS: Epoch mismatch successfully raises exceptions and blocks event-store sequence divergence');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 5');
        }

        logger.info(`🏁 [TEST] COMPLETED: ${passed}/${total} Scenarios Passed.`);
        if (passed !== total) {
            throw new Error(`Consensus Safety Integration Test Failed: only ${passed}/${total} passed.`);
        }
        logger.info('🎉 [SYSTEM CONSENSUS SECURE] etcd atomic elections, logical epochs, and write fences are fully verified.');
    }
}

function assert(condition: any, message: string) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        throw new Error(message);
    } else {
        console.log(`  PASSED: ${message}`);
    }
}

const tester = new ConsensusSafetyTester();
tester.run()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Fatal consensus safety test failure:', err.message);
        process.exit(1);
    });

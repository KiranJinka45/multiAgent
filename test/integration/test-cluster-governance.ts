import * as fs from 'node:fs';
import * as path from 'node:path';
import {
    DurableSegmentedWal,
    TcpReplicationTransport,
    FollowerSyncAgent,
    ReplicatedWalCoordinator,
    QuorumReplicatedStore,
    DistributedLeaseManager,
    MembershipState,
    QuorumDurabilityException
} from '../../packages/production-pilot/src/index.js';
import { logger } from '../../packages/observability/src/index.js';

class ClusterGovernanceTester {
    private testDir = path.join(process.cwd(), 'scratch', 'test-cluster-governance-' + Math.random().toString(36).substr(2, 9));

    private cleanTestDir() {
        if (fs.existsSync(this.testDir)) {
            fs.rmSync(this.testDir, { recursive: true, force: true });
        }
    }

    async run() {
        logger.info('🏁 [TEST] Starting Phase R: Cluster Lifecycle Governance Tests');
        let passed = 0;
        let total = 0;

        this.cleanTestDir();

        const dirA = path.join(this.testDir, 'node-a');
        const dirB = path.join(this.testDir, 'node-b');
        const dirC = path.join(this.testDir, 'node-c');

        fs.mkdirSync(dirA, { recursive: true });
        fs.mkdirSync(dirB, { recursive: true });
        fs.mkdirSync(dirC, { recursive: true });

        const walA = new DurableSegmentedWal<any>({ walDir: dirA, syncEveryWrite: true });
        const walB = new DurableSegmentedWal<any>({ walDir: dirB, syncEveryWrite: true });
        const walC = new DurableSegmentedWal<any>({ walDir: dirC, syncEveryWrite: true });

        const portA = 42000 + Math.floor(Math.random() * 5000);
        const portB = portA + 1;
        const portC = portA + 2;

        const transportA = new TcpReplicationTransport('node-a', portA);
        const transportB = new TcpReplicationTransport('node-b', portB);
        const transportC = new TcpReplicationTransport('node-c', portC);

        const allTransports = [transportA, transportB, transportC];
        allTransports.forEach(t => {
            t.addPeer('node-a', '127.0.0.1', portA);
            t.addPeer('node-b', '127.0.0.1', portB);
            t.addPeer('node-c', '127.0.0.1', portC);
        });

        await Promise.all([
            transportA.start(),
            transportB.start(),
            transportC.start()
        ]);

        const agentB = new FollowerSyncAgent<any>('node-b', walB);
        const agentC = new FollowerSyncAgent<any>('node-c', walC);

        const coordinatorA = new ReplicatedWalCoordinator<any>('node-a', walA, transportA);
        coordinatorA.registerFollowers(['node-b', 'node-c']);

        // Set up test-specific thresholds for fast evaluation
        coordinatorA.healthManager.setSuspicionThresholds(200, 500);

        // Register endpoints with heartbeat handlers
        transportA.registerNode('node-a', async (msg) => {
            if (msg.type === 'SYNC_REQUEST') {
                return {
                    type: 'SYNC_RESPONSE',
                    senderId: 'node-a',
                    epoch: msg.epoch,
                    payload: coordinatorA.handleSyncRequest(msg.payload)
                };
            }
            throw new Error(`Unsupported msg on A: ${msg.type}`);
        });

        transportB.registerNode('node-b', async (msg) => {
            if (msg.type === 'APPEND_ENTRIES') {
                const res = await agentB.handleAppendEntries(msg.payload);
                return {
                    type: 'APPEND_ENTRIES',
                    senderId: 'node-b',
                    epoch: msg.epoch,
                    payload: res
                };
            }
            if (msg.type === 'HEARTBEAT') {
                return agentB.handleHeartbeat(msg);
            }
            throw new Error(`Unsupported msg on B: ${msg.type}`);
        });

        transportC.registerNode('node-c', async (msg) => {
            if (msg.type === 'APPEND_ENTRIES') {
                const res = await agentC.handleAppendEntries(msg.payload);
                return {
                    type: 'APPEND_ENTRIES',
                    senderId: 'node-c',
                    epoch: msg.epoch,
                    payload: res
                };
            }
            if (msg.type === 'HEARTBEAT') {
                return agentC.handleHeartbeat(msg);
            }
            throw new Error(`Unsupported msg on C: ${msg.type}`);
        });

        const leaseManagerA = new DistributedLeaseManager('node-a', 'test/ztan/primary', undefined, true);
        await leaseManagerA.acquireLeadership(1);
        const quorumStore = new QuorumReplicatedStore<any>(coordinatorA, leaseManagerA);

        // ─── Scenario 1: Liveness & Heartbeat evictions ───
        total++;
        logger.info('💓 [Scenario 1] Checking membership health heartbeats and eviction transitions...');
        try {
            coordinatorA.startHeartbeatMonitoring();

            // Wait for heartbeats to run and establish ACTIVE states
            await new Promise(res => setTimeout(res, 300));

            const mB = coordinatorA.membershipManager.getMember('node-b');
            const mC = coordinatorA.membershipManager.getMember('node-c');
            assert(mB?.state === MembershipState.ACTIVE, `Node-b should be ACTIVE, got ${mB?.state}`);
            assert(mC?.state === MembershipState.ACTIVE, `Node-c should be ACTIVE, got ${mC?.state}`);

            // Kill Node C
            logger.info('💥 Stopping transport C to trigger suspicion and eviction thresholds...');
            await transportC.stop();

            // Wait for suspicion threshold (200ms)
            await new Promise(res => setTimeout(res, 250));
            assert(mC?.state === MembershipState.SUSPECT, `Node-c should be SUSPECT, got ${mC?.state}`);

            // Wait for eviction threshold (500ms)
            await new Promise(res => setTimeout(res, 350));
            assert(mC?.state === MembershipState.DISCONNECTED, `Node-c should be DISCONNECTED, got ${mC?.state}`);

            logger.info('  ✅ PASS: Heartbeat monitoring and eviction transitions verified');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 1');
        }

        // ─── Scenario 2: Dynamic Quorum & Safe Fencing ───
        total++;
        logger.info('🛡️  [Scenario 2] Verifying degraded quorum write success and complete write fencing...');
        try {
            // Write payload with node-c down. Quorum of 2/3 (node-a, node-b) is active, so this should succeed.
            const block = await quorumStore.appendWithQuorum({ val: 'written with C down' });
            assert(block.sequence === 1, `Expected sequence 1, got ${block.sequence}`);

            // Stop Node B transport to fall below quorum required
            logger.info('💥 Stopping transport B to drop below majority quorum...');
            await transportB.stop();

            // Wait for eviction thresholds to execute
            await new Promise(res => setTimeout(res, 600));

            // Write should now be fenced
            let threwQuorumErr = false;
            try {
                await quorumStore.appendWithQuorum({ val: 'fenced write' });
            } catch (err: any) {
                if (err instanceof QuorumDurabilityException) {
                    threwQuorumErr = true;
                }
            }
            assert(threwQuorumErr === true, 'Writes must be fenced when active membership is below quorum');

            logger.info('  ✅ PASS: Degradation write success and fenced safety limits verified');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 2');
        }

        // ─── Scenario 3: Connection Supervisor Timeout ───
        total++;
        logger.info('📡 [Scenario 3] Verifying Connection Supervisor bounded connection timeout...');
        try {
            // Try connecting to a non-existent port (e.g. 59999) using a test transport
            const testTransport = new TcpReplicationTransport('test-node', 59999);
            testTransport.addPeer('offline-peer', '127.0.0.1', 59998);

            const start = Date.now();
            let threwConnTimeout = false;
            try {
                await testTransport.send('offline-peer', {
                    type: 'APPEND_ENTRIES',
                    senderId: 'test-node',
                    epoch: 1
                }, 1);
            } catch (err: any) {
                if (err.message.includes('timeout') || err.message.includes('ECONNREFUSED')) {
                    threwConnTimeout = true;
                }
            }
            const duration = Date.now() - start;
            assert(threwConnTimeout === true, 'Should throw a connection error or timeout');
            assert(duration < 2500, `Connection attempt should fail quickly, took ${duration}ms`);

            logger.info('  ✅ PASS: Socket connection timeout bounds enforced correctly');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 3');
        }

        // ─── Scenario 4: Replication Flow Control & Backpressure ───
        total++;
        logger.info('⏳ [Scenario 4] Verifying write path backpressure triggers...');
        try {
            // Configure coordinator with custom maxInFlight = 1
            const customCoordinator = new ReplicatedWalCoordinator<any>('leader', walA, transportA);
            (customCoordinator as any).flowController = new (class extends (customCoordinator as any).flowController.constructor {
                constructor() {
                    super(1, 100); // 1 maxInFlight, 100ms acquire timeout
                }
            })();

            // Acquire slot once to occupy the limit
            await customCoordinator.flowController.acquireWriteSlot();

            // Attempting to append replicated now should block and time out due to flow limits
            let threwFlowTimeout = false;
            try {
                await customCoordinator.appendReplicated({ txn: 'blocked' });
            } catch (err: any) {
                if (err.message.includes('Timeout waiting for replication slot')) {
                    threwFlowTimeout = true;
                }
            }
            assert(threwFlowTimeout === true, 'Should trigger backpressure exception when queue is full');

            logger.info('  ✅ PASS: Write path replication flow-control backpressure verified');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 4');
        }

        // Cleanup
        coordinatorA.stopHeartbeatMonitoring();
        leaseManagerA.releaseLeadership();
        walA.closeActiveSegment();
        walB.closeActiveSegment();
        walC.closeActiveSegment();
        await transportA.stop();
        await transportB.stop();
        await transportC.stop();
        this.cleanTestDir();

        logger.info(`🏁 [TEST] COMPLETED: ${passed}/${total} Scenarios Passed.`);
        if (passed !== total) {
            throw new Error(`Cluster Governance Test Failed: only ${passed}/${total} passed.`);
        }
    }
}

function assert(condition: any, message: string) {
    if (!condition) {
        console.error(`❌ FAILED ASSERTION: ${message}`);
        throw new Error(message);
    }
}

const tester = new ClusterGovernanceTester();
tester.run()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Fatal cluster governance test failure:', err.message);
        process.exit(1);
    });

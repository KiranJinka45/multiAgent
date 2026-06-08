import * as fs from 'node:fs';
import * as path from 'node:path';
import { 
    DurableSegmentedWal, 
    TcpReplicationTransport,
    FollowerSyncAgent,
    ReplicatedWalCoordinator,
    QuorumReplicatedStore,
    DistributedLeaseManager,
    canonicalizeJson
} from '../../packages/production-pilot/src/index.js';
import { logger } from '../../packages/observability/src/index.js';

class TcpClusterTester {
    private testDir = path.join(process.cwd(), '.ztan', 'test-tcp-cluster-' + Math.random().toString(36).substr(2, 9));

    private cleanTestDir() {
        if (fs.existsSync(this.testDir)) {
            fs.rmSync(this.testDir, { recursive: true, force: true });
        }
    }

    async run() {
        logger.info('🏁 [TEST] Starting PHASE O: REAL TCP NETWORK TRANSPORT TEST CAMPAIGN');
        let passed = 0;
        let total = 0;

        this.cleanTestDir();

        const dirA = path.join(this.testDir, 'node-a');
        const dirB = path.join(this.testDir, 'node-b');
        const dirC = path.join(this.testDir, 'node-c');

        const walA = new DurableSegmentedWal<any>({ walDir: dirA, syncEveryWrite: true });
        const walB = new DurableSegmentedWal<any>({ walDir: dirB, syncEveryWrite: true });
        const walC = new DurableSegmentedWal<any>({ walDir: dirC, syncEveryWrite: true });

        const portA = 40000 + Math.floor(Math.random() * 10000);
        const portB = portA + 1;
        const portC = portA + 2;

        const transportA = new TcpReplicationTransport('node-a', portA);
        const transportB = new TcpReplicationTransport('node-b', portB);
        let transportC = new TcpReplicationTransport('node-c', portC);

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

        transportA.registerNode('node-a', async (msg) => {
            if (msg.type === 'SYNC_REQUEST') {
                const responsePayload = coordinatorA.handleSyncRequest(msg.payload);
                return {
                    type: 'SYNC_RESPONSE',
                    senderId: 'node-a',
                    epoch: msg.epoch,
                    payload: responsePayload
                };
            }
            throw new Error(`Unsupported message type for leader: ${msg.type}`);
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
            throw new Error(`Unsupported message for node-b: ${msg.type}`);
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
            throw new Error(`Unsupported message for node-c: ${msg.type}`);
        });

        const leaseManagerA = new DistributedLeaseManager('node-a', 'test/ztan/primary', undefined, true);
        await leaseManagerA.acquireLeadership(10);
        const quorumStore = new QuorumReplicatedStore<any>(coordinatorA, leaseManagerA);

        // ─── Scenario 1: TCP Quorum Write Success ───
        total++;
        logger.info('📂 [Scenario 1] Verifying quorum write success over real TCP sockets...');
        try {
            const block = await quorumStore.appendWithQuorum({ msg: 'TCP Transaction 1' });
            assert(block.sequence === 1, `Expected sequence 1, got ${block.sequence}`);

            // Allow network time
            await new Promise(res => setTimeout(res, 100));

            const recoveredB = walB.recoverLedger();
            const recoveredC = walC.recoverLedger();

            assert(recoveredB.length === 1, `Follower B should have 1 block, has ${recoveredB.length}`);
            assert(recoveredC.length === 1, `Follower C should have 1 block, has ${recoveredC.length}`);

            logger.info('  ✅ PASS: Replication achieved over TCP sockets');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 1');
        }

        // ─── Scenario 2: Node Crash and TCP Reconnect ───
        total++;
        logger.info('🛡️  [Scenario 2] Verifying quorum write success despite node crash, followed by reconnect...');
        try {
            // Stop node C
            await transportC.stop();

            // Append should still succeed because node A and B make a quorum of 2
            const block2 = await quorumStore.appendWithQuorum({ msg: 'TCP Transaction 2' });
            assert(block2.sequence === 2, `Expected sequence 2, got ${block2.sequence}`);
            
            // Allow network time
            await new Promise(res => setTimeout(res, 100));
            
            const recoveredB = walB.recoverLedger();
            assert(recoveredB.length === 2, `Follower B should have 2 blocks, has ${recoveredB.length}`);

            // Bring node C back up
            transportC = new TcpReplicationTransport('node-c', portC);
            transportC.addPeer('node-a', '127.0.0.1', portA);
            transportC.addPeer('node-b', '127.0.0.1', portB);
            transportC.addPeer('node-c', '127.0.0.1', portC);
            await transportC.start();

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
                throw new Error(`Unsupported message for node-c: ${msg.type}`);
            });
            
            // Add reference to transport A so it can connect to the new transport C
            transportA.addPeer('node-c', '127.0.0.1', portC);

            // Wait for reconnect and anti-entropy sync
            const caughtUp = await agentC.runAntiEntropySync('node-a', transportC);
            assert(caughtUp === 1, `Expected 1 caught up blocks, got ${caughtUp}`);

            const recoveredC = walC.recoverLedger();
            assert(recoveredC.length === 2, `Follower C should have 2 blocks, has ${recoveredC.length}`);

            logger.info('  ✅ PASS: Quorum achieved despite crash; TCP reconnect and sync succeeded.');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 2');
        }

        // Cleanup
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
            throw new Error(`TCP Cluster Integration Test Failed: only ${passed}/${total} passed.`);
        }
        logger.info('🎉 [SYSTEM CLUSTER SECURE] Real TCP networking successfully replaced simulated transports.');
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

const tester = new TcpClusterTester();
tester.run()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Fatal cluster test failure:', err.message);
        process.exit(1);
    });

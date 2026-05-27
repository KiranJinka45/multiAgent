import * as fs from 'node:fs';
import * as path from 'node:path';
import {
    DurableSegmentedWal,
    TcpReplicationTransport,
    VectorClock,
    DiagnosticControlPlane
} from '../../packages/production-pilot/src/index.js';
import type { TimelineEvent } from '../../packages/production-pilot/src/index.js';
import { logger } from '../../packages/observability/src/index.js';

class ControlPlaneTester {
    private tmpWalDir1 = path.join(process.cwd(), 'scratch', 'test-wal-cp-1');
    private tmpWalDir2 = path.join(process.cwd(), 'scratch', 'test-wal-cp-2');
    
    private wal1!: DurableSegmentedWal;
    private wal2!: DurableSegmentedWal;
    private transport1!: TcpReplicationTransport;
    private transport2!: TcpReplicationTransport;
    private clock1!: VectorClock;
    private controlPlane!: DiagnosticControlPlane;
    
    private basePort = 45000 + Math.floor(Math.random() * 2000);
    private port1 = this.basePort;
    private port2 = this.basePort + 1;
    private apiPort = this.basePort + 2;

    private cleanDirectories() {
        if (fs.existsSync(this.tmpWalDir1)) fs.rmSync(this.tmpWalDir1, { recursive: true, force: true });
        if (fs.existsSync(this.tmpWalDir2)) fs.rmSync(this.tmpWalDir2, { recursive: true, force: true });
    }

    async run() {
        logger.info('🏁 [TEST] Starting Phase P: Control Plane & Diagnostics Test');
        let passed = 0;
        let total = 0;

        this.cleanDirectories();
        fs.mkdirSync(this.tmpWalDir1, { recursive: true });
        fs.mkdirSync(this.tmpWalDir2, { recursive: true });

        // Initialize WALs
        this.wal1 = new DurableSegmentedWal({ walDir: this.tmpWalDir1 });
        this.wal2 = new DurableSegmentedWal({ walDir: this.tmpWalDir2 });

        // Seed blocks
        this.wal1.append({ name: 'workflow-start', stepId: 'step-init' });
        this.wal1.append({ name: 'workflow-step-1', stepId: 'step-check-funds', vectorClock: { 'node-1': 1 } });
        this.wal1.append({ name: 'workflow-step-2', stepId: 'step-charge-wallet', vectorClock: { 'node-1': 2, 'node-2': 1 } });

        // Set up transports
        this.transport1 = new TcpReplicationTransport('node-1', this.port1);
        this.transport2 = new TcpReplicationTransport('node-2', this.port2);

        this.transport1.addPeer('node-2', '127.0.0.1', this.port2);
        this.transport2.addPeer('node-1', '127.0.0.1', this.port1);

        await this.transport1.start();
        await this.transport2.start();

        // Vector clock
        this.clock1 = new VectorClock('node-1');
        this.clock1.tick();
        this.clock1.tick();

        // Control Plane
        this.controlPlane = new DiagnosticControlPlane('node-1', this.transport1, this.wal1, this.clock1);
        await this.controlPlane.startHttpServer(this.apiPort);

        // ─── Scenario 1: Query Vector Clocks over HTTP API ───
        total++;
        logger.info('⏱️ [Scenario 1] Querying vector clocks...');
        try {
            const res = await fetch(`http://127.0.0.1:${this.apiPort}/api/diagnostics/vector-clocks`);
            assert(res.ok, 'HTTP request succeeded');
            const data = await res.json() as any;
            assert(data.clocks !== undefined, 'clocks returned');
            assert(data.clocks['node-1'] === 2, 'node-1 clock value matches');
            logger.info('  ✅ PASS: Vector Clocks HTTP query verified');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 1');
        }

        // ─── Scenario 2: Retrieve Lineage DAG over HTTP API ───
        total++;
        logger.info('🌿 [Scenario 2] Fetching Lineage DAG...');
        try {
            const res = await fetch(`http://127.0.0.1:${this.apiPort}/api/diagnostics/lineage?taskId=workflow-abc`);
            assert(res.ok, 'HTTP request succeeded');
            const dag = await res.json() as any;
            assert(Array.isArray(dag.nodes), 'Nodes array returned');
            assert(Array.isArray(dag.edges), 'Edges array returned');
            
            const blockNodes = dag.nodes.filter((n: any) => n.type === 'block');
            const stepNodes = dag.nodes.filter((n: any) => n.type === 'step');
            assert(blockNodes.length >= 3, 'Found at least 3 block nodes');
            assert(stepNodes.length >= 3, 'Found at least 3 step nodes');
            
            const causalEdges = dag.edges.filter((e: any) => e.type === 'causal');
            assert(causalEdges.length >= 2, 'Found causal dependency edges');
            
            logger.info('  ✅ PASS: Lineage DAG HTTP query verified');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 2');
        }

        // ─── Scenario 3: Diff timelines for divergence over HTTP API ───
        total++;
        logger.info('🔍 [Scenario 3] Diffing timelines...');
        try {
            const baseline: TimelineEvent[] = [
                { type: 'side-effect', id: 'effect-1', name: 'api_fetch', details: { value: 100 }, order: 0 }
            ];
            const matchingReplay: TimelineEvent[] = [
                { type: 'side-effect', id: 'effect-1', name: 'api_fetch', details: { value: 100 }, order: 0 }
            ];
            const divergingReplay: TimelineEvent[] = [
                { type: 'side-effect', id: 'effect-1', name: 'api_fetch', details: { value: 105 }, order: 0 }
            ];

            const matchRes = await fetch(`http://127.0.0.1:${this.apiPort}/api/diagnostics/diff`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ baseline, replay: matchingReplay })
            });
            assert(matchRes.ok, 'Match POST request succeeded');
            const matchData = await matchRes.json() as any;
            assert(matchData.diverged === false, 'Matching timelines correctly reported');

            const divRes = await fetch(`http://127.0.0.1:${this.apiPort}/api/diagnostics/diff`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ baseline, replay: divergingReplay })
            });
            assert(divRes.ok, 'Divergence POST request succeeded');
            const divData = await divRes.json() as any;
            assert(divData.diverged === true, 'Diverging timelines correctly reported');
            assert(divData.mismatchType === 'payload-mismatch', 'Divergence reason payload mismatch');

            logger.info('  ✅ PASS: Trace diffing over HTTP verified');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 3');
        }

        // ─── Scenario 4: Monitor cluster health, ports, and quorum ───
        total++;
        logger.info('🌐 [Scenario 4] Checking cluster health...');
        try {
            const res = await fetch(`http://127.0.0.1:${this.apiPort}/api/diagnostics/health`);
            assert(res.ok, 'HTTP request succeeded');
            const health = await res.json() as any;
            assert(health.status === 'OPTIMAL', 'Cluster health is optimal');
            assert(health.quorum === true, 'Quorum achieved');

            const node1 = health.nodes.find((n: any) => n.nodeId === 'node-1');
            const node2 = health.nodes.find((n: any) => n.nodeId === 'node-2');
            assert(node1.status === 'ONLINE', 'node-1 is online');
            assert(node2.status === 'ONLINE', 'node-2 is online');

            // Stop node 2
            await this.transport2.stop();

            // Query again
            const res2 = await fetch(`http://127.0.0.1:${this.apiPort}/api/diagnostics/health`);
            assert(res2.ok, 'Second HTTP request succeeded');
            const health2 = await res2.json() as any;
            
            const node2Updated = health2.nodes.find((n: any) => n.nodeId === 'node-2');
            assert(node2Updated.status === 'OFFLINE', 'node-2 is offline after stop');

            logger.info('  ✅ PASS: Cluster health and quorum monitoring verified');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 4');
        }

        // Cleanup
        await this.controlPlane.stopHttpServer();
        await this.transport1.stop();
        await this.transport2.stop();
        this.wal1.closeActiveSegment();
        this.wal2.closeActiveSegment();
        this.cleanDirectories();

        logger.info(`🏁 [TEST] COMPLETED: ${passed}/${total} Scenarios Passed.`);
        if (passed !== total) {
            throw new Error(`Control Plane Test Failed: only ${passed}/${total} passed.`);
        }
    }
}

function assert(condition: any, message: string) {
    if (!condition) {
        console.error(`❌ FAILED ASSERTION: ${message}`);
        throw new Error(message);
    }
}

const tester = new ControlPlaneTester();
tester.run()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Fatal control plane test failure:', err.message);
        process.exit(1);
    });

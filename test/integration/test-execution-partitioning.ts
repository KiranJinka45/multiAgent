import * as fs from 'node:fs';
import * as path from 'node:path';
import * as net from 'node:net';
import {
    DurableSegmentedWal,
    WorkflowOrchestrator,
    DurableWorkflowContext,
    ConsistentHashRing,
    PartitionManager,
    WorkflowHistoryService,
    ResourceRegistry,
    TcpReplicationTransport
} from '../../packages/production-pilot/src/index.js';
import { logger } from '../../packages/observability/src/index.js';

class ExecutionPartitioningTester {
    private testDir = path.join(process.cwd(), 'scratch', 'test-partitioning-' + Math.random().toString(36).substr(2, 9));
    private resourceRegistry = new ResourceRegistry();

    private cleanTestDir() {
        if (!fs.existsSync(this.testDir)) return;
        for (let i = 0; i < 5; i++) {
            try {
                fs.rmSync(this.testDir, { recursive: true, force: true });
                return;
            } catch (e: any) {
                if (i === 4) {
                    logger.warn(`Failed to clean test directory ${this.testDir}: ${e.message}`);
                } else {
                    const start = Date.now();
                    while (Date.now() - start < 50) {}
                }
            }
        }
    }

    async run() {
        logger.info('🏁 [TEST] Starting Phase T: Workflow History Service & Partitioning Tests');
        let passed = 0;
        let total = 0;

        this.cleanTestDir();
        fs.mkdirSync(this.testDir, { recursive: true });

        // ─── Scenario 1: Consistent Hashing Ring & Partitioning ───
        total++;
        logger.info('⭕ [Scenario 1] Verifying consistent hashing distribution...');
        try {
            const ring = new ConsistentHashRing(5);
            ring.addNode('node-a');
            ring.addNode('node-b');
            ring.addNode('node-c');

            const counts = { 'node-a': 0, 'node-b': 0, 'node-c': 0 };
            for (let i = 0; i < 300; i++) {
                const owner = ring.getNode(`workflow-${i}`);
                assert(owner !== null, 'Owner must be found');
                counts[owner as keyof typeof counts]++;
            }

            logger.info(`  Hash Ring distribution: node-a=${counts['node-a']}, node-b=${counts['node-b']}, node-c=${counts['node-c']}`);
            // Check that all nodes receive a share of the partition space
            assert(counts['node-a'] > 0, 'Node A should own some workflows');
            assert(counts['node-b'] > 0, 'Node B should own some workflows');
            assert(counts['node-c'] > 0, 'Node C should own some workflows');

            logger.info('  ✅ PASS: Consistent hashing ring distribution verified');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 1');
            console.error(e);
        }

        // ─── Scenario 2: Workflow Routing over TCP ───
        total++;
        logger.info('📡 [Scenario 2] Verifying workflow routing to partition owner over TCP...');
        try {
            const transportA = new TcpReplicationTransport('node-a', 4085);
            const transportB = new TcpReplicationTransport('node-b', 4086);

            transportA.addPeer('node-b', '127.0.0.1', 4086);
            transportB.addPeer('node-a', '127.0.0.1', 4085);

            this.resourceRegistry.registerHook(async () => {
                await transportA.stop();
            });
            this.resourceRegistry.registerHook(async () => {
                await transportB.stop();
            });

            await transportA.start();
            await transportB.start();

            // Set up partition manager
            const pmA = new PartitionManager('node-a');
            pmA.addNode('node-b');
            const pmB = new PartitionManager('node-b');
            pmB.addNode('node-a');

            // Find workflow IDs mapping specifically to node-a and node-b
            let localId = '';
            let remoteId = '';
            for (let i = 0; i < 1000; i++) {
                const id = `test-flow-${i}`;
                if (pmA.isLocal(id) && !localId) localId = id;
                if (!pmA.isLocal(id) && pmA.getOwner(id) === 'node-b' && !remoteId) remoteId = id;
                if (localId && remoteId) break;
            }

            const walA = new DurableSegmentedWal<any>({ walDir: path.join(this.testDir, 'wal-a') });
            const walB = new DurableSegmentedWal<any>({ walDir: path.join(this.testDir, 'wal-b') });

            this.resourceRegistry.registerHook(async () => {
                walA.closeActiveSegment();
            });
            this.resourceRegistry.registerHook(async () => {
                walB.closeActiveSegment();
            });

            const orchestratorA = new WorkflowOrchestrator('node-a', walA, 1, pmA, undefined, transportA);
            const orchestratorB = new WorkflowOrchestrator('node-b', walB, 1, pmB, undefined, transportB);

            // Register handlers for ROUTE_WORKFLOW
            transportA.registerNode('node-a', async (msg) => {
                if (msg.type === 'ROUTE_WORKFLOW') {
                    const { action, workflowId, name, input } = msg.payload;
                    if (action === 'start') {
                        try {
                            const p = await orchestratorA.startWorkflow(workflowId, name, input);
                            const result = await p;
                            return {
                                type: 'ROUTE_WORKFLOW',
                                senderId: 'node-a',
                                epoch: msg.epoch,
                                payload: { result }
                            };
                        } catch (err: any) {
                            return {
                                type: 'ROUTE_WORKFLOW',
                                senderId: 'node-a',
                                epoch: msg.epoch,
                                payload: { error: err.message }
                            };
                        }
                    }
                }
                throw new Error('Unsupported');
            });

            transportB.registerNode('node-b', async (msg) => {
                if (msg.type === 'ROUTE_WORKFLOW') {
                    const { action, workflowId, name, input } = msg.payload;
                    if (action === 'start') {
                        try {
                            const p = await orchestratorB.startWorkflow(workflowId, name, input);
                            const result = await p;
                            return {
                                type: 'ROUTE_WORKFLOW',
                                senderId: 'node-b',
                                epoch: msg.epoch,
                                payload: { result }
                            };
                        } catch (err: any) {
                            return {
                                type: 'ROUTE_WORKFLOW',
                                senderId: 'node-b',
                                epoch: msg.epoch,
                                payload: { error: err.message }
                            };
                        }
                    }
                }
                throw new Error('Unsupported');
            });

            orchestratorA.defineWorkflow('simple', async (ctx: DurableWorkflowContext, input: any) => {
                return 'result-from-a-' + input;
            });
            orchestratorB.defineWorkflow('simple', async (ctx: DurableWorkflowContext, input: any) => {
                return 'result-from-b-' + input;
            });

            // Node A starts remoteId (owned by Node B)
            // It should route request to Node B, Node B completes it, Node A receives the response
            const routedPromise = await orchestratorA.startWorkflow(remoteId, 'simple', 'hello');
            const result = await routedPromise;

            assert(result === 'result-from-b-hello', `Expected result-from-b-hello, got: ${result}`);

            logger.info('  ✅ PASS: Workflow routing over TCP verified');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 2');
            console.error(e);
        }

        // ─── Scenario 3: Workflow History Service & Querying ───
        total++;
        logger.info('💾 [Scenario 3] Verifying Workflow History Service search and filter queries...');
        try {
            const historyDir = path.join(this.testDir, 'history-db');
            const historyService = new WorkflowHistoryService(historyDir);
            this.resourceRegistry.registerHook(async () => {
                historyService.close();
            });

            const record1 = {
                workflowId: 'flow-s3-1',
                name: 'concat-flow',
                status: 'COMPLETED' as const,
                createdAt: Date.now() - 10000,
                updatedAt: Date.now() - 5000,
                ownerNodeId: 'node-a',
                epoch: 1,
                history: [],
                retryCount: 0
            };
            const record2 = {
                workflowId: 'flow-s3-2',
                name: 'upper-flow',
                status: 'FAILED' as const,
                createdAt: Date.now() - 5000,
                updatedAt: Date.now(),
                ownerNodeId: 'node-b',
                epoch: 1,
                history: [],
                retryCount: 2
            };

            historyService.saveWorkflowHistory(record1);
            historyService.saveWorkflowHistory(record2);

            // Verify retrieval
            const got1 = historyService.getWorkflowHistory('flow-s3-1');
            assert(got1?.name === 'concat-flow', 'Should fetch record1 correctly');

            // Verify status queries
            const completed = historyService.queryWorkflows({ status: 'COMPLETED' });
            assert(completed.length === 1 && completed[0].workflowId === 'flow-s3-1', 'Completed query matches');

            const failed = historyService.queryWorkflows({ status: 'FAILED' });
            assert(failed.length === 1 && failed[0].workflowId === 'flow-s3-2', 'Failed query matches');

            // Verify search keywords
            const searchResults = historyService.searchWorkflows('concat');
            assert(searchResults.length === 1 && searchResults[0].workflowId === 'flow-s3-1', 'Search matches');

            logger.info('  ✅ PASS: Workflow History Service verified');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 3');
            console.error(e);
        }

        // ─── Scenario 4: Archival & Compaction Policy ───
        total++;
        logger.info('📦 [Scenario 4] Verifying automatic archival & active memory compaction...');
        try {
            const wal = new DurableSegmentedWal<any>({ walDir: path.join(this.testDir, 'wal-s4') });
            this.resourceRegistry.registerHook(async () => {
                wal.closeActiveSegment();
            });

            const historyDir = path.join(this.testDir, 'history-db-s4');
            const historyService = new WorkflowHistoryService(historyDir);
            this.resourceRegistry.registerHook(async () => {
                historyService.close();
            });

            const orchestrator = new WorkflowOrchestrator('node-a', wal, 1, undefined, historyService);
            orchestrator.defineWorkflow('compact-flow', async (ctx: DurableWorkflowContext) => {
                await ctx.step('step1', async () => 'ok');
                return 'done';
            });

            const workflowId = 'flow-4';
            const promise = await orchestrator.startWorkflow(workflowId, 'compact-flow', null);
            await promise;

            // Check that the active instances are deleted from orchestrator maps (Compaction)
            const activeInst = (orchestrator as any).workflows.get(workflowId);
            assert(activeInst === undefined, 'Active memory instance should be compacted/deleted');

            const activePromise = orchestrator.getActivePromise(workflowId);
            assert(activePromise === undefined, 'Active promise should be deleted');

            // Check that it can still be fetched through getWorkflow() (loads from history db)
            const resolvedInst = orchestrator.getWorkflow(workflowId);
            assert(resolvedInst !== undefined, 'Workflow must be retrievable from history db');
            assert(resolvedInst?.status === 'COMPLETED', `Status matches archived: ${resolvedInst?.status}`);

            logger.info('  ✅ PASS: Compaction and history archival policy verified');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 4');
            console.error(e);
        }

        // ─── Scenario 5: Windows Teardown Safety ───
        total++;
        logger.info('🧹 [Scenario 5] Verifying leak-free Windows teardown and cleanup...');
        try {
            const testRegistry = new ResourceRegistry();
            const tempDir = path.join(this.testDir, 'teardown-test');
            fs.mkdirSync(tempDir, { recursive: true });

            // Open a file handle
            const fd = fs.openSync(path.join(tempDir, 'lock.log'), 'a+');
            testRegistry.registerFd(fd);

            // Open a TCP Server
            const server = net.createServer();
            testRegistry.registerSocket(server);
            await new Promise<void>((resolve) => server.listen(4099, '127.0.0.1', () => resolve()));

            // Register a Timeout timer
            const timeout = setTimeout(() => {}, 100000);
            testRegistry.registerTimer(timeout);

            // Execute Teardown
            await testRegistry.teardown();

            // Try to delete the directory immediately (would fail if fd or server handles remained locked on Windows)
            fs.rmSync(tempDir, { recursive: true, force: true });
            assert(!fs.existsSync(tempDir), 'Directory should be deleted successfully');

            logger.info('  ✅ PASS: Teardown supervisor verified');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 5');
            console.error(e);
        }

        // Final cleanup
        await this.resourceRegistry.teardown();
        this.cleanTestDir();

        logger.info(`🏁 [TEST] COMPLETED: ${passed}/${total} Scenarios Passed.`);
        if (passed !== total) {
            throw new Error(`Execution Partitioning Test Failed: only ${passed}/${total} passed.`);
        }
    }
}

function assert(condition: any, message: string) {
    if (!condition) {
        console.error(`❌ FAILED ASSERTION: ${message}`);
        throw new Error(message);
    }
}

const tester = new ExecutionPartitioningTester();
tester.run()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Fatal execution partitioning test failure:', err.message);
        process.exit(1);
    });

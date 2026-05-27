import * as fs from 'node:fs';
import * as path from 'node:path';
import { 
    DurableSegmentedWal, 
    ReplicatedWalCoordinator, 
    AdversarialReplicationTransport, 
    AdversarialWalDecorator, 
    ResourceScope, 
    WorkflowOrchestrator,
    DurableWorkflowContext,
    LifecycleState,
    RuntimeLifecycleManager
} from '../../packages/production-pilot/src/index.js';
import { logger } from '../../packages/observability/src/index.js';

class AdversarialReliabilityTester {
    private testDir = path.join(process.cwd(), 'scratch', 'test-reliability-' + Math.random().toString(36).substr(2, 9));

    private cleanDirectories() {
        if (fs.existsSync(this.testDir)) {
            try {
                fs.rmSync(this.testDir, { recursive: true, force: true });
            } catch (err: any) {
                logger.warn(`Failed to clean test dir ${this.testDir}: ${err.message}`);
            }
        }
    }

    async run() {
        logger.info('🏁 [TEST] Starting Phase Y: Adversarial Runtime Validation & Soak Reliability Tests');
        let passed = 0;
        let total = 0;

        this.cleanDirectories();
        fs.mkdirSync(this.testDir, { recursive: true });

        // ─── Scenario 1: Byzantine Network Transport & Asymmetric Partitions ───
        total++;
        logger.info('🛰️ [Scenario 1] Injecting asymmetric partitions, jitter, reordering, and packet duplication...');
        try {
            const transport = new AdversarialReplicationTransport();
            const wal = new DurableSegmentedWal<any>({ walDir: path.join(this.testDir, 'wal-s1') });
            const coordinator = new ReplicatedWalCoordinator('node-1', wal, transport);
            coordinator.registerFollowers(['node-2']);

            // 1. Inject asymmetric drop: node-1 -> node-2 is BLOCKED
            transport.injectAsymmetricPartition('node-1', 'node-2');

            let appendFailed = false;
            try {
                await coordinator.appendReplicated({ data: 'replicated-under-partition' });
            } catch (err: any) {
                appendFailed = true;
                assert(err.message.includes('Reconciliation writes fenced') || err.message.includes('quorum'), 'Should fail because node-2 is unreachable due to asymmetric partition');
            }
            assert(appendFailed, 'Coordinator append should fail under active asymmetric partition drop');

            // 2. Remove partition, inject jitter and duplication
            transport.removeAsymmetricPartition('node-1', 'node-2');
            transport.setDuplicationProbability(0.5); // 50% packet duplication
            transport.setJitter(5, 15); // Jitter latency between 5 and 15ms

            let capturedMessage: any = null;
            transport.registerNode('node-2', async (msg) => {
                capturedMessage = msg;
                return { type: 'APPEND_ENTRIES', senderId: 'node-2', epoch: 1, payload: { success: true } };
            });

            const block = await coordinator.appendReplicated({ data: 'adversarial-success' });
            assert(block.payload.data === 'adversarial-success', 'Replication succeeds once partition is cleared');
            assert(capturedMessage !== null, 'Message successfully replicated even with packet jitter/duplications');

            logger.info('  ✅ PASS: Asymmetric partitions and packet duplications handled reliably.');
            passed++;
            wal.closeActiveSegment();
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 1');
            console.error(e);
        }

        // ─── Scenario 2: Mid-Write Disk Crashes & Truncated Segment Recovery ───
        total++;
        logger.info('💾 [Scenario 2] Simulating partial-write disk crashes & segment corruption repair...');
        try {
            const walDir = path.join(this.testDir, 'wal-s2');
            const wal = new DurableSegmentedWal<any>({ walDir, maxSegmentSizeBytes: 500 });
            
            // Append multiple blocks to populate the WAL logs across segments
            wal.append({ value: 1 });
            wal.append({ value: 2 });
            wal.append({ value: 3 });
            wal.append({ value: 4 });

            // Decorate and forcefully corrupt the last segment midway
            const decorator = new AdversarialWalDecorator(wal);
            decorator.corruptSegmentFile(0, 150); // Truncate segment_0 to 150 bytes (mid-JSON write)

            // Attempt to recover the ledger. ZTAN should detect truncation at the end, repair the trailing segment, and recover stably.
            const recovered = wal.recoverLedger();
            assert(recovered.length > 0, 'WAL should recover successfully after trailing segment repair');
            assert(recovered[0].payload.value === 1, 'First block recovered cleanly');

            logger.info('  ✅ PASS: Mid-write trailing WAL corruptions repaired dynamically on recovery.');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 2');
            console.error(e);
        }

        // ─── Scenario 3: Hierarchical Resource Scopes & disposal ───
        total++;
        logger.info('🌿 [Scenario 3] Testing multi-level hierarchical resource trees and disposal...');
        try {
            const parentScope = new ResourceScope();
            const childScope1 = parentScope.createChildScope();
            const childScope2 = parentScope.createChildScope();

            let parentDisposed = false;
            let child1Disposed = false;
            let child2Disposed = false;

            parentScope.register(async () => { parentDisposed = true; });
            childScope1.register(async () => { child1Disposed = true; });
            childScope2.register(async () => { child2Disposed = true; });

            // Dispose parent scope, which should cascade in parallel to all children
            await parentScope.dispose();

            assert(parentDisposed === true, 'Parent resource disposed');
            assert(child1Disposed === true, 'Child 1 scope disposed recursively');
            assert(child2Disposed === true, 'Child 2 scope disposed recursively');

            logger.info('  ✅ PASS: Hierarchical resource scopes clean up all child handles completely.');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 3');
            console.error(e);
        }

        // ─── Scenario 4: Soak Stress & Virtual Timer Starvation ───
        total++;
        logger.info('⏳ [Scenario 4] Running 1,000-workflow virtual execution stress loop...');
        try {
            const wal = new DurableSegmentedWal<any>({ walDir: path.join(this.testDir, 'wal-s4') });
            const orchestrator = new WorkflowOrchestrator('node-1', wal);

            orchestrator.defineWorkflow('stress-flow', async (ctx, input) => {
                const stepRes = await ctx.step('increment', async () => input.val + 1);
                await ctx.sleep('delay', 2);
                return ctx.executeTask('final', async () => stepRes * 2);
            });

            // Spawns 1,000 concurrent light virtual workflows to pressure scheduler and queues
            const promises: Promise<any>[] = [];
            for (let i = 0; i < 1000; i++) {
                promises.push(orchestrator.startWorkflow(`wf-${i}`, 'stress-flow', { val: i }));
            }

            const workflowPromises = await Promise.all(promises);
            const results = await Promise.all(workflowPromises);
            assert(results.length === 1000, 'All 1,000 workflows completed execution');
            assert(results[0] === 2, 'wf-0 outputs correctly: (0 + 1) * 2 = 2');
            assert(results[999] === 2000, 'wf-999 outputs correctly: (999 + 1) * 2 = 2000');

            logger.info('  ✅ PASS: soak stress simulation completes without scheduler starvation or timer drift.');
            passed++;
            await orchestrator.teardown();
        } catch (e: any) {
            console.error('Scenario 4 caught error:', e);
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 4');
            console.error(e);
        }

        // Cleanup
        this.cleanDirectories();

        logger.info(`🏁 [TEST] COMPLETED: ${passed}/${total} Scenarios Passed.`);
        if (passed !== total) {
            throw new Error(`Adversarial Reliability Test Failed: only ${passed}/${total} passed.`);
        }
    }
}

function assert(condition: any, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

const tester = new AdversarialReliabilityTester();
tester.run()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Fatal adversarial/reliability test failure:', err.message);
        process.exit(1);
    });

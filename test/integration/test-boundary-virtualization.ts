import { 
    DeterministicScheduler, 
    AsyncExecutionTracker, 
    VirtualTimerManager, 
    IngressJournal 
} from '../../packages/production-pilot/src/index.js';
import { logger } from '../../packages/observability/src/index.js';

class BoundaryVirtualizationTester {
    async run() {
        logger.info('🏁 [TEST] Starting PHASE H: RUNTIME BOUNDARY VIRTUALIZATION TEST CAMPAIGN');
        let passed = 0;
        let total = 0;

        // ─── Scenario 1: Async Hooks Causal Lineage ───
        total++;
        logger.info('⏳ [Scenario 1] Tracing nested Promise parentage and causal lineage...');
        try {
            AsyncExecutionTracker.initializeBoundary();

            const causalChain: number[] = [];

            await AsyncExecutionTracker.runWithContext({ causalId: 'root-task' }, async () => {
                const ctx = AsyncExecutionTracker.getContext();
                assert(ctx?.causalId === 'root-task', 'Context must be propagated to initial level');

                await Promise.resolve().then(async () => {
                    const ctxInner = AsyncExecutionTracker.getContext();
                    assert(ctxInner?.causalId === 'root-task', 'Context must be propagated through Promises');
                    
                    const path = AsyncExecutionTracker.getCausalPath();
                    assert(path.length >= 1, 'Causal lineage path ancestry should not be empty');
                });
            });

            AsyncExecutionTracker.disableBoundary();
            logger.info('  ✅ PASS: Native async_hooks and AsyncLocalStorage successfully propagate causal parent-child lineage');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 1');
        }

        // ─── Scenario 2: Global Timers Virtualization ───
        total++;
        logger.info('⏱️  [Scenario 2] Overriding global timer set/clear APIs inside scheduler...');
        try {
            const scheduler = new DeterministicScheduler(false);
            VirtualTimerManager.virtualizeTimers(scheduler);

            let timerTriggered = false;

            // Call standard global setTimeout
            globalThis.setTimeout(() => {
                timerTriggered = true;
            }, 100);

            // Flushes tasks. Since timers are virtualized, flushing immediately triggers them synchronously!
            const outcomes = await scheduler.flush();

            assert(outcomes.length === 1, 'Virtualized timer must be scheduled inside scheduler');
            assert(timerTriggered === true, 'Timer callback must execute synchronously inside flushed scheduler step');

            VirtualTimerManager.restoreTimers();
            logger.info('  ✅ PASS: Timers virtualization successfully intercepts timeouts and schedules them logically');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 2');
        }

        // ─── Scenario 3: Ingress Ingestion Journaling (Live Mode) ───
        total++;
        logger.info('📡 [Scenario 3] Journaling external async boundaries in Live Mode...');
        try {
            const journal = new IngressJournal(false); // Live mode

            // Simulate incoming network socket event
            const rawEvent = { socketId: 'sock-102', data: 'hello_world' };
            const registered = journal.registerBoundary('socket', rawEvent);

            assert(registered.boundary === 'socket', 'Boundary type must match');
            assert(registered.payload.socketId === 'sock-102', 'Logged payload must match raw event');
            assert(registered.order === 0, 'First log must have order index 0');
            assert(/^([a-f0-9]{16})$/.test(registered.ingressId), 'IngressId must be 16-char deterministic hash');

            logger.info('  ✅ PASS: Live mode successfully journals external boundary events and assigns order indices');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 3');
        }

        // ─── Scenario 4: Ingress Ingestion Journaling (Replay Mode) ───
        total++;
        logger.info('🔄 [Scenario 4] Replaying external async boundaries in Replay Mode...');
        try {
            // Live run: records event sequence
            const liveJournal = new IngressJournal(false);
            const ev1 = liveJournal.registerBoundary('watcher', { file: 'config.json', event: 'modify' });
            const logs = liveJournal.getLogs();

            // Replay run: loads journal offline
            const replayJournal = new IngressJournal(true);
            replayJournal.loadLogs(logs);

            const replayed = replayJournal.registerBoundary('watcher', { file: 'config.json', event: 'modify' });

            assert(replayed.ingressId === ev1.ingressId, 'Replayed event ID must match live run ID');
            assert(replayed.payload.file === 'config.json', 'Replayed event payload must match live run payload');

            logger.info('  ✅ PASS: Replay mode successfully resolves external async boundaries from execution journal');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 4');
        }

        // ─── Scenario 5: Ingress Divergence Detection ───
        total++;
        logger.info('🔬 [Scenario 5] Halting execution upon unjournaled async ingress events...');
        try {
            const replayJournal = new IngressJournal(true);
            // Journal is empty in replay mode

            let throws = false;
            try {
                // Trigger unjournaled socket ingress event in replay
                replayJournal.registerBoundary('socket', { socketId: 'sock-unknown' });
            } catch (err: any) {
                if (err.message.includes('Unregistered async boundary event detected in replay')) {
                    throws = true;
                    logger.info(`  Caught expected replay divergence exception: ${err.message}`);
                }
            }

            assert(throws === true, 'Replay execution must raise exception for unjournaled external ingress events');
            logger.info('  ✅ PASS: Ingress divergence checks successfully block unjournaled boundary execution paths');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 5');
        }

        logger.info(`🏁 [TEST] COMPLETED: ${passed}/${total} Scenarios Passed.`);
        if (passed !== total) {
            throw new Error(`Boundary Virtualization Integration Test Failed: only ${passed}/${total} passed.`);
        }
        logger.info('🎉 [SYSTEM BOUNDARY GOVERNED] Async hooks lineage, virtual timers, and ingress journals are fully verified.');
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

const tester = new BoundaryVirtualizationTester();
tester.run()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Fatal boundary virtualization test failure:', err.message);
        process.exit(1);
    });

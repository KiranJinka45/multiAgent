import { 
    DeterministicScheduler, 
    VectorClock, 
    ConcurrencyJournal 
} from '../../packages/production-pilot/src/index.js';
import { logger } from '../../packages/observability/src/index.js';

interface ConcurrencyState {
    executedTasks: string[];
    logs: string[];
}

class DeterministicSchedulerTester {
    async run() {
        logger.info('🏁 [TEST] Starting PHASE G: DETERMINISTIC SCHEDULER & CONCURRENCY TEST CAMPAIGN');
        let passed = 0;
        let total = 0;

        // ─── Scenario 1: Governed Virtual Scheduling ───
        total++;
        logger.info('⏳ [Scenario 1] Validating virtual sequential task scheduling...');
        try {
            const scheduler = new DeterministicScheduler(false); // Live mode

            const executionOrder: string[] = [];

            scheduler.schedule('Task A', async () => {
                executionOrder.push('A');
                return 'result-A';
            });
            scheduler.schedule('Task B', async () => {
                executionOrder.push('B');
                return 'result-B';
            });
            scheduler.schedule('Task C', async () => {
                executionOrder.push('C');
                return 'result-C';
            });

            const outcomes = await scheduler.flush();

            assert(outcomes.length === 3, 'Must execute exactly 3 tasks');
            assert(executionOrder.join(',') === 'A,B,C', 'Tasks must execute in strict sequential enqueued order');
            assert(outcomes[0].result === 'result-A', 'Outcomes must contain correct execution results');

            logger.info('  ✅ PASS: Governed virtual scheduler executes asynchronous callbacks in a deterministic sequential pipeline');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 1');
        }

        // ─── Scenario 2: Causal Vector Clocks & Lamport Causality Boundaries ───
        total++;
        logger.info('🧬 [Scenario 2] Enforcing Lamport/Vector Clock causality boundaries...');
        try {
            // Node US and Node EU operating concurrently
            const vcUS = new VectorClock('node-us');
            const vcEU = new VectorClock('node-eu');

            // 1. Tick local events
            vcUS.tick(); // US: { node-us: 1 }
            vcEU.tick(); // EU: { node-eu: 1 }

            // 2. Transmit event from US to EU (e.g. EU ingests US state)
            const dependencyHeader = vcUS.getClock(); // { node-us: 1 }
            
            // Check causal eligibility before ingestion:
            // Since EU has not ingested US yet, checking if EU is eligible for a downstream event depending on US:1:
            const isEligiblePre = vcEU.isCausallyEligible(dependencyHeader);
            assert(isEligiblePre === false, 'EU must not be causally eligible before ingesting dependencies');

            // Ingest dependency update
            vcEU.update(dependencyHeader); // EU merges US:1, ticks -> { node-us: 1, node-eu: 2 }

            // Check causal eligibility again
            const isEligiblePost = vcEU.isCausallyEligible(dependencyHeader);
            assert(isEligiblePost === true, 'EU must be causally eligible after merging vector clock dependencies');

            logger.info('  ✅ PASS: Logical Vector Clocks successfully govern cross-node event ordering and block out-of-order execution');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 2');
        }

        // ─── Scenario 3: Concurrency Race Interleaving Capture (Live Mode) ───
        total++;
        logger.info('📡 [Scenario 3] Capturing asynchronous Promise interleaving in Live Concurrency Journal...');
        try {
            const scheduler = new DeterministicScheduler(false);
            const journal = new ConcurrencyJournal();

            const vcLeader = new VectorClock('leader');
            const vcReplica = new VectorClock('replica');

            // We schedule tasks representing concurrent executions
            scheduler.schedule('Replicate WAL', async () => {
                vcLeader.tick();
                return 'replicated';
            });
            scheduler.schedule('Commit Transaction', async () => {
                vcReplica.update(vcLeader.getClock());
                return 'committed';
            });

            const outcomes = await scheduler.flush();
            const order = scheduler.getExecutionHistory(); // Captured scheduler order ['task-1', 'task-2']

            // Record this interleaving in the journal
            journal.recordInterleaving(101, order, { leader: vcLeader, replica: vcReplica });

            const record = journal.getRecord(101);
            assert(record !== undefined, 'Concurrency record at sequence 101 must exist');
            assert(record?.schedulerOrder.join(',') === 'task-1,task-2', 'Must record exact task execution order');
            assert(record?.vectorStates['leader']['leader'] === 1, 'Must record exact Leader vector clock state');

            logger.info('  ✅ PASS: Concurrency journal successfully captures interleaving history and vector states during live execution');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 3');
        }

        // ─── Scenario 4: Race-Equivalence Replay (Replay Mode) ───
        total++;
        logger.info('🔄 [Scenario 4] Replaying concurrent operations deterministically via Interleaving Journal...');
        try {
            // Live run: captures a specific asynchronous interleaving sequence where task-2 ran before task-1
            const liveOrder = ['task-2', 'task-1'];
            
            const replayScheduler = new DeterministicScheduler(true); // Replay mode!
            replayScheduler.loadReplayInterleaves(liveOrder);

            const executionOrder: string[] = [];

            // We schedule task 1 and task 2
            replayScheduler.schedule('Task 1', async () => {
                executionOrder.push('Task 1');
                return 'result-1';
            });
            replayScheduler.schedule('Task 2', async () => {
                executionOrder.push('Task 2');
                return 'result-2';
            });

            await replayScheduler.flush();

            // Replay scheduler must resolve them in the exact order captured by the journal ('Task 2' then 'Task 1'),
            // completely bypassing their original scheduling queue sequence!
            assert(executionOrder.join(',') === 'Task 2,Task 1', 'Replay scheduler must execute tasks in historical interleaving sequence');
            logger.info('  ✅ PASS: Replay scheduler successfully converges concurrent races to the exact captured interleaving sequence');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 4');
        }

        // ─── Scenario 5: Concurrency Divergence Detection ───
        total++;
        logger.info('🔬 [Scenario 5] Blocking out-of-order race executions and isolating divergence...');
        try {
            const scheduler = new DeterministicScheduler(true);
            // Captured live order expected task-1, but the replayed log skips task-1 or tries to execute task-2 out of causal order
            scheduler.loadReplayInterleaves(['task-1']);

            let task2Triggered = false;
            scheduler.schedule('Task 1', async () => {
                return '1';
            });
            scheduler.schedule('Task 2', async () => {
                task2Triggered = true;
                return '2';
            });

            const outcomes = await scheduler.flush();

            // Task 2 was never resolved because it was not in the captured scheduling interleaves for sequence block validation
            const resolvedIds = outcomes.filter(o => o.status === 'resolved').map(o => o.taskId);
            
            assert(resolvedIds.includes('task-1'), 'Task 1 must resolve');
            assert(resolvedIds.includes('task-2') === false, 'Task 2 must not be resolved since it is outside the interleaving log boundary');
            assert(task2Triggered === false, 'Task 2 callback must remain unexecuted');

            logger.info('  ✅ PASS: Concurrency engine successfully isolates race divergences and blocks out-of-order execution paths');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 5');
        }

        logger.info(`🏁 [TEST] COMPLETED: ${passed}/${total} Scenarios Passed.`);
        if (passed !== total) {
            throw new Error(`Deterministic Scheduler Integration Test Failed: only ${passed}/${total} passed.`);
        }
        logger.info('🎉 [SYSTEM CONCURRENCY GOVERNED] Virtual task scheduling, vector clocks, and race journals are fully verified.');
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

const tester = new DeterministicSchedulerTester();
tester.run()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Fatal scheduler governance test failure:', err.message);
        process.exit(1);
    });

import { 
    ImmutableEventStore, 
    StateConvergenceEngine, 
    ReplayDivergenceDetector,
    canonicalizeJson
} from '../../packages/production-pilot/src/index.js';
import { logger } from '../../packages/observability/src/index.js';
import crypto from 'node:crypto';

interface CounterState {
    count: number;
    lastUpdatedBy: string;
    history: number[];
}

interface CounterEvent {
    type: 'INCREMENT' | 'DECREMENT' | 'SET';
    value?: number;
    operator: string;
}

// 1. Pure, deterministic reducer
function counterReducer(state: CounterState, event: CounterEvent): CounterState {
    const nextHistory = [...state.history, state.count];
    if (event.type === 'INCREMENT') {
        return {
            count: state.count + (event.value ?? 1),
            lastUpdatedBy: event.operator,
            history: nextHistory
        };
    } else if (event.type === 'DECREMENT') {
        return {
            count: state.count - (event.value ?? 1),
            lastUpdatedBy: event.operator,
            history: nextHistory
        };
    } else if (event.type === 'SET') {
        return {
            count: event.value ?? 0,
            lastUpdatedBy: event.operator,
            history: nextHistory
        };
    }
    return state;
}

// 2. Non-deterministic reducer (for simulating drift)
function driftCounterReducer(state: CounterState, event: CounterEvent): CounterState {
    const nextHistory = [...state.history, state.count];
    if (event.operator === 'user-05') {
        // Inject non-deterministic behavior depending on external parameter/randomness
        return {
            count: state.count + 42, // deterministic drift to isolate the bug
            lastUpdatedBy: event.operator,
            history: nextHistory
        };
    }
    return counterReducer(state, event);
}

class DeterministicConvergenceTester {
    async run() {
        logger.info('🏁 [TEST] Starting PHASE D: DETERMINISTIC STATE CONVERGENCE TEST CAMPAIGN');
        let passed = 0;
        let total = 0;

        const initialState: CounterState = {
            count: 0,
            lastUpdatedBy: 'system-genesis',
            history: []
        };

        // ─── Scenario 1: Immutable Event Store & Integrity Chain ───
        total++;
        logger.info('⛓️  [Scenario 1] Validating Immutable Event Store integrity & hash chains...');
        try {
            const store = new ImmutableEventStore<CounterEvent>();
            store.append({ type: 'INCREMENT', value: 5, operator: 'op-01' });
            store.append({ type: 'INCREMENT', value: 10, operator: 'op-02' });
            store.append({ type: 'DECREMENT', value: 3, operator: 'op-03' });

            assert(store.getLength() === 3, 'Store must contain exactly 3 blocks');
            assert(store.verifyIntegrity() === true, 'Integrity check must pass for unmodified ledger');

            // Attempt tampering
            const blocks = store.getBlocks();
            blocks[1].payload.value = 999; // mutate inside block
            
            const tamperedStore = new ImmutableEventStore<CounterEvent>();
            // Sync blocks into a new store to check import/tamper validation
            let throws = false;
            try {
                tamperedStore.syncBlocks(blocks);
            } catch (err: any) {
                throws = true;
                logger.info(`  Caught expected clash/integrity failure: ${err.message}`);
            }

            assert(throws === true, 'Syncing tampered blocks must raise integrity exception');
            logger.info('  ✅ PASS: Event store ledger is cryptographically immutable and detects modifications');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 1');
        }

        // ─── Scenario 2: Deterministic Snapshotting & Purity ───
        total++;
        logger.info('📸 [Scenario 2] Testing state snapshotting and snapshot recovery...');
        try {
            const engine = new StateConvergenceEngine<CounterState, CounterEvent>(initialState, counterReducer, 2);
            engine.transition({ type: 'INCREMENT', value: 5, operator: 'op-01' }); // seq 1
            engine.transition({ type: 'INCREMENT', value: 10, operator: 'op-02' }); // seq 2 -> snap 2
            engine.transition({ type: 'DECREMENT', value: 2, operator: 'op-03' }); // seq 3

            const stateSeq3 = engine.getState();
            assert(stateSeq3.count === 13, 'State count at seq 3 should be 13');
            
            const snap2 = engine.getSnapshot(2);
            assert(snap2 !== undefined, 'Snapshot at seq 2 must be created');
            assert(snap2?.state.count === 15, 'Snapshot state count at seq 2 must be 15');

            // Load snapshot to restore state
            engine.loadSnapshot(snap2!);
            assert(engine.getSequence() === 2, 'Restored engine sequence should be 2');
            assert(engine.getState().count === 15, 'Restored engine count should be 15');

            logger.info('  ✅ PASS: State convergence engine successfully executes snapshots and restorations');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 2');
        }

        // ─── Scenario 3: Replay Equivalence Assertion ───
        total++;
        logger.info('🔄 [Scenario 3] Running Replay Equivalence Assertions...');
        try {
            const store = new ImmutableEventStore<CounterEvent>();
            const engine = new StateConvergenceEngine<CounterState, CounterEvent>(initialState, counterReducer, 5);

            const eventsList: CounterEvent[] = [
                { type: 'INCREMENT', value: 10, operator: 'op-A' },
                { type: 'INCREMENT', value: 5, operator: 'op-B' },
                { type: 'DECREMENT', value: 2, operator: 'op-C' },
                { type: 'SET', value: 50, operator: 'op-D' },
                { type: 'INCREMENT', value: 100, operator: 'op-E' }
            ];

            for (const ev of eventsList) {
                store.append(ev);
                engine.transition(ev);
            }

            const productionState = engine.getState();
            const snapshot5 = engine.getSnapshot(5);
            assert(snapshot5 !== undefined, 'Snapshot at seq 5 should exist');

            const blocks = store.getBlocks();
            const report = ReplayDivergenceDetector.assertEquivalence(
                productionState,
                { sequence: 0, state: initialState, stateHash: '' }, // Replay from genesis
                blocks,
                counterReducer
            );

            assert(report.diverged === false, 'Replaying from genesis must be fully equivalent');

            const reportFromSnap = ReplayDivergenceDetector.assertEquivalence(
                productionState,
                snapshot5!,
                blocks,
                counterReducer
            );
            assert(reportFromSnap.diverged === false, 'Replaying from snapshot 5 must be fully equivalent');

            logger.info('  ✅ PASS: Assertion system verifies equivalent execution and identical JCS state hashes');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 3');
        }

        // ─── Scenario 4: Gap Recovery Detection ───
        total++;
        logger.info('🕳️  [Scenario 4] Verifying sequence gap detection and recovery limits...');
        try {
            const store = new ImmutableEventStore<CounterEvent>();
            store.append({ type: 'INCREMENT', value: 10, operator: 'op-01' }); // sequence 1
            store.append({ type: 'INCREMENT', value: 5, operator: 'op-02' });  // sequence 2

            const block3 = {
                sequence: 4, // Intentionally skipped sequence 3!
                prevHash: 'dummy',
                timestamp: Date.now(),
                payload: { type: 'DECREMENT' as const, value: 2, operator: 'op-04' },
                hash: 'dummy'
            };

            const syncReport = store.syncBlocks([block3]);
            assert(syncReport.gapDetected === true, 'Store must catch structural sequence gaps');
            assert(syncReport.missingRange !== undefined, 'Missing range must be identified');
            assert(syncReport.missingRange?.[0] === 3 && syncReport.missingRange?.[1] === 3, 'Missing range must accurately highlight sequence 3');

            logger.info('  ✅ PASS: Gap recovery logic successfully flags out-of-order blocks and reports missing sequence bounds');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 4');
        }

        // ─── Scenario 5: Replay Divergence Isolation ───
        total++;
        logger.info('🔬 [Scenario 5] Tracking and isolating non-deterministic reducer drift...');
        try {
            const store = new ImmutableEventStore<CounterEvent>();
            const engine = new StateConvergenceEngine<CounterState, CounterEvent>(initialState, counterReducer, 2);

            const eventsList: CounterEvent[] = [
                { type: 'INCREMENT', value: 2, operator: 'user-01' }, // seq 1
                { type: 'INCREMENT', value: 4, operator: 'user-02' }, // seq 2
                { type: 'INCREMENT', value: 6, operator: 'user-03' }, // seq 3
                { type: 'INCREMENT', value: 8, operator: 'user-04' }, // seq 4
                { type: 'INCREMENT', value: 10, operator: 'user-05' }, // seq 5 -> Drift occurs here!
                { type: 'DECREMENT', value: 1, operator: 'user-06' }  // seq 6
            ];

            const liveStatesHistory = new Map<number, string>();

            for (const ev of eventsList) {
                store.append(ev);
                engine.transition(ev);
                
                // Track live hashes
                const serialized = canonicalizeJson(engine.getState());
                liveStatesHistory.set(engine.getSequence(), crypto.createHash('sha256').update(serialized).digest('hex'));
            }

            // Perform replay using the drift/non-deterministic reducer to simulate a buggy replay node
            const blocks = store.getBlocks();
            const divergenceSeq = ReplayDivergenceDetector.findDivergencePoint(
                liveStatesHistory,
                { sequence: 0, state: initialState, stateHash: '' },
                blocks,
                driftCounterReducer // drift at sequence 5
            );

            assert(divergenceSeq === 5, 'Divergence detector must identify sequence 5 as the drift origin point');
            logger.info(`  Isolated state divergence successfully to sequence: ${divergenceSeq}`);

            logger.info('  ✅ PASS: Divergence Isolation engine successfully pinpoints buggy state changes and non-deterministic logic');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 5');
        }

        logger.info(`🏁 [TEST] COMPLETED: ${passed}/${total} Scenarios Passed.`);
        if (passed !== total) {
            throw new Error(`State Convergence Integration Test Failed: only ${passed}/${total} passed.`);
        }
        logger.info('🎉 [SYSTEM DETERMINISTIC] State Convergence, Snapshotting, and Divergence Detection tests fully verified.');
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

const tester = new DeterministicConvergenceTester();
tester.run()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Fatal state convergence test failure:', err.message);
        process.exit(1);
    });

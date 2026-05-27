import { 
    ImmutableEventStore, 
    StateConvergenceEngine, 
    ReducerPurityGuard, 
    LogCompactor, 
    ReducerRegistry, 
    ReplayPerformanceTracker,
    PurityViolationError
} from '../../packages/production-pilot/src/index.js';
import { logger } from '../../packages/observability/src/index.js';

interface GovernanceState {
    value: number;
    updatedBy: string;
}

interface GovernanceEvent {
    type: 'ADD' | 'SUBTRACT';
    amount: number;
}

// 1. Pure, deterministic counter reducer
function pureReducer(state: GovernanceState, event: GovernanceEvent): GovernanceState {
    if (event.type === 'ADD') {
        return {
            value: state.value + event.amount,
            updatedBy: 'pure-operator'
        };
    } else if (event.type === 'SUBTRACT') {
        return {
            value: state.value - event.amount,
            updatedBy: 'pure-operator'
        };
    }
    return state;
}

// 2. Impure reducer containing Math.random() (forbidden)
function impureRandomReducer(state: GovernanceState, event: GovernanceEvent): GovernanceState {
    const randomShift = Math.random() > 0.5 ? 1 : 0; // Impurity!
    return {
        value: state.value + event.amount + randomShift,
        updatedBy: 'impure-random'
    };
}

// 3. Impure reducer containing Date.now() (forbidden)
function impureDateReducer(state: GovernanceState, event: GovernanceEvent): GovernanceState {
    const now = Date.now(); // Impurity!
    return {
        value: state.value + event.amount,
        updatedBy: `impure-date-${now}`
    };
}

class RuntimeGovernanceTester {
    async run() {
        logger.info('🏁 [TEST] Starting PHASE E: DETERMINISTIC RUNTIME GOVERNANCE TEST CAMPAIGN');
        let passed = 0;
        let total = 0;

        const initialState: GovernanceState = {
            value: 100,
            updatedBy: 'genesis'
        };

        // ─── Scenario 1: Static Impurity Analysis ───
        total++;
        logger.info('🔍 [Scenario 1] Validating static AST-style purity analysis...');
        try {
            const pureReport = ReducerPurityGuard.analyzeStatic(pureReducer);
            const randomReport = ReducerPurityGuard.analyzeStatic(impureRandomReducer);
            const dateReport = ReducerPurityGuard.analyzeStatic(impureDateReducer);

            assert(pureReport.passed === true, 'Pure reducer static check must pass');
            assert(pureReport.violations.length === 0, 'Pure reducer must have 0 violations');

            assert(randomReport.passed === false, 'Impure random reducer static check must fail');
            assert(randomReport.violations.includes('Math.random'), 'Must flag Math.random violation');

            assert(dateReport.passed === false, 'Impure date reducer static check must fail');
            assert(dateReport.violations.includes('Date.now'), 'Must flag Date.now violation');

            logger.info('  ✅ PASS: Static analyzer successfully catches impure keywords in source code');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 1');
        }

        // ─── Scenario 2: Runtime Impurity Guard & Sandboxing ───
        total++;
        logger.info('🛡️  [Scenario 2] Enforcing runtime global API interception stubs...');
        try {
            // Test Math.random interception
            let randomViolated = false;
            try {
                ReducerPurityGuard.executeGuarded(impureRandomReducer, initialState, { type: 'ADD', amount: 5 });
            } catch (err: any) {
                if (err instanceof PurityViolationError && err.violationType === 'RANDOMNESS') {
                    randomViolated = true;
                    logger.info(`  Caught expected runtime random stub exception: ${err.message}`);
                }
            }

            // Test Date.now interception
            let dateViolated = false;
            try {
                ReducerPurityGuard.executeGuarded(impureDateReducer, initialState, { type: 'ADD', amount: 5 });
            } catch (err: any) {
                if (err instanceof PurityViolationError && err.violationType === 'WALL_CLOCK') {
                    dateViolated = true;
                    logger.info(`  Caught expected runtime clock stub exception: ${err.message}`);
                }
            }

            assert(randomViolated === true, 'Runtime execution must block Math.random()');
            assert(dateViolated === true, 'Runtime execution must block Date.now()');

            // Verify clean recovery (globals restored)
            const number = Math.random();
            assert(typeof number === 'number', 'Math.random must be restored and function normally after sandboxed run');

            logger.info('  ✅ PASS: Sandboxed boundary successfully prevents runtime API leakage and recovers cleanly');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 2');
        }

        // ─── Scenario 3: WAL Compaction & Storage Bounds ───
        total++;
        logger.info('🗜️  [Scenario 3] Testing WAL Compaction and history pruning...');
        try {
            const store = new ImmutableEventStore<GovernanceEvent>();
            const engine = new StateConvergenceEngine<GovernanceState, GovernanceEvent>(initialState, pureReducer, 2);

            // Transition events
            const e1 = { type: 'ADD' as const, amount: 10 };
            const e2 = { type: 'ADD' as const, amount: 20 }; // snapshot at seq 2
            const e3 = { type: 'SUBTRACT' as const, amount: 5 };

            store.append(e1);
            engine.transition(e1);
            
            store.append(e2);
            engine.transition(e2);
            
            store.append(e3);
            engine.transition(e3);

            assert(store.getLength() === 3, 'Pre-compaction event length must be 3');
            
            const snapshot2 = engine.getSnapshot(2);
            assert(snapshot2 !== undefined, 'Snapshot at sequence 2 should exist');

            const compactionResult = LogCompactor.compact(store, snapshot2!);
            assert(compactionResult.prunedCount === 2, 'Must prune exactly 2 pre-snapshot events');
            assert(compactionResult.remainingCount === 1, 'Only 1 post-snapshot event should remain');
            assert(store.getLength() === 1, 'Event store length must reflect compaction');
            assert(store.getBlocks()[0].payload.amount === 5, 'Post-compaction block must be e3');

            logger.info('  ✅ PASS: WAL Compaction truncates early event streams successfully under memory boundaries');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 3');
        }

        // ─── Scenario 4: Reducer Schema Versioning ───
        total++;
        logger.info('🧬 [Scenario 4] Routing and executing versioned events...');
        try {
            const registry = new ReducerRegistry<GovernanceState>();

            // V1 Reducer (standard ADD behavior)
            registry.register('v1.0.0', pureReducer);

            // V2 Reducer (legacy override subtracting instead)
            registry.register('v2.0.0', (state, event) => {
                return {
                    value: state.value - event.amount,
                    updatedBy: 'versioned-v2-operator'
                };
            });

            const versionedRouter = registry.routeReducer();

            // Run sequence transitions using version headers
            let state = { ...initialState };
            
            // Apply event v1 (ADD 50 -> 150)
            state = versionedRouter(state, { schemaVersion: 'v1.0.0', payload: { type: 'ADD', amount: 50 } });
            assert(state.value === 150, 'V1 reducer should add');

            // Apply event v2 (ADD 20 -> 130 because of V2 override subtracting)
            state = versionedRouter(state, { schemaVersion: 'v2.0.0', payload: { type: 'ADD', amount: 20 } });
            assert(state.value === 130, 'V2 reducer should subtract despite type ADD');
            assert(state.updatedBy === 'versioned-v2-operator', 'State updatedBy should match v2 executor');

            logger.info('  ✅ PASS: Versioned event registry correctly maps dynamic schema routing rules');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 4');
        }

        // ─── Scenario 5: Replay Performance Bounds ───
        total++;
        logger.info('⏱️  [Scenario 5] Mapping replay throughput limits and telemetry envelopes...');
        try {
            const store = new ImmutableEventStore<GovernanceEvent>();
            // Stress event store with 1000 events to benchmark
            for (let i = 0; i < 1000; i++) {
                store.append({ type: 'ADD', amount: 1 });
            }

            const telemetry = ReplayPerformanceTracker.measureReplay(initialState, store, pureReducer);
            logger.info(`  Performance Telemetry Results:`);
            logger.info(`    - Processed Events: ${telemetry.eventsProcessed}`);
            logger.info(`    - Replay Duration: ${telemetry.replayDurationMs} ms`);
            logger.info(`    - Throughput: ${telemetry.throughputEventsPerSec} events/sec`);

            assert(telemetry.eventsProcessed === 1000, 'Must process exactly 1000 events');
            assert(telemetry.throughputEventsPerSec > 1000, 'Replay throughput must exceed 1000 events/sec baseline');

            logger.info('  ✅ PASS: Telemetry suite maps execution envelopes and guarantees high-performance bounds');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 5');
        }

        logger.info(`🏁 [TEST] COMPLETED: ${passed}/${total} Scenarios Passed.`);
        if (passed !== total) {
            throw new Error(`Deterministic Runtime Governance Test Failed: only ${passed}/${total} passed.`);
        }
        logger.info('🎉 [SYSTEM GOVERNED] Static analysis, runtime overrides, WAL compaction, schema versioning, and benchmarks are fully verified.');
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

const tester = new RuntimeGovernanceTester();
tester.run()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Fatal runtime governance test failure:', err.message);
        process.exit(1);
    });

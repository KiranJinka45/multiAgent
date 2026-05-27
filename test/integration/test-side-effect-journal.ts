import { 
    ImmutableEventStore, 
    StateConvergenceEngine, 
    ReducerPurityGuard, 
    LogCompactor, 
    SideEffectJournal, 
    ReducerRegistry,
    PurityASTScanner
} from '../../packages/production-pilot/src/index.js';
import { logger } from '../../packages/observability/src/index.js';
import crypto from 'node:crypto';

interface AppState {
    balance: number;
    auditLog: string[];
}

interface AppEvent {
    type: 'DEPOSIT' | 'WITHDRAW' | 'INJECT_GRANT';
    amount: number;
}

// Pure, deterministic bank reducer
function bankReducer(state: AppState, event: AppEvent): AppState {
    if (event.type === 'DEPOSIT') {
        return {
            balance: state.balance + event.amount,
            auditLog: [...state.auditLog, `Deposited: ${event.amount}`]
        };
    } else if (event.type === 'WITHDRAW') {
        return {
            balance: state.balance - event.amount,
            auditLog: [...state.auditLog, `Withdrew: ${event.amount}`]
        };
    }
    return state;
}

// 1. AST scanner bypass attempt (assigning Math to variable alias)
function aliasImpureReducer(state: AppState, event: AppEvent): AppState {
    const aliasMath = Math; // Scope Aliasing!
    const randomVal = aliasMath.random() > 0.5 ? 1 : 0;
    return {
        balance: state.balance + event.amount + randomVal,
        auditLog: [...state.auditLog, 'Attempted AST bypass']
    };
}

// 2. AST scanner bypass attempt (using computed brackets globalThis["Math"])
function computedBracketReducer(state: AppState, event: AppEvent): AppState {
    const dynamicKey = 'Math';
    const dynamicRandom = 'random';
    const m = (globalThis as any)[dynamicKey]; // Computed brackets!
    const val = m[dynamicRandom]();
    return {
        balance: state.balance + event.amount + (val > 0.5 ? 1 : 0),
        auditLog: [...state.auditLog, 'Attempted computed bracket bypass']
    };
}

class SideEffectJournalTester {
    async run() {
        logger.info('🏁 [TEST] Starting PHASE F: SIDE-EFFECT DETERMINISM & EXECUTION JOURNALING TEST CAMPAIGN');
        let passed = 0;
        let total = 0;

        const initialState: AppState = {
            balance: 1000,
            auditLog: []
        };

        // ─── Scenario 1: Scope-Aware AST Scope & Aliasing Scanner ───
        total++;
        logger.info('🔍 [Scenario 1] Validating Scope-Aware AST Aliasing & Bracket bypass scanning...');
        try {
            const aliasReport = PurityASTScanner.scan(aliasImpureReducer);
            const computedReport = PurityASTScanner.scan(computedBracketReducer);
            const pureReport = PurityASTScanner.scan(bankReducer);

            assert(pureReport.passed === true, 'Pure bank reducer static scan must pass');
            
            assert(aliasReport.passed === false, 'Scope aliasing bypass attempt must be caught');
            assert(aliasReport.violations.some(v => v.includes('Identifier Aliasing') || v.includes('Aliased Forbidden Call')), 'Must flag aliasing violation');

            assert(computedReport.passed === false, 'Computed brackets bypass attempt must be caught');
            assert(computedReport.violations.some(v => v.includes('Computed Property Bypass') || v.includes('Forbidden Symbol')), 'Must flag computed property violation');

            logger.info('  ✅ PASS: Syntactic AST scanner successfully blocks indirect scoping and computed property aliased bypasses');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 1');
        }

        // ─── Scenario 2: Deterministic Side-Effect Journaling (Live Mode) ───
        total++;
        logger.info('📡 [Scenario 2] Executing dynamic side-effects in Live/Recording Mode...');
        try {
            // Sequence 1
            const journal = new SideEffectJournal(1, false); // Live mode

            let ioTriggered = 0;
            const asyncAction = async () => {
                ioTriggered++;
                return { responseCode: 200, creditApproved: true };
            };

            // Execute dynamic effect
            const result = await journal.execute('ValidateCreditScore', asyncAction);
            
            assert(ioTriggered === 1, 'Live mode must execute actual async I/O operation');
            assert(result.creditApproved === true, 'Result must be returned successfully');

            const loggedEffects = journal.getLoggedEffects();
            assert(loggedEffects.length === 1, 'Journal must contain exactly 1 recorded effect log');
            assert(loggedEffects[0].outcome === 'success', 'Outcome must be logged as success');
            assert(/^([a-f0-9]{16})$/.test(loggedEffects[0].effectId), 'RetryId must be a 16-character deterministic hex hash');

            logger.info('  ✅ PASS: Live mode successfully records side effects with deterministic RetryIds');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 2');
        }

        // ─── Scenario 3: Deterministic Side-Effect Journaling (Replay Mode) ───
        total++;
        logger.info('🔄 [Scenario 3] Replaying dynamic side-effects in Offline/Deterministic Mode...');
        try {
            // 1. Record an event state in live mode
            const liveJournal = new SideEffectJournal(5, false);
            let rawNetworkCalls = 0;
            
            const asyncMockCall = async () => {
                rawNetworkCalls++;
                return 'external_payload_response';
            };

            // Execute in live run
            const liveOutput = await liveJournal.execute('FetchExternalRates', asyncMockCall);
            const recordedJournal = liveJournal.getLoggedEffects();

            // 2. Perform offline replay using Replay Mode and injected journal
            const replayJournal = new SideEffectJournal(5, true); // Replay mode!
            replayJournal.loadLoggedEffects(recordedJournal);

            let replayNetworkCalls = 0;
            const asyncReplayAction = async () => {
                replayNetworkCalls++;
                return 'diverged_network_response';
            };

            // Replay execution
            const replayOutput = await replayJournal.execute('FetchExternalRates', asyncReplayAction);

            assert(liveOutput === 'external_payload_response', 'Live output must match expected response');
            assert(rawNetworkCalls === 1, 'Live run must trigger exactly 1 real I/O call');

            assert(replayOutput === 'external_payload_response', 'Replayed output must match recorded live output deterministically');
            assert(replayNetworkCalls === 0, 'Replay mode must bypass raw network/IO operations completely');

            logger.info('  ✅ PASS: Offline replay completely bypasses raw I/O and returns deterministic journaled outcomes');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 3');
        }

        // ─── Scenario 4: Encapsulated Ledger Compaction & Continuity Verification ───
        total++;
        logger.info('🗜️  [Scenario 4] Enforcing encapsulated compaction sequence and continuity bounds...');
        try {
            const store = new ImmutableEventStore<AppEvent>();
            
            // Build simple genesis stream
            const block1 = store.append({ type: 'DEPOSIT', amount: 50 }); // seq 1
            const block2 = store.append({ type: 'DEPOSIT', amount: 100 }); // seq 2

            const snapshot = {
                sequence: 2,
                stateHash: block2.hash,
                state: { balance: 1150, auditLog: [] }
            };

            const storePostSnapshot = new ImmutableEventStore<AppEvent>();
            
            // Sync blocks contiguous with sequence
            const b3 = {
                sequence: 3,
                prevHash: block2.hash,
                timestamp: Date.now(),
                payload: { type: 'WITHDRAW' as const, amount: 20 },
                hash: ''
            };
            b3.hash = crypto.createHash('sha256').update(JSON.stringify({
                sequence: b3.sequence,
                prevHash: b3.prevHash,
                timestamp: b3.timestamp,
                payload: b3.payload
            })).digest('hex');

            // 1. Test Contiguous compaction sync
            let compactOk = false;
            try {
                storePostSnapshot.replaceLedgerAfterSnapshot(snapshot, [b3]);
                compactOk = true;
            } catch (err: any) {
                logger.error(`  Compaction failed: ${err.message}`);
            }

            // 2. Inject Sequence mismatch (skipping sequence 3)
            const badBlock = { ...b3, sequence: 4 };
            let mismatchThrows = false;
            try {
                storePostSnapshot.replaceLedgerAfterSnapshot(snapshot, [badBlock]);
            } catch (err: any) {
                mismatchThrows = true;
                logger.info(`  Caught expected sequence mismatch error: ${err.message}`);
            }

            // 3. Inject Link failure (prevHash mismatch)
            const badLinkBlock = { ...b3, prevHash: 'poisoned_prev_hash' };
            let linkThrows = false;
            try {
                storePostSnapshot.replaceLedgerAfterSnapshot(snapshot, [badLinkBlock]);
            } catch (err: any) {
                linkThrows = true;
                logger.info(`  Caught expected link continuity mismatch error: ${err.message}`);
            }

            assert(compactOk === true, 'Contiguous compaction sync must pass');
            assert(mismatchThrows === true, 'Sequence gaps must be explicitly rejected');
            assert(linkThrows === true, 'Broken prevHash cryptographic lineage links must be rejected');

            logger.info('  ✅ PASS: replaceLedgerAfterSnapshot successfully enforces continuity and blocks poisoned updates');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 4');
        }

        // ─── Scenario 5: Reducer Checksum & Governance Version Pins ───
        total++;
        logger.info('🛡️  [Scenario 5] Validating Reducer Checksum and deprecation routing...');
        try {
            const registry = new ReducerRegistry<AppState>();
            registry.register('v1.0.0', bankReducer);

            const router = registry.routeReducer();

            // Perform version routed transition
            let state = { ...initialState };
            state = router(state, { schemaVersion: 'v1.0.0', payload: { type: 'DEPOSIT', amount: 500 } });
            assert(state.balance === 1500, 'Routed v1 event must progress state correctly');

            // Attempt transition of unregistered schema version
            let throws = false;
            try {
                router(state, { schemaVersion: 'v9.9.9-legacy', payload: { type: 'DEPOSIT', amount: 10 } });
            } catch (err: any) {
                throws = true;
                logger.info(`  Caught expected version registration mismatch: ${err.message}`);
            }

            assert(throws === true, 'Unregistered versions must trigger dynamic compatibility error');
            logger.info('  ✅ PASS: Governance registry correctly routes schema versions and blocks unregistered legacy calls');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 5');
        }

        logger.info(`🏁 [TEST] COMPLETED: ${passed}/${total} Scenarios Passed.`);
        if (passed !== total) {
            throw new Error(`Deterministic Governance Phase F Test Failed: only ${passed}/${total} passed.`);
        }
        logger.info('🎉 [SYSTEM GOVERNED] Dynamic AST scanner, side-effect journals, ledger compaction, and schema registries fully verified.');
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

const tester = new SideEffectJournalTester();
tester.run()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Fatal Phase F governance test failure:', err.message);
        process.exit(1);
    });

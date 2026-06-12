import { 
    WasmSandbox, 
    WorkflowSDK, 
    workflow, 
    WorkflowContext,
    DeterministicScheduler,
    SideEffectJournal,
    IngressJournal,
    ReplayTraceInspector,
    DeterminismDiffEngine
} from '../../packages/production-pilot/src/index.js';
import { logger } from '../../packages/observability/src/index.js';

// Pre-compiled Wasm Bytecode Arrays
const growMemoryWasm = new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 
    0x01, 0x06, 0x01, 0x60, 0x01, 0x7f, 0x01, 0x7f, 
    0x03, 0x02, 0x01, 0x00, 0x05, 0x04, 0x01, 0x01, 
    0x01, 0x02, 0x07, 0x17, 0x02, 0x06, 0x6d, 0x65, 
    0x6d, 0x6f, 0x72, 0x79, 0x02, 0x00, 0x0a, 0x67, 
    0x72, 0x6f, 0x77, 0x4d, 0x65, 0x6d, 0x6f, 0x72, 
    0x79, 0x00, 0x00, 0x0a, 0x08, 0x01, 0x06, 0x00, 
    0x20, 0x00, 0x40, 0x00, 0x0b
]);

const triggerClockWasm = new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 
    0x01, 0x04, 0x01, 0x60, 0x00, 0x00, 0x02, 0x12, 
    0x01, 0x03, 0x65, 0x6e, 0x76, 0x0a, 0x74, 0x69, 
    0x63, 0x6b, 0x5f, 0x63, 0x6c, 0x6f, 0x63, 0x6b, 
    0x00, 0x00, 0x03, 0x02, 0x01, 0x00, 0x07, 0x10, 
    0x01, 0x0c, 0x74, 0x72, 0x69, 0x67, 0x67, 0x65, 
    0x72, 0x43, 0x6c, 0x6f, 0x63, 0x6b, 0x00, 0x01, 
    0x0a, 0x06, 0x01, 0x04, 0x00, 0x10, 0x00, 0x0b
]);

const runWorkflowStepWasm = new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 
    0x01, 0x09, 0x01, 0x60, 0x04, 0x7f, 0x7f, 0x7f, 
    0x7f, 0x01, 0x7f, 0x02, 0x2a, 0x02, 0x03, 0x65, 
    0x6e, 0x76, 0x06, 0x6d, 0x65, 0x6d, 0x6f, 0x72, 
    0x79, 0x02, 0x01, 0x01, 0x0a, 0x03, 0x65, 0x6e, 
    0x76, 0x13, 0x65, 0x78, 0x65, 0x63, 0x75, 0x74, 
    0x65, 0x5f, 0x73, 0x69, 0x64, 0x65, 0x5f, 0x65, 
    0x66, 0x66, 0x65, 0x63, 0x74, 0x00, 0x00, 0x03, 
    0x02, 0x01, 0x00, 0x07, 0x13, 0x01, 0x0f, 0x72, 
    0x75, 0x6e, 0x57, 0x6f, 0x72, 0x6b, 0x66, 0x6c, 
    0x6f, 0x77, 0x53, 0x74, 0x65, 0x70, 0x00, 0x01, 
    0x0a, 0x0e, 0x01, 0x0c, 0x00, 0x20, 0x00, 0x20, 
    0x01, 0x20, 0x02, 0x20, 0x03, 0x10, 0x00, 0x0b
]);

class WasmWorkflowTester {
    async run() {
        logger.info('🏁 [TEST] Starting PHASE N: WASM RUNTIME ISOLATION & WORKFLOW SDK TEST CAMPAIGN');
        let passed = 0;
        let total = 0;

        // ─── Scenario 1: WASM Isolation & Memory Fencing ───
        total++;
        logger.info('🔒 [Scenario 1] Verifying WebAssembly linear memory page boundaries...');
        try {
            const sandbox = new WasmSandbox();
            const instance = await sandbox.instantiate(growMemoryWasm, { memoryLimitPages: 2 });
            const exports = instance.exports as any;

            // Grow by 1 page (initial is 1, max is 2) - should succeed
            const firstGrow = exports.growMemory(1);
            assert(firstGrow === 1, `First memory grow should return old page count (1), got ${firstGrow}`);

            // Grow by 1 more page (exceeds max limit 2) - should fail and return -1
            const secondGrow = exports.growMemory(1);
            assert(secondGrow === -1, `Second memory grow exceeding limits should fail and return -1, got ${secondGrow}`);

            logger.info('  ✅ PASS: WASM sandbox linear memory limits strictly enforced');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 1');
            console.error(e);
        }

        // ─── Scenario 2: Host Bridge Integration ───
        total++;
        logger.info('📡 [Scenario 2] Verifying whitelisted host capability import triggers...');
        try {
            const sandbox = new WasmSandbox();
            const scheduler = new DeterministicScheduler(false);
            const journal = new SideEffectJournal(10, false);
            const ingress = new IngressJournal(false);

            let clockTicked = false;
            sandbox.bindContext({
                scheduler,
                journal,
                clockCallback: () => { clockTicked = true; }
            });

            const instance = await sandbox.instantiate(triggerClockWasm);
            const exports = instance.exports as any;
            exports.triggerClock();

            assert(clockTicked === true, 'Clock tick host callback must be executed');

            // Now test execute_side_effect integration
            const sideInstance = await sandbox.instantiate(runWorkflowStepWasm, { memoryLimitPages: 10 });
            const sideExports = sideInstance.exports as any;
            const memory = (sideInstance as any).memory as WebAssembly.Memory;

            // Seed side-effect outcome in host journal
            const expectedRetryId = journal.generateRetryId('payment-gateway');
            (journal as any).callCounts.set('payment-gateway', 0); // Reset count so WASM generateRetryId matches
            journal.loadLoggedEffects([{
                effectId: expectedRetryId,
                name: 'payment-gateway',
                outcome: 'success',
                result: { transactionId: 'TX-9099' }
            }]);

            // Write name parameter to WASM memory
            const name = 'payment-gateway';
            const encoder = new TextEncoder();
            const bytes = encoder.encode(name);
            const memView = new Uint8Array(memory.buffer);
            memView.set(bytes, 100); // write at offset 100

            // Call function runWorkflowStep(nameOffset: 100, nameLen: 15, outOffset: 200, maxOutLen: 100)
            const writtenLen = sideExports.runWorkflowStep(100, name.length, 200, 100);
            assert(writtenLen > 0, 'WASM side-effect outcome must write string to offset 200');

            const resultJson = new TextDecoder('utf8').decode(memView.subarray(200, 200 + writtenLen));
            const resultObj = JSON.parse(resultJson);
            assert(resultObj.transactionId === 'TX-9099', 'Returned result payload must match seeded side-effect');

            sandbox.unbindContext();
            logger.info('  ✅ PASS: Host deterministic journal capabilities bridged successfully to WebAssembly');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 2');
            console.error(e);
        }

        // ─── Scenario 3: Workflow SDK Execution Lifecycle ───
        total++;
        logger.info('📦 [Scenario 3] Verifying SDK step orchestrations and execution lifecycle...');
        try {
            const scheduler = new DeterministicScheduler(false);
            const journal = new SideEffectJournal(10, false);
            const ingress = new IngressJournal(false);

            const context = new WorkflowContext(scheduler, journal, ingress);
            WorkflowSDK.setActiveContext(context);

            const processOrder = WorkflowSDK.define('process-order', async (orderId: string) => {
                const step1 = await workflow.step('validate', async () => {
                    return { validated: true };
                });

                const step2 = await workflow.sideEffect('charge-card', async () => {
                    return { success: true, chargedAmount: 150 };
                });

                return { orderId, validated: step1.validated, charged: step2.success };
            });

            // Enqueue workflow definition run
            const resultPromise = processOrder.definitionFn('order-500');

            // Flush scheduler steps
            await scheduler.flush();

            const finalOutcome = await resultPromise;
            assert(finalOutcome.orderId === 'order-500', 'Workflow output matches');
            assert(finalOutcome.validated === true, 'Validation step successful');
            assert(finalOutcome.charged === true, 'Card charge side effect successful');

            WorkflowSDK.clearActiveContext();
            logger.info('  ✅ PASS: Workflow SDK defines and executes orchestrated steps correctly');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 3');
            console.error(e);
        }

        // ─── Scenario 4: Compensation Rollback Trigger ───
        total++;
        logger.info('🔄 [Scenario 4] Verifying transaction compensations in reverse execution order...');
        try {
            const scheduler = new DeterministicScheduler(false);
            const journal = new SideEffectJournal(10, false);
            const ingress = new IngressJournal(false);

            const context = new WorkflowContext(scheduler, journal, ingress);
            WorkflowSDK.setActiveContext(context);

            const compHistory: string[] = [];

            const runSaga = async () => {
                await workflow.step('reserve-hotel', async () => {
                    workflow.compensate(async () => {
                        compHistory.push('hotel-refunded');
                    });
                    return 'hotel-ok';
                });

                await workflow.step('book-flight', async () => {
                    workflow.compensate(async () => {
                        compHistory.push('flight-cancelled');
                    });
                    return 'flight-ok';
                });

                throw new Error('Seat allocation failure');
            };

            let sagaError: Error | null = null;
            const sagaPromise = runSaga().catch(err => {
                sagaError = err;
            });

            // Flush scheduler steps (reserve-hotel, book-flight)
            await scheduler.flush();
            await scheduler.flush();

            // Wait for saga to complete
            await sagaPromise;

            assert(sagaError !== null, 'Saga must have failed');

            // Trigger sagas reverse compensation rollback
            await context.executeCompensations();

            // Flush compensation tasks enqueued to scheduler
            await scheduler.flush();

            assert(compHistory.length === 2, 'Two compensations must be triggered');
            assert(compHistory[0] === 'flight-cancelled', 'Flight must be cancelled first (reverse order)');
            assert(compHistory[1] === 'hotel-refunded', 'Hotel must be refunded second (reverse order)');

            WorkflowSDK.clearActiveContext();
            logger.info('  ✅ PASS: Sagas transaction rollback executes registered compensations in reverse order');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 4');
            console.error(e);
        }

        // ─── Scenario 5: Replay Diagnostics & Divergence Diff ───
        total++;
        logger.info('🔬 [Scenario 5] Diffing execution traces to pinpoint determinism replay divergence...');
        try {
            // 1. Run live execution baseline
            const liveScheduler = new DeterministicScheduler(false);
            const liveJournal = new SideEffectJournal(10, false);
            const liveIngress = new IngressJournal(false);
            const liveCtx = new WorkflowContext(liveScheduler, liveJournal, liveIngress);

            WorkflowSDK.setActiveContext(liveCtx);
            await workflow.sideEffect('check-stock', async () => {
                return { count: 42 };
            });
            await workflow.sideEffect('reserve-item', async () => {
                return { reserved: true };
            });
            WorkflowSDK.clearActiveContext();

            const baselineTimeline = ReplayTraceInspector.compileTimeline(
                liveJournal.getLoggedEffects(),
                liveIngress.getLogs()
            );

            // 2. Run replay execution and mutate a logged outcome to trigger divergence
            const replayScheduler = new DeterministicScheduler(true);
            const replayJournal = new SideEffectJournal(10, true);
            const replayIngress = new IngressJournal(true);

            // Load baseline effects but modify the second effect payload to simulate drift
            const baselineEffects = liveJournal.getLoggedEffects();
            const modifiedEffects = baselineEffects.map(eff => {
                if (eff.name === 'reserve-item') {
                    return { ...eff, result: { reserved: false } }; // Mutate result
                }
                return eff;
            });
            replayJournal.loadLoggedEffects(modifiedEffects);

            const replayCtx = new WorkflowContext(replayScheduler, replayJournal, replayIngress);
            WorkflowSDK.setActiveContext(replayCtx);

            await workflow.sideEffect('check-stock', async () => {
                return { count: 42 };
            });
            await workflow.sideEffect('reserve-item', async () => {
                return { reserved: true };
            });
            WorkflowSDK.clearActiveContext();

            const replayTimeline = ReplayTraceInspector.compileTimeline(
                replayJournal.getLoggedEffects(),
                replayIngress.getLogs()
            );

            // 3. Diff traces
            const diffResult = DeterminismDiffEngine.compareTraces(baselineTimeline, replayTimeline);
            assert(diffResult.diverged === true, 'Traces must diverge due to mutated payload');
            assert(diffResult.mismatchType === 'payload-mismatch', 'Divergence mismatch type matches payload-mismatch');
            assert(diffResult.details?.includes('reserve-item'), 'Divergence details must pinpoint reserve-item');

            logger.info('  ✅ PASS: Replay diagnostics and diff engine pinpoints execution drift locations exactly');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 5');
            console.error(e);
        }

        logger.info(`🏁 [TEST] COMPLETED: ${passed}/${total} Scenarios Passed.`);
        if (passed !== total) {
            throw new Error(`WASM Isolation and Workflow SDK Integration Test Failed: only ${passed}/${total} passed.`);
        }
        logger.info('🎉 [SYSTEM COMPARTMENTALIZED] WASM memory fencing, capability import bridges, Sagas compensations, and replay diagnostics are fully verified.');
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

const tester = new WasmWorkflowTester();
tester.run()
    .then(() => setTimeout(() => process.exit(0), 200))
    .catch(err => {
        console.error('Fatal WASM isolation integration test failure:', err.message);
        process.exit(1);
    });

import { 
    VMSandbox, 
    GovernedPromise, 
    WorkerSandbox, 
    ExecutionEpochManager,
    DeterministicScheduler
} from '../../packages/production-pilot/src/index.js';
import { logger } from '../../packages/observability/src/index.js';

class RuntimeOwnershipTester {
    async run() {
        logger.info('🏁 [TEST] Starting PHASE I: RUNTIME EVENT-LOOP OWNERSHIP & ISOLATION TEST CAMPAIGN');
        let passed = 0;
        let total = 0;

        // ─── Scenario 1: VM Isolation and Global Pruning ───
        total++;
        logger.info('🔒 [Scenario 1] Verifying V8 VM global environment pruning...');
        try {
            const sandbox = new VMSandbox();

            // 1. Attempt to access Node's global process object inside the pruned sandbox
            let throwsProcess = false;
            try {
                sandbox.run(`process.exit(1);`);
            } catch (err: any) {
                if (err.message.includes('process is not defined')) {
                    throwsProcess = true;
                    logger.info(`  Caught expected global pruner exception: ${err.message}`);
                }
            }

            // 2. Attempt to access Node's native module require/import
            let throwsRequire = false;
            try {
                sandbox.run(`require('fs');`);
            } catch (err: any) {
                if (err.message.includes('require is not defined')) {
                    throwsRequire = true;
                    logger.info(`  Caught expected module restriction exception: ${err.message}`);
                }
            }

            assert(throwsProcess === true, 'VM Sandbox must block process global');
            assert(throwsRequire === true, 'VM Sandbox must block native require');

            logger.info('  ✅ PASS: VVM Sandbox successfully prunes environment globals and isolates execution context');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 1');
        }

        // ─── Scenario 2: Governed Promise Interception ───
        total++;
        logger.info('⏳ [Scenario 2] Redirecting Promise microtask queues to virtual scheduler...');
        try {
            const scheduler = new DeterministicScheduler(false);
            GovernedPromise.bindScheduler(scheduler);

            let firstResolved = false;
            let secondResolved = false;

            // Enqueue standard governed promises
            const p1 = new GovernedPromise<number>((resolve) => {
                resolve(42);
            }).then((val) => {
                firstResolved = true;
                return val * 2;
            });

            const p2 = p1.then((val) => {
                secondResolved = true;
                return val + 10;
            });

            // Before flushing, the callbacks MUST NOT have been executed!
            assert(firstResolved === false, 'Governed promise must not resolve before scheduler tick');
            assert(secondResolved === false, 'Dependent promise must not resolve before scheduler tick');

            // Flush step 1
            const outcomes1 = await scheduler.flush(1);
            assert(outcomes1.length === 1, 'First resolve microtask must be flushed');
            assert(firstResolved === true, 'First callback must execute after scheduler tick');
            assert(secondResolved === false, 'Second callback must still be pending');

            // Flush step 2
            const outcomes2 = await scheduler.flush(1);
            assert(outcomes2.length === 1, 'Second resolve microtask must be flushed');
            assert(secondResolved === true, 'Second callback must execute in the next tick');

            GovernedPromise.unbindScheduler();
            logger.info('  ✅ PASS: GovernedPromise successfully intercepts microtask resolutions and schedules them logically');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 2');
        }

        // ─── Scenario 3: Resource-Limited Worker Sandbox ───
        total++;
        logger.info('📦 [Scenario 3] Fencing CPU/Memory using Worker Sandboxes...');
        try {
            // 1. Run standard safe calculation
            const safeCode = `
                import { parentPort } from 'node:worker_threads';
                const result = 50 * 50;
                parentPort.postMessage({ result });
            `;
            const safeResult = await WorkerSandbox.executeWorker(safeCode, { memoryLimitMb: 30, timeoutMs: 2000 });
            assert(safeResult.result === 2500, 'Safe worker execution must return correct payload');

            // 2. Run infinite CPU loop and assert timeout rejection
            const infiniteCode = `
                while (true) {}
            `;
            let caughtTimeout = false;
            try {
                await WorkerSandbox.executeWorker(infiniteCode, { memoryLimitMb: 30, timeoutMs: 500 });
            } catch (err: any) {
                if (err.message.includes('[WORKER::TIMEOUT]')) {
                    caughtTimeout = true;
                    logger.info(`  Caught expected worker CPU exhaustion timeout: ${err.message}`);
                }
            }
            assert(caughtTimeout === true, 'Infinite loop must be terminated by timeout fence');

            // 3. Run memory overflow and assert crash/exit rejection
            const leakCode = `
                const data = [];
                while (true) {
                    data.push(new Array(1000000).fill('leak'));
                }
            `;
            let caughtOverflow = false;
            try {
                await WorkerSandbox.executeWorker(leakCode, { memoryLimitMb: 16, timeoutMs: 3000 });
            } catch (err: any) {
                caughtOverflow = true;
                logger.info(`  Caught expected worker memory overflow rejection: ${err.message}`);
            }
            assert(caughtOverflow === true, 'Worker memory exhaustion must be isolated and rejected');

            logger.info('  ✅ PASS: Worker sandboxes enforce strict memory/CPU resource fences and isolate failures');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 3');
        }

        // ─── Scenario 4: Epoch Checkpointing & Rollbacks ───
        total++;
        logger.info('🔄 [Scenario 4] Testing Epoch checkpoints and transaction rollbacks...');
        try {
            interface State {
                balance: number;
                status: string;
            }
            const state: State = { balance: 1000, status: 'GENESIS' };
            const epoch = new ExecutionEpochManager<State>();

            // Start Epoch checkpoint
            const epochId = epoch.startEpoch(state, 42);
            assert(epoch.hasActiveEpoch() === true, 'Epoch checkpoint must be registered active');

            // Mutate state during epoch execution
            let currentState = { ...state };
            currentState.balance = 200;
            currentState.status = 'DIRTY';

            // Simulate constraint violation / rollback call
            const reverted = epoch.rollback();
            assert(reverted.sequence === 42, 'Reverted sequence must match genesis checkpoint');
            assert(reverted.state.balance === 1000, 'Reverted state balance must match genesis checkpoint');
            assert(reverted.state.status === 'GENESIS', 'Reverted state status must match genesis checkpoint');

            epoch.commit();
            assert(epoch.hasActiveEpoch() === false, 'Completed epoch must release active checkpoint');

            logger.info('  ✅ PASS: Epoch manager successfully captures state checkpoints and triggers rollbacks');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 4');
        }

        // ─── Scenario 5: Combined Sandboxed Runtime Execution ───
        total++;
        logger.info('🔬 [Scenario 5] Running fully integrated sandboxed transaction epoch...');
        try {
            const sandbox = new VMSandbox();
            const scheduler = new DeterministicScheduler(false);
            GovernedPromise.bindScheduler(scheduler);

            // Execute asynchronous addition logic inside the V8 VM sandbox under governed Promise scheduling!
            const sandboxedFn = async (a: number, b: number) => {
                return new Promise<number>((resolve) => {
                    resolve(a + b);
                }).then(val => val * 10);
            };

            const promiseHandle = sandbox.runFunction<GovernedPromise<number>>(sandboxedFn, 5, 7);

            let resultVal = 0;
            promiseHandle.then((val) => {
                resultVal = val;
            });

            // Before scheduler flush, result must be unexecuted
            assert(resultVal === 0, 'Resolution must remain pending before virtual scheduler tick');

            // Flush microtasks
            await scheduler.flush();
            await scheduler.flush();

            assert(resultVal === 120, 'Sandboxed execution under governed promises must yield deterministic 120');

            GovernedPromise.unbindScheduler();
            logger.info('  ✅ PASS: Integrated sandboxed execution resolves asynchronous tasks with perfect logical order');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 5');
        }

        logger.info(`🏁 [TEST] COMPLETED: ${passed}/${total} Scenarios Passed.`);
        if (passed !== total) {
            throw new Error(`Runtime Ownership and Isolation Integration Test Failed: only ${passed}/${total} passed.`);
        }
        logger.info('🎉 [SYSTEM DETERMINISTIC RUNTIME] V8 VM contexts, Governed Promises, and bounded worker sandboxes are fully verified.');
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

const tester = new RuntimeOwnershipTester();
tester.run()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Fatal runtime ownership test failure:', err.message);
        process.exit(1);
    });

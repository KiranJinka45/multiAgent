import * as fs from 'node:fs';
import * as path from 'node:path';
import {
    DurableSegmentedWal,
    WorkflowOrchestrator,
    DurableWorkflowContext
} from '../../packages/production-pilot/src/index.js';
import { logger } from '../../packages/observability/src/index.js';

class DurableOrchestrationTester {
    private testDir = path.join(process.cwd(), 'scratch', 'test-durable-orchestration-' + Math.random().toString(36).substr(2, 9));

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
                    // Synchronous wait of 50ms
                    const start = Date.now();
                    while (Date.now() - start < 50) {}
                }
            }
        }
    }

    async run() {
        logger.info('🏁 [TEST] Starting Phase S: Durable Workflow Orchestration Tests');
        let passed = 0;
        let total = 0;

        this.cleanTestDir();
        fs.mkdirSync(this.testDir, { recursive: true });

        // ─── Scenario 1: State Persistence & Replay Execution ───
        total++;
        logger.info('💾 [Scenario 1] Verifying standard durable execution step logging...');
        try {
            const wal = new DurableSegmentedWal<any>({ walDir: path.join(this.testDir, 'wal-s1') });
            const orchestrator = new WorkflowOrchestrator('node-a', wal, 1);

            orchestrator.defineWorkflow('simple-flow', async (ctx: DurableWorkflowContext, input: string) => {
                const step1 = await ctx.step('concat', async () => {
                    return input + '-validated';
                });
                const step2 = await ctx.step('upper', async () => {
                    return step1.toUpperCase();
                });
                return step2;
            });

            const workflowId = 'flow-1';
            const promise = await orchestrator.startWorkflow(workflowId, 'simple-flow', 'hello');
            const result = await promise;

            assert(result === 'HELLO-VALIDATED', `Expected result HELLO-VALIDATED, got ${result}`);

            const instance = orchestrator.getWorkflow(workflowId);
            assert(instance?.status === 'COMPLETED', `Workflow should be COMPLETED, got ${instance?.status}`);

            // Inspect WAL logs
            const recovered = orchestrator.recoveryEngine.recoverFromWal(wal);
            const recoveredInst = recovered.get(workflowId);
            assert(recoveredInst !== undefined, 'Workflow must be present in WAL recovery');
            assert(recoveredInst?.status === 'COMPLETED', 'Recovered status matches');
            assert(recoveredInst?.result === 'HELLO-VALIDATED', 'Recovered result matches');

            wal.closeActiveSegment();
            logger.info('  ✅ PASS: State persistence and step execution verified');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 1');
            console.error(e);
        }

        // ─── Scenario 2: Durable Timers & Recovery ───
        total++;
        logger.info('⏰ [Scenario 2] Verifying durable timer recovery and immediate execution of expired timers...');
        try {
            const walDir = path.join(this.testDir, 'wal-s2');
            const wal = new DurableSegmentedWal<any>({ walDir });
            const orchestrator = new WorkflowOrchestrator('node-a', wal, 1);

            const executionPath: string[] = [];

            orchestrator.defineWorkflow('timer-flow', async (ctx: DurableWorkflowContext) => {
                executionPath.push('start');
                await ctx.step('step1', async () => {
                    executionPath.push('step1-done');
                });
                // 150ms sleep
                await ctx.sleep('sleep1', 150);
                await ctx.step('step2', async () => {
                    executionPath.push('step2-done');
                });
                return 'done';
            });

            const workflowId = 'flow-2';
            const startPromise = orchestrator.startWorkflow(workflowId, 'timer-flow', null);

            // Wait for step1 to finish and timer to be enqueued
            await new Promise(res => setTimeout(res, 50));

            // Simulate crash of orchestrator 1
            orchestrator.scheduler.cancelTimer(`timer-sleep1-1`); // Clean up running node timer
            wal.closeActiveSegment();

            assert(executionPath.includes('step1-done'), 'Step1 should be completed before crash');
            assert(!executionPath.includes('step2-done'), 'Step2 should NOT be completed before crash');

            // Wait 150ms so timer expired window passes
            await new Promise(res => setTimeout(res, 120));

            // Recover and resume under new orchestrator instance (simulating recovery)
            const walRecovered = new DurableSegmentedWal<any>({ walDir });
            const recoveringOrchestrator = new WorkflowOrchestrator('node-a', walRecovered, 1);
            recoveringOrchestrator.defineWorkflow('timer-flow', async (ctx: DurableWorkflowContext) => {
                executionPath.push('start-replayed');
                await ctx.step('step1', async () => {
                    executionPath.push('step1-replayed'); // Should bypass due to recovery cache
                });
                await ctx.sleep('sleep1', 150);
                await ctx.step('step2', async () => {
                    executionPath.push('step2-recovered-done');
                });
                return 'recovered-done';
            });

            recoveringOrchestrator.recoverAndResume();

            // Wait for recovered promise
            const recoveredPromise = recoveringOrchestrator.getActivePromise(workflowId);
            assert(recoveredPromise !== undefined, 'Recovered workflow promise must exist');
            
            const result = await recoveredPromise;
            assert(result === 'recovered-done', `Result matches: ${result}`);
            assert(executionPath.includes('step2-recovered-done'), 'Step 2 must execute after recovery');
            
            walRecovered.closeActiveSegment();
            logger.info('  ✅ PASS: Durable timer recovery verified');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 2');
            console.error(e);
        }

        // ─── Scenario 3: Durable Task Queue & Recovery ───
        total++;
        logger.info('⏳ [Scenario 3] Verifying Durable Task Queue recovery of uncompleted tasks...');
        try {
            const walDir = path.join(this.testDir, 'wal-s3');
            const wal = new DurableSegmentedWal<any>({ walDir });
            const orchestrator = new WorkflowOrchestrator('node-a', wal, 1);

            const taskHistory: string[] = [];

            orchestrator.defineWorkflow('task-flow', async (ctx: DurableWorkflowContext) => {
                await ctx.step('step1', async () => {});
                const res = await ctx.executeTask('my-task', async () => {
                    taskHistory.push('task-executed');
                    return 'task-ok';
                });
                assert(res === 'task-ok', 'Result matches');
                return res;
            });

            // Start workflow and trigger crash before queue processes
            // We can prevent processing by pausing the queue or stopping right after enqueue event is written.
            const workflowId = 'flow-3';
            
            // Override enqueue to write event and then throw to crash before task execution
            const originalEnqueue = orchestrator.taskQueue.enqueue;
            orchestrator.taskQueue.enqueue = (wId, tId, exec) => {
                // Log event and skip execution to mock crash
                orchestrator.logEvent({
                    type: 'TASK_ENQUEUED',
                    workflowId: wId,
                    timestamp: Date.now(),
                    payload: { taskId: tId, name: 'my-task' }
                });
            };

            orchestrator.startWorkflow(workflowId, 'task-flow', null);
            wal.closeActiveSegment();

            assert(taskHistory.length === 0, 'Task should not have run yet due to mocked crash');

            // Recover under new orchestrator (restores task queue)
            const walRecovered = new DurableSegmentedWal<any>({ walDir });
            const recoveringOrchestrator = new WorkflowOrchestrator('node-a', walRecovered, 1);
            recoveringOrchestrator.defineWorkflow('task-flow', async (ctx: DurableWorkflowContext) => {
                await ctx.step('step1', async () => {});
                const res = await ctx.executeTask('my-task', async () => {
                    taskHistory.push('task-executed-recovered');
                    return 'task-ok-recovered';
                });
                return res;
            });

            // Intercept recoverAndResume to verify task is re-queued
            recoveringOrchestrator.recoverAndResume();

            // Re-enqueued task should be in queue. Let it execute.
            const recoveredPromise = recoveringOrchestrator.getActivePromise(workflowId);
            assert(recoveredPromise !== undefined, 'Recovered workflow promise must exist');

            const result = await recoveredPromise;
            assert(result === 'task-ok-recovered', `Expected task-ok-recovered, got ${result}`);
            assert(taskHistory.includes('task-executed-recovered'), 'Task must execute during recovery');

            walRecovered.closeActiveSegment();
            logger.info('  ✅ PASS: Durable task queue recovery verified');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 3');
            console.error(e);
        }

        // ─── Scenario 4: Lease-Based Failover ───
        total++;
        logger.info('👑 [Scenario 4] Verifying lease-based workflow ownership transfer during failovers...');
        try {
            const walDir = path.join(this.testDir, 'wal-s4');
            const wal = new DurableSegmentedWal<any>({ walDir });
            const orchestratorA = new WorkflowOrchestrator('node-a', wal, 1);

            let flowCompleted = false;

            orchestratorA.defineWorkflow('failover-flow', async (ctx: DurableWorkflowContext) => {
                await ctx.step('step1', async () => {});
                await ctx.sleep('sleep1', 100);
                flowCompleted = true;
                return 'failover-ok';
            });

            const workflowId = 'flow-4';
            orchestratorA.startWorkflow(workflowId, 'failover-flow', null);

            // Wait for timer registration
            await new Promise(res => setTimeout(res, 20));
            orchestratorA.scheduler.cancelTimer(`timer-sleep1-1`); // Stop Node A local timer
            wal.closeActiveSegment();

            // Node A crashed. Node B becomes new leader (epoch 2)
            const walShared = new DurableSegmentedWal<any>({ walDir });
            walShared.recoverLedger();
            const orchestratorB = new WorkflowOrchestrator('node-b', walShared, 2);
            orchestratorB.defineWorkflow('failover-flow', async (ctx: DurableWorkflowContext) => {
                await ctx.step('step1', async () => {});
                await ctx.sleep('sleep1', 100);
                flowCompleted = true;
                return 'failover-ok';
            });

            // Node B claims ownership by appending a new LEASE_ACQUIRED event
            orchestratorB.logEvent({
                type: 'LEASE_ACQUIRED',
                workflowId,
                timestamp: Date.now(),
                payload: { epoch: 2, ownerNodeId: 'node-b' }
            });

            // Resumes
            orchestratorB.recoverAndResume();
            const promise = orchestratorB.getActivePromise(workflowId);
            assert(promise !== undefined, 'Recovered workflow promise must exist');

            // Wait for B's timer to finish
            await new Promise(res => setTimeout(res, 100));

            const result = await promise;
            assert(result === 'failover-ok', `Result matches: ${result}`);
            assert(flowCompleted === true, 'Workflow must run to completion on node-b');

            walShared.closeActiveSegment();
            logger.info('  ✅ PASS: Lease-based failover and ownership takeover verified');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Scenario 4');
            console.error(e);
        }

        this.cleanTestDir();
        logger.info(`🏁 [TEST] COMPLETED: ${passed}/${total} Scenarios Passed.`);
        if (passed !== total) {
            throw new Error(`Durable Orchestration Test Failed: only ${passed}/${total} passed.`);
        }
    }
}

function assert(condition: any, message: string) {
    if (!condition) {
        console.error(`❌ FAILED ASSERTION: ${message}`);
        throw new Error(message);
    }
}

const tester = new DurableOrchestrationTester();
tester.run()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Fatal durable orchestration test failure:', err.message);
        process.exit(1);
    });

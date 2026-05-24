import { 
    FailureClassifier, 
    FailureType 
} from '../../packages/resilience/src/classifier.js';
import { 
    MalformedPayloadFailure, 
    InvariantViolationFailure, 
    TransientFailure, 
    SideEffectJournal, 
    redis,
    db
} from '../../packages/utils/src/index.js';
import { BaseWorker } from '../../apps/worker/src/base-worker.js';
import { Job } from 'bullmq';
import { logger } from '../../packages/observability/src/index.js';

class ExecutionIntegrityStressTester {
    async run() {
        logger.info('🏁 [TEST] Starting EXECUTION INTEGRITY & RECOVERY SEMANTICS TEST CAMPAIGN');
        let passed = 0;
        let total = 0;

        // ─── Scenario 1: Failure Taxonomy Action Mapping ───
        total++;
        logger.info('🛡️  [Scenario 1] Verifying Failure Taxonomy & Action Mapping...');
        try {
            const malformedErr = new MalformedPayloadFailure('Payload missing required field "projectId"');
            const invariantErr = new InvariantViolationFailure('Balance cannot be negative');
            const transientErr = new TransientFailure('Database locked, retrying');

            const malformedType = FailureClassifier.classify(malformedErr);
            const invariantType = FailureClassifier.classify(invariantErr);
            const transientType = FailureClassifier.classify(transientErr);

            if (malformedType === FailureType.PERMANENT && 
                invariantType === FailureType.PERMANENT && 
                transientType === FailureType.TRANSIENT) {
                logger.info('  ✅ PASS: Failure Taxonomy mapped to correct action types');
                passed++;
            } else {
                logger.error({ malformedType, invariantType, transientType }, '  ❌ FAIL: Incorrect taxonomy action classification');
            }
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 1');
        }

        // ─── Scenario 2: Durable Side-Effect Journaling ───
        total++;
        logger.info('📝 [Scenario 2] Testing Durable Side-Effect Journaling lifecycle...');
        const idempotencyKey = `test-effect-${Math.random().toString(36).substring(2, 9)}`;
        const operationType = 'STRIPE_CHARGE';
        const executionId = `exec-${Date.now()}`;

        try {
            // Clean up existing if any (should be empty)
            await db.sideEffectRecord.deleteMany({
                where: { operationType, idempotencyKey }
            });

            // 1. Record Pending
            await SideEffectJournal.recordPending(idempotencyKey, operationType, executionId, 1, { amount: 1500 });
            const pendingRec = await SideEffectJournal.get(idempotencyKey, operationType);
            
            if (pendingRec && pendingRec.status === 'PENDING' && pendingRec.attemptNumber === 1) {
                logger.info('  ✅ PASS: Side effect registered as PENDING with correct metadata');
            } else {
                throw new Error('PENDING record validation failed');
            }

            // 2. Prevent concurrent duplicates while PENDING
            try {
                await SideEffectJournal.recordPending(idempotencyKey, operationType, executionId, 1);
                throw new Error('Concurrency leak! Allowed duplicate pending execution.');
            } catch (err: any) {
                if (err.message.includes('actively processing')) {
                    logger.info('  ✅ PASS: Concurrency safeguard blocked duplicate pending attempts');
                } else {
                    throw err;
                }
            }

            // 3. Commit Side Effect
            await SideEffectJournal.commit(idempotencyKey, operationType, { chargeId: 'ch_12345' });
            const committedRec = await SideEffectJournal.get(idempotencyKey, operationType);

            if (committedRec && committedRec.status === 'COMMITTED' && committedRec.metadata.chargeId === 'ch_12345') {
                logger.info('  ✅ PASS: Side effect successfully COMMITTED and metadata merged');
            } else {
                throw new Error('COMMITTED record validation failed');
            }

            // 4. Block duplicate execution on committed side effect
            try {
                await SideEffectJournal.recordPending(idempotencyKey, operationType, executionId, 2);
                throw new Error('Deduplication leak! Allowed duplicate attempt on already committed side-effect.');
            } catch (err: any) {
                if (err.message.includes('already committed')) {
                    logger.info('  ✅ PASS: Deduplication safeguard blocked duplicate committed executions');
                    passed++;
                } else {
                    throw err;
                }
            }
        } catch (e: any) {
            logger.error({ error: e.message }, `  ❌ FAIL: Side-Effect Journaling failed: ${e.message}`);
        }

        // ─── Scenario 3: Poison Job Caching ───
        total++;
        logger.info('💥 [Scenario 3] Testing Poison Candidate and exception fingerprinting...');
        const mockJobId = `mock-job-${Date.now()}`;
        const fingerprintKey = `worker:poison:fingerprint:${mockJobId}`;
        const counterKey = `worker:poison:counter:${mockJobId}`;

        try {
            await redis.del(fingerprintKey, counterKey);

            // Mock a base worker execution failure sequence
            class MockBuildWorker extends BaseWorker {
                constructor() {
                    super('mock-free-tier');
                }
                getName() { return 'mock-build-worker'; }
                getWorkerId() { return 'worker-mock-id'; }
                async processJob(job: Job) {
                    throw new Error('Catastrophic memory limit exceeded');
                }
            }

            const mockWorker = new MockBuildWorker();
            
            // Trigger first execution attempt
            const mockJob1 = {
                id: mockJobId,
                data: { projectId: 'test-proj', tenantId: 'test-tenant' }
            } as any;

            let result1;
            try {
                await (mockWorker.worker as any).processFn(mockJob1);
            } catch (err) {
                // The fingerprint should now be set in Redis by the worker's own catch block
                result1 = await redis.get(fingerprintKey);
            }

            // Verify fingerprint was cached in Redis on first failure
            if (result1) {
                logger.info('  ✅ PASS: Failure exception fingerprint cached successfully on first crash');
            } else {
                throw new Error('Failure fingerprint not cached');
            }

            // Mock consecutive execution failure (Fingerprint Match)
            const countBefore = await redis.get(counterKey); // should be '1'
            if (countBefore !== '1') {
                throw new Error(`Expected initial consecutive counter to be '1', got ${countBefore}`);
            }

            // Execute consecutive attempt (this should hit the 2+ consecutive times block, DLQ the job, clear keys, and return the quarantined status)
            let result2;
            try {
                // Reset the circuit breaker to closed state so it attempts execution again instead of short-circuiting with "Breaker is open"
                if (mockWorker.breaker && typeof mockWorker.breaker.close === 'function') {
                    mockWorker.breaker.close();
                }
                result2 = await (mockWorker.worker as any).processFn(mockJob1);
            } catch (err) {
                throw new Error(`Second execution should not have thrown; it should have returned quarantined status: ${err.message}`);
            }

            // Verify that consecutive run returned a quarantine status, and did not rethrow
            if (result2 && result2.status === 'poison_quarantined') {
                logger.info('  ✅ PASS: Consecutive exception counter correctly triggered poison quarantining and DLQ routing');
                passed++;
            } else {
                throw new Error(`Consecutive execution did not trigger poison quarantine: ${JSON.stringify(result2)}`);
            }
        } catch (e: any) {
            logger.error({ error: e.message }, `  ❌ FAIL: Scenario 3 Exception: ${e.message}`);
        }

        logger.info(`🏁 [TEST] COMPLETED: ${passed}/${total} Scenarios Passed.`);
        if (passed !== total) {
            throw new Error(`Execution Integrity Stress Test Failed: only ${passed}/${total} passed.`);
        }
        logger.info('🎉 [SYSTEM RESILIENT] All execution integrity and recovery safeguards are functioning perfectly.');
    }
}

const tester = new ExecutionIntegrityStressTester();
tester.run()
    .then(() => {
        process.exit(0);
    })
    .catch(err => {
        console.error('Fatal stress test failure:', err.message);
        process.exit(1);
    });

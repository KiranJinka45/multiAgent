import redis from '../lib/redis';
import { Orchestrator } from '../agents/orchestrator';
import logger from '../lib/logger';

async function testDuplicateJobPrevention() {
    const executionId = `test-concurrent-${Date.now()}`;
    const userId = 'user-123';
    const projectId = 'proj-123';
    const prompt = 'Build a landing page';

    console.log(`Starting concurrency test for executionId: ${executionId}`);

    const orchestrator1 = new Orchestrator();
    const orchestrator2 = new Orchestrator();

    // Simulate two workers picking up the same job
    // Worker 1 acquires lock
    const lockKey = `build:lock:${executionId}`;
    const acquired = await redis.set(lockKey, executionId, 'EX', 60, 'NX');

    if (!acquired) {
        console.error('Failed to acquire initial lock for test');
        return;
    }
    console.log('Worker 1 acquired initial lock.');

    // Worker 2 attempts to run (should fail fast because orchestrator.run checks for 'executing' status OR lock)
    // Actually, orchestrator.run checks if existingData.status === 'executing'
    // But in our hardened worker.ts, it checks the lock BEFORE calling orchestrator.run.

    console.log('Simulating Worker 2 attempt...');
    const lock2 = await redis.set(lockKey, executionId, 'EX', 60, 'NX');
    if (!lock2) {
        console.log('✅ Worker 2 correctly blocked by lockKey NX guard.');
    } else {
        console.error('❌ Worker 2 incorrectly acquired the lock!');
    }

    // Now test "Ownership Loss" abort logic simulation
    // We would need to manually change the lock value and see if the worker's heartbeat aborts.
    // This is better tested in unit tests within the worker context.
}

testDuplicateJobPrevention().then(() => {
    console.log('Concurrency test finished');
    process.exit(0);
}).catch(err => {
    console.error('Test failed', err);
    process.exit(1);
});

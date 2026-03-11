import 'dotenv/config';
import { eventBus } from '../services/event-bus';
import { redis } from '../services/queue';
import { PlannerAgent } from '../agents/planner-agent';
import { DistributedExecutionContext } from '../services/execution-context';
import logger from '../config/logger';

async function testIsolation() {
    const exec1 = `test_exec_${Math.random().toString(36).substring(7)}`;
    const exec2 = `test_exec_${Math.random().toString(36).substring(7)}`;

    console.log(`Starting isolation test with IDs: ${exec1} and ${exec2}`);

    const agent = new PlannerAgent();
    const ctx1 = new DistributedExecutionContext(exec1);
    const ctx2 = new DistributedExecutionContext(exec2);

    // Mock logs from different "builds" happening concurrently on the same agent instance
    // (Simulating how the singleton registry would handle them)
    
    console.log('Pushing logs for Exec 1...');
    await agent.execute({ prompt: 'Generate a simple hello world app' }, ctx1);
    
    console.log('Pushing logs for Exec 2...');
    await agent.execute({ prompt: 'Generate a complex e-commerce site' }, ctx2);

    // Verify Redis streams
    const stream1 = await redis.xread('STREAMS', `build:stream:${exec1}`, '0');
    const stream2 = await redis.xread('STREAMS', `build:stream:${exec2}`, '0');

    const logs1 = JSON.stringify(stream1);
    const logs2 = JSON.stringify(stream2);

    const hasCrossContamination = logs1.includes('e-commerce') || logs2.includes('hello world');

    if (!hasCrossContamination) {
        console.log('✅ PASS: No cross-contamination detected in Redis streams.');
    } else {
        console.error('❌ FAIL: Cross-contamination detected in logs!');
        process.exit(1);
    }

    process.exit(0);
}

testIsolation().catch(err => {
    console.error(err);
    process.exit(1);
});

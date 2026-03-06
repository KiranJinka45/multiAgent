import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { QUEUE_FREE } from '../src/lib/queue';
import { v4 as uuidv4 } from 'uuid';

const redis = new Redis('redis://localhost:6379');
const queue = new Queue(QUEUE_FREE, { connection: redis });

async function benchmark() {
    console.log('🚀 Starting 10-Second Architecture Benchmark...');
    const executionId = uuidv4();
    const projectId = uuidv4();
    const startTime = Date.now();

    const sub = new Redis('redis://localhost:6379');
    await sub.subscribe('build-events');

    return new Promise((resolve) => {
        sub.on('message', (channel, message) => {
            const data = JSON.parse(message);
            if (data.executionId === executionId) {
                const elapsed = (Date.now() - startTime) / 1000;
                console.log(`[${elapsed.toFixed(2)}s] Stage: ${data.currentStage} | Status: ${data.status}`);

                if (data.status === 'completed') {
                    console.log(`\n✅ Benchmark PASSED! Total time: ${elapsed.toFixed(2)}s`);
                    sub.quit();
                    redis.quit();
                    resolve(true);
                }
            }
        });

        queue.add('generate', {
            prompt: 'Build a modern coffee shop landing page with a hero section and 3 features.',
            userId: 'benchmark-user',
            projectId,
            executionId
        });
    });
}

benchmark().catch(console.error);


import Redis from 'ioredis';
import { Queue } from 'bullmq';
import * as fs from 'fs-extra';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6380';
const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
});

const projectId = 'chaos-5-deploy-test';
const executionId = `chaos-exec-${Date.now()}`;
const prompt = 'A simple page to test deployment failure recovery.';

const pageContent = `
export default function Page() {
    return (
        <div>
            <h1>Deploy Chaos Test</h1>
        </div>
    );
}
`;

const stateKey = `execution:${executionId}`;

async function run() {
    console.log(`Starting Chaos Test 5: Deploy Failure Recovery`);
    console.log(`Execution ID: ${executionId}`);

    try {
        const finalFiles = [
            { path: 'app/page.tsx', content: pageContent },
            {
                path: 'package.json', content: JSON.stringify({
                    name: 'chaos-5-app',
                    version: '1.0.0',
                    scripts: {
                        build: "echo 'Dummy build success'",
                        start: "echo 'Dummy start success'"
                    },
                    dependencies: {
                        next: "latest",
                        react: "latest",
                        "react-dom": "latest"
                    }
                }, null, 2)
            }
        ];

        // 1. Initialize Execution Context in Redis
        const contextData = {
            executionId,
            projectId,
            userId: 'chaos-user',
            prompt,
            status: 'executing',
            currentStage: 'generator',
            finalFiles,
            agentResults: {},
            metrics: {
                startTime: new Date().toISOString(),
                stepsCompleted: 0,
                totalSteps: 5
            },
            metadata: {
                intent: { templateId: 'nextjs-tailwind-basic' }
            }
        };

        await redis.set(stateKey, JSON.stringify(contextData));
        await redis.sadd('active:executions', executionId);

        // 2. Add to validator-queue (Start of the pipeline after generation)
        const validatorQueue = new Queue('validator-queue', { connection: redis });
        await validatorQueue.add('verify-project', {
            projectId,
            executionId,
            prompt,
            strategy: 'fast'
        });

        console.log(`Job enqueued to validator-queue.`);

        // 3. Monitor state
        console.log(`Monitoring state changes...`);
        while (true) {
            const state = await redis.get(stateKey);
            if (!state) break;
            const data = JSON.parse(state);

            console.log(`[Status: ${data.status} | Stage: ${data.currentStage}]`);

            if (data.status === 'completed' || data.status === 'failed') {
                console.log(`Final State reached: ${data.status}`);
                break;
            }
            await new Promise(r => setTimeout(r, 5000));
        }

    } catch (err) {
        console.error(`Trigger failed:`, err);
    } finally {
        await redis.quit();
        process.exit(0);
    }
}

run();


import { Queue } from 'bullmq';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

interface Mission {
    id: string;
    projectId: string;
    userId: string;
    prompt: string;
    status: 'draft' | 'starting' | 'planning' | 'generating' | 'validating' | 'completed' | 'failed';
    createdAt: number;
    updatedAt: number;
    metadata: any;
}

async function trigger() {
    const projectId = process.argv[2];
    if (!projectId) {
        console.error('Please provide a projectId as an argument.');
        process.exit(1);
    }

    const executionId = `test-exec-${Date.now()}`;
    const userId = "bfad-407a-86ce-4bb6d45acc51"; // Default test user
    const prompt = "Build a modern fitness landing page with a hero section, features, and pricing table using Tailwind CSS and Next.js.";

    console.log(`Triggering mission for Project: ${projectId}, Execution: ${executionId}`);

    const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

    // Create Mission first
    const mission: Mission = {
        id: executionId,
        projectId,
        userId,
        prompt,
        status: 'draft',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: { fastPath: true }
    };
    await connection.setex(`mission:${executionId}`, 86400, JSON.stringify(mission));
    console.log(`Mission created in Redis: mission:${executionId}`);

    const queue = new Queue('project-generation-free-v1', { connection });

    await queue.add('generate-project', {
        prompt,
        userId,
        projectId,
        executionId
    }, {
        jobId: `gen:${projectId}:${executionId}`,
        removeOnComplete: true
    });

    console.log(`Job added to queue. Monitor with: redis-cli get mission:${executionId}`);
    
    // Watch status
    console.log('Watching status (Ctrl+C to stop)...');
    while (true) {
        const data = await connection.get(`mission:${executionId}`);
        if (data) {
            const mission = JSON.parse(data);
            console.log(`[${new Date().toISOString()}] Status: ${mission.status}`);
            if (['completed', 'failed'].includes(mission.status)) break;
        }
        await new Promise(r => setTimeout(r, 2000));
    }

    await connection.quit();
}

trigger().catch(console.error);


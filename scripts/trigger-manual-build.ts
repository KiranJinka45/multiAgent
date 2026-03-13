import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { Queue } from 'bullmq';
import Redis from 'ioredis';

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

async function trigger() {
    console.log("Starting Trigger Script...");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Find the project and user
    const projectId = "e0409937-2f76-415a-9b7d-4a71282022c9";
    const { data: project, error: pErr } = await supabase.from('projects').select('*').eq('id', projectId).single();
    if (pErr) { console.error("Project not found:", pErr); return; }

    const userId = project.user_id;
    const prompt = project.description || "Build a simple Next.js landing page with Tailwind, a single API route, and deploy it.";
    const executionId = `exec_${Date.now()}`;

    console.log(`Triggering build for Project: ${projectId}, User: ${userId}`);

    // 2. Add to Queue
    const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    const queue = new Queue('project-generation-free-v1', { connection });

    const jobId = `gen:${projectId}:${executionId}`;
    await queue.add('generate-project', {
        prompt,
        userId,
        projectId,
        executionId
    }, {
        jobId,
        priority: 1,
        removeOnComplete: true
    });

    console.log(`Job added to queue: ${jobId}`);

    // 3. Update Project Status
    await supabase.from('projects').update({
        status: 'generating',
        last_execution_id: executionId
    }).eq('id', projectId);

    console.log("Project status updated to 'generating'.");

    await connection.quit();
}

trigger().then(() => console.log("Trigger finished.")).catch(err => console.error("Trigger failed:", err));

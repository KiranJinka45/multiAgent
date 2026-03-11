import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function triggerAndWatch() {
    const projectId = "9a4b7634-ab3f-43cd-8230-f0ab875820c9";
    const executionId = "test-" + Date.now();

    console.log(`Triggering build for project ${projectId} with execution ${executionId}...`);

    try {
        // We need a session, so we'll use the service role to simulate the user if we can, 
        // but the API uses createRouteHandlerClient which checks cookies.
        // Instead, I'll just manually add a job to the queue like trigger-manual-build.ts did.
        const { freeQueue } = await import('./src/lib/queue');

        await freeQueue.add('generate-project', {
            prompt: "Build a simple Next.js landing page with Tailwind, a single API route, and deploy it.",
            userId: "bfad-407a-86ce-4bb6d45acc51", // From list-projects.ts earlier
            projectId,
            executionId
        }, {
            jobId: `gen:${projectId}:${executionId}`,
            removeOnComplete: true
        });

        console.log("Job added to queue.");

        // Wait and check status
        for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const state = await import('./src/lib/redis').then(r => r.default.get(`build:state:${executionId}`));
            if (state) {
                const parsed = JSON.parse(state);
                console.log(`Step ${i}: Status = ${parsed.status}, Stage = ${parsed.currentStage}`);
                if (parsed.status === 'completed' || parsed.status === 'failed') break;
            } else {
                console.log(`Step ${i}: No state yet...`);
            }
        }
    } catch (err) {
        console.error(err);
    }
}

triggerAndWatch();

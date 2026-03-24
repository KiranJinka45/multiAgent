import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import { createClient } from '@libs/supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function testTrigger() {
    // 1. Get a session or just bypass if possible? 
    // The API requires session. I'll mock the session by using the service role to get a user if needed, 
    // but the API uses createRouteHandlerClient which depends on cookies.

    // I'll just use my trigger-and-watch.ts logic but point it to the project.
    // Wait, trigger-and-watch.ts bypasses the API and goes straight to BullMQ.
    // That's good for testing the worker, but I want to test the API resilience.

    // Since I can't easily mock cookies for node-fetch without a lot of setup, 
    // I'll just manually run the update logic that I added to the API.

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const projectId = '9a4b7634-ab3f-43cd-8230-f0ab875820c9';
    const executionId = 'test-' + Date.now();

    console.log(`Testing resilient update for project ${projectId}...`);

    const { error: updateError } = await supabase.from('projects').update({
        status: 'generating',
        last_execution_id: executionId
    }).eq('id', projectId);

    if (updateError) {
        console.warn('Initial update failed (expected if column missing):', updateError.message);
        const { error: retryError } = await supabase.from('projects').update({
            status: 'generating'
        }).eq('id', projectId);

        if (retryError) {
            console.error('Retry update failed:', retryError.message);
        } else {
            console.log('Retry update successful (without last_execution_id)!');
        }
    } else {
        console.log('Initial update successful (column exists?!)');
    }
}

testTrigger();

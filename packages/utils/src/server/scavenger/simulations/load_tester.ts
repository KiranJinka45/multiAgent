import axios from 'axios';

/**
 * MultiAgent Load Tester
 * 
 * Usage: npx ts-node src/scavenger/simulations/load_tester.ts --concurrency 5 --total 20
 */

const API_URL = 'http://localhost:3000/api/generate-project';
const PROJECT_ID = 'test-project-load'; // Ensure this exists in your DB or mock it

async function submitJob() {
    const start = Date.now();
    try {
        const response = await axios.post(API_URL, {
            projectId: PROJECT_ID,
            prompt: 'Create a high-concurrency test application with Redis and BullMQ'
        });
        const duration = Date.now() - start;
        console.log(`✅ Job Submitted: ${response.data.executionId} (${duration}ms)`);
        return true;
    } catch (err) {
        let errMsg = 'Unknown error';
        if (axios.isAxiosError(err)) {
            errMsg = err.response?.data?.error || err.message;
        } else if (err instanceof Error) {
            errMsg = err.message;
        }
        console.error(`❌ Submission Failed: ${errMsg}`);
        return false;
    }
}

async function runLoadTest(concurrency: number, total: number) {
    console.log(`🚀 Starting Load Test: ${total} builds with concurrency ${concurrency}`);
    const results = { success: 0, failure: 0 };

    // Simple batching
    for (let i = 0; i < total; i += concurrency) {
        const batch = Array(Math.min(concurrency, total - i)).fill(0).map(() => submitJob());
        const outcome = await Promise.all(batch);
        outcome.forEach(o => o ? results.success++ : results.failure++);
    }

    console.log(`\n📊 Load Test Results:`);
    console.log(`Success: ${results.success}`);
    console.log(`Failure: ${results.failure}`);
}

const concurrency = parseInt(process.argv.find(a => a === '--concurrency') ? process.argv[process.argv.indexOf('--concurrency') + 1] : '5');
const total = parseInt(process.argv.find(a => a === '--total') ? process.argv[process.argv.indexOf('--total') + 1] : '20');

runLoadTest(concurrency, total);

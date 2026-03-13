import 'dotenv/config';
import { redis, freeQueue } from '../services/queue';
import { v4 as uuid } from 'uuid';

async function platformPulse() {
    const executionId = `pulse_${uuid().substring(0, 8)}`;
    const projectId = `project_${uuid().substring(0, 8)}`;
    const userId = 'pulse_tester';

    console.log(`🚀 Starting Platform Pulse: ${executionId}`);

    // 1. Enqueue Job
    await freeQueue.add('pulse-job', {
        executionId,
        projectId,
        userId,
        prompt: 'Generate a minimalist portfolio page with a dark theme',
        isFastPreview: true
    });

    console.log('✅ Job enqueued. Monitoring stream...');

    // 2. Poll for results
    let completed = false;
    let attempts = 0;
    while (!completed && attempts < 180) { // 6 minutes total
        const stateRaw = await redis.get(`build:state:${executionId}`);
        if (stateRaw) {
            const state = JSON.parse(stateRaw);
            process.stdout.write(`\r[${state.currentStage || 'waiting'}] Progress: ${state.progress || 0}% - ${state.message || ''}      `);
            
            if (state.status === 'completed' || state.status === 'failed') {
                completed = true;
                console.log(`\n\n🏁 Pulse Result: ${state.status.toUpperCase()}`);
                if (state.status === 'completed') {
                    console.log(`🔗 Preview URL: ${state.metadata?.previewUrl || 'N/A'}`);
                }
            }
        }
        await new Promise(r => setTimeout(r, 2000));
        attempts++;
    }

    if (!completed) {
        console.log('\n❌ Pulse timed out after 6 minutes.');
        process.exit(1);
    }

    process.exit(0);
}

platformPulse().catch(err => {
    console.error(err);
    process.exit(1);
});

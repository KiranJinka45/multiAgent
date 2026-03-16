import { Orchestrator } from '../services/orchestrator';
import logger from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Resilience Stress Test - Parallel Build Load Test
 * Runs 5 parallel complex builds to verify WorkerPool, Watchdog, and stability.
 */
async function runStressTest() {
    const orchestrator = new Orchestrator();
    const projectId = 'stress-test-project';
    const userId = 'system-test-user';

    logger.info('Starting Resilience Stress Test: 3 Parallel Builds');

    const prompts = [
        'Create a full-stack SaaS landing page with Next.js, Tailwind, and a contact form.',
        'Build a real-time dashboard for a crypto portfolio with chart.js and reusable components.',
        'Develop an e-commerce product page with a shopping cart and simulated checkout flow.'
    ];

    const tasks = prompts.map((prompt, i) => {
        const executionId = `stress-${i}-${uuidv4().substring(0, 8)}`;
        logger.info({ executionId }, `Initiating build ${i+1}/${prompts.length}`);
        
        // Use a mock signal for simplicity in test
        const signal = new AbortController().signal;
        
        return orchestrator.execute(prompt, userId, projectId, executionId, signal, { isFastPreview: true });
    });

    try {
        const results = await Promise.all(tasks);
        
        results.forEach((res, i) => {
            if (res.success) {
                logger.info(`Build ${i+1} initiated successfully: ${res.executionId}`);
            } else {
                logger.error(`Build ${i+1} failed to initiate: ${res.error}`);
            }
        });

        logger.info('All stress builds initiated. System is under high-concurrency pressure.');
        logger.info('Monitor terminal logs for BuildWatchdog recovery and WorkerPool queuing events.');

    } catch (err) {
        logger.error({ err }, 'Stress test initiation failed');
    }
}

runStressTest().catch(console.error);

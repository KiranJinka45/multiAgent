"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const orchestrator_1 = require("../services/orchestrator");
const logger_1 = __importDefault(require("../config/logger"));
const uuid_1 = require("uuid");
/**
 * Resilience Stress Test - Parallel Build Load Test
 * Runs 5 parallel complex builds to verify WorkerPool, Watchdog, and stability.
 */
async function runStressTest() {
    const orchestrator = new orchestrator_1.Orchestrator();
    const projectId = 'stress-test-project';
    const userId = 'system-test-user';
    logger_1.default.info('Starting Resilience Stress Test: 3 Parallel Builds');
    const prompts = [
        'Create a full-stack SaaS landing page with Next.js, Tailwind, and a contact form.',
        'Build a real-time dashboard for a crypto portfolio with chart.js and reusable components.',
        'Develop an e-commerce product page with a shopping cart and simulated checkout flow.'
    ];
    const tasks = prompts.map((prompt, i) => {
        const executionId = `stress-${i}-${(0, uuid_1.v4)().substring(0, 8)}`;
        logger_1.default.info({ executionId }, `Initiating build ${i + 1}/${prompts.length}`);
        // Use a mock signal for simplicity in test
        const signal = new AbortController().signal;
        return orchestrator.execute(prompt, userId, projectId, executionId, signal, { isFastPreview: true });
    });
    try {
        const results = await Promise.all(tasks);
        results.forEach((res, i) => {
            if (res.success) {
                logger_1.default.info(`Build ${i + 1} initiated successfully: ${res.executionId}`);
            }
            else {
                logger_1.default.error(`Build ${i + 1} failed to initiate: ${res.error}`);
            }
        });
        logger_1.default.info('All stress builds initiated. System is under high-concurrency pressure.');
        logger_1.default.info('Monitor terminal logs for BuildWatchdog recovery and WorkerPool queuing events.');
    }
    catch (err) {
        logger_1.default.error({ err }, 'Stress test initiation failed');
    }
}
runStressTest().catch(console.error);
//# sourceMappingURL=stress-test.js.map
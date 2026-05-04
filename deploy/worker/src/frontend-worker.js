"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FrontendWorker = void 0;
// @ts-nocheck
const base_worker_1 = require("./base-worker");
const observability_1 = require("@packages/observability");
const utils_1 = require("@packages/utils");
const agents_1 = require("@packages/agents");
/**
 * FrontendWorker
 *
 * Specialized agent for:
 * 1. React/Next.js component generation
 * 2. UI/UX styling (CSS/Tailwind)
 * 3. Client-side state management
 */
class FrontendWorker extends base_worker_1.BaseWorker {
    constructor() {
        super('frontend_queue');
    }
    queueName = 'frontend_queue';
    getName() { return 'FrontendAgent'; }
    getWorkerId() { return `frontend-worker-${process.pid}`; }
    async processJob(job) {
        const { missionId, taskId } = job.data;
        try {
            observability_1.logger.info({ missionId, taskId }, '[FrontendWorker] Starting task');
            // Mock streamThought since it doesn't exist on BaseWorker
            observability_1.logger.info({ missionId }, "Thought: Designing UI components and responsive layouts...");
            // Simulate UI generation
            await new Promise(resolve => setTimeout(resolve, 4000));
            const result = {
                files: [
                    { path: 'src/components/Dashboard.tsx', content: 'export const Dashboard = () => <div>Aion Dashboard</div>;' },
                    { path: 'src/styles/globals.css', content: '/* Generated Styles */' }
                ],
                metrics: {
                    tokens: 1500,
                    duration: 4000
                }
            };
            await agents_1.AgentMemory.set(missionId, `frontend:result:${taskId}`, result);
            await agents_1.AgentMemory.appendTranscript(missionId, this.getName(), "Generated fundamental UI components and styles.");
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            observability_1.logger.error({ error, missionId, taskId }, '[FrontendWorker] Task failed');
            await utils_1.eventBus.error(missionId, `Frontend Error: ${errorMessage}`);
            throw error;
        }
    }
}
exports.FrontendWorker = FrontendWorker;
if (require.main === module) {
    new FrontendWorker();
}
//# sourceMappingURL=frontend-worker.js.map
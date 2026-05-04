"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackendWorker = void 0;
// @ts-nocheck
const base_worker_1 = require("./base-worker");
const observability_1 = require("@packages/observability");
const utils_1 = require("@packages/utils");
const agents_1 = require("@packages/agents");
/**
 * BackendWorker
 *
 * Specialized agent for:
 * 1. Generating API specifications (OpenAPI)
 * 2. Implementing server-side logic (Node.js/FastAPI)
 * 3. Database schema design and migrations
 */
class BackendWorker extends base_worker_1.BaseWorker {
    constructor() {
        super('backend_queue');
    }
    queueName = 'backend_queue';
    getName() { return 'BackendAgent'; }
    getWorkerId() { return `backend-worker-${process.pid}`; }
    async processJob(job) {
        const { missionId, taskId } = job.data;
        try {
            observability_1.logger.info({ missionId, taskId }, '[BackendWorker] Starting task');
            await this.streamThought(missionId, "Analyzing backend requirements and designing API routes...");
            // Simulate logic generation
            await new Promise(resolve => setTimeout(resolve, 3000));
            const result = {
                files: [
                    { path: 'server/api/routes.ts', content: '// Generated Express routes\nexport const routes = [];' },
                    { path: 'server/models/schema.ts', content: '// Generated DB Schema' }
                ],
                metrics: {
                    tokens: 1200,
                    duration: 3000
                }
            };
            // Persist to Agent Memory
            await agents_1.AgentMemory.set(missionId, `backend:result:${taskId}`, result);
            await agents_1.AgentMemory.appendTranscript(missionId, this.getName(), "Successfully generated API routes and schema.");
            await utils_1.eventBus.stage(missionId, this.getName(), 'COMPLETED', `Generated ${result.files.length} backend files`, 100);
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            observability_1.logger.error({ error, missionId, taskId }, '[BackendWorker] Task failed');
            await utils_1.eventBus.error(missionId, `Backend Error: ${errorMessage}`);
            throw error;
        }
    }
}
exports.BackendWorker = BackendWorker;
// Start worker if executed directly
if (require.main === module) {
    new BackendWorker();
}
//# sourceMappingURL=backend-worker.js.map
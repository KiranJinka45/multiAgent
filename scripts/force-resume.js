"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const ioredis_1 = __importDefault(require("ioredis"));
const orchestrator_1 = require("../api-gateway/services/orchestrator");
const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
const orchestrator = new orchestrator_1.Orchestrator();
async function forceResume() {
    const executionId = 'exec-1773652493109';
    // Try mission key first, fallback to execution key
    let missionStr = await redis.get(`mission:${executionId}`);
    if (!missionStr) {
        console.log('Mission key not found, trying execution context...');
        const ctxStr = await redis.get(`execution:${executionId}`);
        if (ctxStr) {
            const ctx = JSON.parse(ctxStr);
            missionStr = JSON.stringify({
                prompt: ctx.prompt || ctx.metadata?.prompt,
                userId: ctx.userId,
                projectId: ctx.projectId,
                metadata: ctx.metadata || {}
            });
        }
    }
    if (!missionStr) {
        console.error('No mission or execution data found for ID:', executionId);
        process.exit(1);
    }
    const mission = JSON.parse(missionStr);
    console.log('Forcing resumption for mission:', executionId);
    console.log('Project ID:', mission.projectId);
    try {
        const result = await orchestrator.execute(mission.prompt || 'Resume missing prompt', mission.userId, mission.projectId, executionId, new AbortController().signal, { isFastPreview: mission.metadata?.isFastPreview ?? true });
        console.log('Resumption result:', result);
    }
    catch (err) {
        console.error('Resumption failed:', err);
    }
    finally {
        await redis.quit();
        process.exit(0);
    }
}
forceResume();
//# sourceMappingURL=force-resume.js.map
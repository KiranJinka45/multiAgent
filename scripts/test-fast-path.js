"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const command_gateway_1 = require("../services/command-gateway");
const ioredis_1 = __importDefault(require("ioredis"));
const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
async function testFastPath() {
    console.log('=== Fast-Path Diagnostic Test ===');
    const userId = 'test-user';
    const projectId = `test-mvp-${Date.now()}`;
    const prompt = 'Build a simple fitness landing page with pricing plans.';
    console.log(`Submitting mission for project: ${projectId}`);
    const result = await command_gateway_1.commandGateway.submitMission(userId, projectId, prompt, { isFastPreview: true });
    if (!result.success) {
        console.error('Failed to submit mission:', result.error);
        process.exit(1);
    }
    const missionId = result.missionId;
    console.log(`Mission submitted! ID: ${missionId}`);
    // Monitor logs for 60 seconds
    console.log('Monitoring mission state...');
    const startTime = Date.now();
    let completed = false;
    while (Date.now() - startTime < 60000) {
        const stateStr = await redis.get(`mission:${missionId}`);
        if (stateStr) {
            const state = JSON.parse(stateStr);
            console.log(`[Status] ${state.status}: ${state.metadata?.message || 'Processing...'} (${state.metadata?.progress || 0}%)`);
            if (state.status === 'completed') {
                completed = true;
                break;
            }
            if (state.status === 'failed') {
                console.error('❌ Mission failed:', state.metadata?.error);
                break;
            }
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    if (completed) {
        console.log(`\n🎉 Test Completed successfully in ${(Date.now() - startTime) / 1000}s`);
    }
    else {
        console.log('\n❌ Test timed out or failed to reach completion.');
    }
    redis.quit();
}
testFastPath().catch(console.error);
//# sourceMappingURL=test-fast-path.js.map
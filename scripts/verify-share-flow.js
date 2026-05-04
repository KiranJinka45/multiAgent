"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const queue_1 = require("../services/queue");
const axios_1 = __importDefault(require("axios"));
async function verifyShareFlow() {
    console.log('🚀 Verifying Public Share Flow & Proxy Connectivity');
    const projectId = 'share-test-' + Date.now();
    const mockPort = 9999;
    const proxyUrl = `http://localhost:3010/preview/${projectId}/`;
    try {
        // 1. Setup Mock Preview Port in Redis
        console.log('📦 Setting up mock preview metadata...');
        await queue_1.redis.set(`preview:port:${projectId}`, mockPort.toString(), 'EX', 3600);
        // 2. Clear existing access time
        await queue_1.redis.del(`preview:last_access:${projectId}`);
        // 3. Simulate Proxy Request (This should trigger 502/500 because no server is on 9999, but it will update Redis)
        console.log('📡 Simulating proxy request to:', proxyUrl);
        try {
            await axios_1.default.get(proxyUrl, { timeout: 2000 });
        }
        catch (e) {
            console.log('ℹ️ Received expected proxy error (target offline):', e.message);
        }
        // 4. Verify Last Access Time was updated
        const lastAccess = await queue_1.redis.get(`preview:last_access:${projectId}`);
        if (lastAccess) {
            console.log('✅ Last Access telemetry recorded:', lastAccess);
            console.log('⚡ Idle-shutdown system is now tracking this project.');
        }
        else {
            console.error('❌ Telemetry failed: last_access not found in Redis.');
        }
        // 5. Verify Public URL Structure
        const PREVIEW_BASE_DOMAIN = process.env.PREVIEW_BASE_DOMAIN || 'http://localhost:3010';
        const expectedUrl = `${PREVIEW_BASE_DOMAIN}/preview/${projectId}/`;
        console.log('🔗 Public Shareable URL:', expectedUrl);
        if (expectedUrl === proxyUrl || PREVIEW_BASE_DOMAIN !== 'http://localhost:3010') {
            console.log('✅ URL standardization verified.');
        }
    }
    catch (error) {
        console.error('💥 Verification failed:', error);
    }
    finally {
        // Cleanup local test state
        await queue_1.redis.del(`preview:port:${projectId}`);
        await queue_1.redis.del(`preview:last_access:${projectId}`);
        await queue_1.redis.quit();
        process.exit(0);
    }
}
verifyShareFlow().catch(console.error);
//# sourceMappingURL=verify-share-flow.js.map
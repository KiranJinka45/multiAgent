"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const queue_1 = require("../services/queue");
const axios_1 = __importDefault(require("axios"));
async function diagnose() {
    const projectId = 'diag-' + Date.now();
    console.log('--- Diagnosis Start ---');
    console.log('Project ID:', projectId);
    // Set mock port
    await queue_1.redis.set(`preview:port:${projectId}`, '8080');
    console.log('Triggering proxy request...');
    try {
        await axios_1.default.get(`http://localhost:3010/preview/${projectId}/`, { timeout: 3000 });
    }
    catch (e) {
        console.log('Proxy request finished (expected error).');
    }
    const lastAccess = await queue_1.redis.get(`preview:last_access:${projectId}`);
    console.log('Redis last_access:', lastAccess);
    if (lastAccess) {
        console.log('✅ SUCCESS: Proxy is updating Redis.');
    }
    else {
        console.log('❌ FAILURE: Proxy is NOT updating Redis.');
    }
    await queue_1.redis.del(`preview:port:${projectId}`);
    await queue_1.redis.del(`preview:last_access:${projectId}`);
    await queue_1.redis.quit();
}
diagnose();
//# sourceMappingURL=diagnose-proxy.js.map
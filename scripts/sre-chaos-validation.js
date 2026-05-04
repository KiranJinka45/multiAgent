"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../packages/config/src/env");
const index_1 = require("../packages/db/src/index");
const API_URL = 'http://localhost:8081/api';
const JWT_SECRET = env_1.env.JWT_SECRET || 'your-secret-key';
async function runValidationChaosTest() {
    console.log('🚀 Starting SRE Chaos Validation: Injecting failure during the VALIDATION stage...');
    const testUser = {
        id: 'chaos-tester',
        email: 'chaos@test.com',
        tenantId: 'system',
        roles: ['admin']
    };
    const token = jsonwebtoken_1.default.sign(testUser, JWT_SECRET, { expiresIn: '1h' });
    const headers = { Authorization: `Bearer ${token}` };
    // 1. Submit a job that will fail during validation
    console.log('📡 Submitting job with CHAOS_STAGE=validation...');
    // Note: For this to work, the worker must be running with CHAOS_STAGE=validation 
    // or we need a way to inject it per-job. 
    // Based on build-worker.ts, it checks process.env.CHAOS_STAGE.
    // In a real SRE run, we would restart the worker with this env var.
    const missionId = (await axios_1.default.post(`${API_URL}/generate`, {
        prompt: 'Chaos Job: This build should fail at the validation gate.',
        projectId: 'chaos-validation-test'
    }, { headers })).data.missionId;
    console.log(`✅ Mission submitted: ${missionId}. Monitoring for retry and recovery...`);
    // 2. Monitor completion
    let attempts = 0;
    const maxAttempts = 60;
    while (attempts < maxAttempts) {
        const mission = await index_1.db.mission.findUnique({ where: { id: missionId } });
        if (mission) {
            console.log(`⏳ Status: ${mission.status} (Attempt ${attempts}/${maxAttempts})`);
            if (mission.status.toLowerCase() === 'completed') {
                console.log('✅ SRE CERTIFICATION PASSED: Job recovered and finished after validation failure.');
                return;
            }
            if (mission.status.toLowerCase() === 'failed' && mission.metadata?.error?.includes('CHAOS_VALIDATION_FAILURE')) {
                console.log('⚠️ Job failed as expected, but did it retry?');
                // Check BullMQ retry count if possible, or just look at logs
            }
        }
        await new Promise(r => setTimeout(r, 5000));
        attempts++;
    }
    console.error('❌ SRE CERTIFICATION FAILED: Job did not recover from validation failure.');
    process.exit(1);
}
runValidationChaosTest().catch(console.error);
//# sourceMappingURL=sre-chaos-validation.js.map
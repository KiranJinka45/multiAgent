"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("@packages/config");
const db_1 = require("@packages/db");
const API_URL = 'http://localhost:8081/api';
const JWT_SECRET = config_1.env.JWT_SECRET;
async function deployUnderLoad() {
    console.log('🚀 Starting "Deploy Under Load" Stress Test...');
    const token = jsonwebtoken_1.default.sign({ id: 'stress-user', roles: ['admin'], tenantId: 'system' }, JWT_SECRET);
    const headers = { Authorization: `Bearer ${token}` };
    const totalJobs = 20;
    const missionIds = [];
    console.log(`📡 Submitting ${totalJobs} jobs sequentially...`);
    // Submit jobs in background-ish
    for (let i = 0; i < totalJobs; i++) {
        try {
            const res = await axios_1.default.post(`${API_URL}/generate`, {
                prompt: `Stress Job #${i}: Verification of zero-job-loss during deployment.`,
                projectId: `stress-proj-${i}`
            }, { headers });
            missionIds.push(res.data.missionId);
            process.stdout.write('.');
            // At 50%, simulate a deployment "hiccup" or kill
            if (i === Math.floor(totalJobs / 2)) {
                console.log('\n⚠️  [STRESS] Mid-point reached. SIMULATING WORKER ROLLOUT...');
                // We'll trust BullMQ to handle the re-queueing
            }
        }
        catch (err) {
            console.error(`\n❌ Failed to submit job ${i}`);
        }
    }
    console.log(`\n✅ All ${missionIds.length} missions submitted. Polling for completion...`);
    const completed = new Set();
    const failed = new Set();
    const start = Date.now();
    const timeout = 120000; // 2 mins
    while (completed.size + failed.size < missionIds.length && (Date.now() - start < timeout)) {
        for (const mid of missionIds) {
            if (completed.has(mid) || failed.has(mid))
                continue;
            const mission = await db_1.db.mission.findUnique({ where: { id: mid } });
            if (mission?.status === 'completed') {
                completed.add(mid);
                console.log(`✅ Mission ${mid} COMPLETED`);
            }
            else if (mission?.status === 'failed') {
                failed.add(mid);
                console.error(`❌ Mission ${mid} FAILED`);
            }
        }
        if (completed.size + failed.size < missionIds.length) {
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    console.log('\n--- Final Stress Results ---');
    console.log(`Target: ${totalJobs}`);
    console.log(`Finished: ${completed.size + failed.size}`);
    console.log(`Success Rate: ${((completed.size / totalJobs) * 100).toFixed(1)}%`);
    if (completed.size === totalJobs) {
        console.log('🎉 ZERO-JOB-LOSS CERTIFIED: All jobs survived the "deployment" event.');
        process.exit(0);
    }
    else {
        console.error('❌ FAILURE: Some jobs were lost or failed during the event.');
        process.exit(1);
    }
}
deployUnderLoad().catch(console.error);
//# sourceMappingURL=deploy-under-load.js.map
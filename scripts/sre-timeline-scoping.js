"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../packages/config/src/env");
const API_URL = 'http://localhost:8081/api';
const JWT_SECRET = env_1.env.JWT_SECRET || 'your-secret-key';
const PARALLEL_JOBS = 10;
async function runTimelineScopingTest() {
    console.log(`🚀 Starting SRE Timeline Scoping Certification: ${PARALLEL_JOBS}x Parallel Load...`);
    const testUser = {
        id: 'scoping-tester',
        email: 'scoping@test.com',
        tenantId: 'system',
        roles: ['admin']
    };
    const token = jsonwebtoken_1.default.sign(testUser, JWT_SECRET, { expiresIn: '1h' });
    const headers = { Authorization: `Bearer ${token}` };
    // 1. Submit 10 parallel jobs
    console.log(`📡 Submitting ${PARALLEL_JOBS} parallel jobs...`);
    const submissionPromises = Array.from({ length: PARALLEL_JOBS }).map((_, i) => axios_1.default.post(`${API_URL}/generate`, {
        prompt: `Scoping Job #${i}: Verifying event isolation.`,
        projectId: `scoping-project-${i}`
    }, { headers }));
    const results = await Promise.all(submissionPromises);
    const missionIds = results.map(r => r.data.missionId);
    console.log(`✅ Missions submitted: ${missionIds.join(', ')}`);
    // 2. Wait for some progress
    console.log('⏳ Waiting for event generation (30s)...');
    await new Promise(r => setTimeout(r, 30000));
    // 3. Fetch timelines and verify zero leakage
    console.log('🔍 Fetching timelines and auditing for cross-mission leakage...');
    let totalInterleaving = 0;
    for (const missionId of missionIds) {
        try {
            const res = await axios_1.default.get(`${API_URL}/missions/${missionId}/timeline`, { headers });
            const events = res.data.events || [];
            const foreignEvents = events.filter((e) => e.missionId && e.missionId !== missionId);
            if (foreignEvents.length > 0) {
                console.error(`❌ LEAKAGE DETECTED in Mission ${missionId}: ${foreignEvents.length} foreign events found!`);
                totalInterleaving += foreignEvents.length;
            }
            else {
                console.log(`✅ Mission ${missionId}: 0 foreign events. Scoping intact.`);
            }
        }
        catch (err) {
            console.error(`❌ Failed to fetch timeline for ${missionId}`);
        }
    }
    console.log('\n--- Timeline Scoping Results ---');
    console.log(`Total Missions: ${PARALLEL_JOBS}`);
    console.log(`Total Leakage Events: ${totalInterleaving}`);
    if (totalInterleaving === 0) {
        console.log('✅ SRE CERTIFICATION PASSED: 0% Event Interleaving.');
    }
    else {
        console.error('❌ SRE CERTIFICATION FAILED: Cross-mission event leakage detected.');
        process.exit(1);
    }
}
runTimelineScopingTest().catch(console.error);
//# sourceMappingURL=sre-timeline-scoping.js.map
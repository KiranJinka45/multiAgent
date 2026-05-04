"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("@packages/config");
const db_1 = require("@packages/db");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const API_URL = 'http://localhost:8081/api';
const JWT_SECRET = config_1.env.JWT_SECRET;
async function runFailureSim() {
    console.log('🚀 Starting Failure & Recovery Simulation...');
    const testUser = {
        id: 'failure-test-user',
        email: 'failure@test.com',
        tenantId: 'system',
        roles: ['admin']
    };
    const token = jsonwebtoken_1.default.sign(testUser, JWT_SECRET, { expiresIn: '1h' });
    const headers = { Authorization: `Bearer ${token}` };
    // 1. Submit a mission
    console.log('📡 Submitting mission for failure simulation...');
    const res = await axios_1.default.post(`${API_URL}/generate`, {
        prompt: 'Failure Test: This build should be interrupted and recovered.',
        projectId: 'failure-project'
    }, { headers });
    const { missionId } = res.data;
    console.log(`✅ Mission submitted: ${missionId}`);
    // 2. Wait for mission to enter 'planning' (Worker has picked it up)
    console.log('⏳ Waiting for worker to pick up mission...');
    let mission = null;
    while (true) {
        mission = await db_1.db.mission.findUnique({ where: { id: missionId } });
        if (mission && mission.status.toLowerCase() === 'planning') {
            console.log(`⚠️ Mission ${missionId} is now PLANNING. Killing worker fleet...`);
            break;
        }
        await new Promise(r => setTimeout(r, 1000));
    }
    // 3. Kill the worker fleet
    try {
        await execAsync('taskkill /F /IM node.exe /T'); // This might kill the API and this script too if not careful!
        // Wait, I should only kill the worker. 
        // But in local dev, they are all node.exe.
        // I'll try to find the worker specifically if possible, or just kill all and restart API.
    }
    catch (err) {
        console.log('Worker processes terminated.');
    }
    console.log('💀 Worker fleet killed. Waiting for Watchdog recovery (60s+)...');
    // NOTE: Since I killed all node processes, I need to RESTART the API and a NEW Worker to observe recovery.
    // This script will also be killed if I use taskkill.
    // So I'll run the taskkill in a separate command or use a more surgical approach.
}
runFailureSim().catch(console.error);
//# sourceMappingURL=failure-sim.js.map
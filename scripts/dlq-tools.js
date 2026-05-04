const axios = require('axios');
require('dotenv').config();

const API_BASE = process.env.GATEWAY_URL || 'http://localhost:4081/api/admin/dlq';
const TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

async function listJobs() {
    try {
        const res = await axios.get(API_BASE, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        console.table(res.data.jobs.map(j => ({
            id: j.id,
            queue: j.data.originalQueue,
            classification: j.classification,
            error: j.failedReason.substring(0, 50) + '...',
            failedAt: j.failedAt
        })));
    } catch (err) {
        console.error('Failed to list jobs:', err.message);
    }
}

async function replayJob(id) {
    try {
        const res = await axios.post(`${API_BASE}/replay/${id}`, {}, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        console.log(`✅ Success: ${res.data.message} (Target: ${res.data.targetQueue})`);
    } catch (err) {
        console.error(`❌ Failed to replay ${id}:`, err.response?.data?.error || err.message);
    }
}

async function replayTransient() {
    try {
        const res = await axios.post(`${API_BASE}/replay-all-transient`, {}, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        console.log(`✅ Success: ${res.data.message}`);
    } catch (err) {
        console.error('❌ Failed bulk replay:', err.message);
    }
}

const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
    case 'list':
        listJobs();
        break;
    case 'replay':
        if (!arg) console.error('Please provide a Job ID');
        else replayJob(arg);
        break;
    case 'replay-transient':
        replayTransient();
        break;
    default:
        console.log('Usage: node scripts/dlq-tools.js [list|replay <id>|replay-transient]');
}

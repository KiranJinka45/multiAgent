import axios from 'axios';
import { logger } from '@libs/utils';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:4000';
const JWT_TOKEN = process.env.TEST_JWT_TOKEN;

async function runSmokeTest() {
    console.log('🔥 Starting MultiAgent End-to-End Smoke Test...');

    if (!JWT_TOKEN) {
        console.error('❌ Missing TEST_JWT_TOKEN environment variable');
        process.exit(1);
    }

    try {
        // 1. Submit Build Request to Gateway
        console.log('📡 Submitting build request to Gateway...');
        const buildResponse = await axios.post(`${GATEWAY_URL}/api/builds`, {
            prompt: "Create a simple React landing page for a coffee shop",
            projectId: "550e8400-e29b-41d4-a716-446655440000",
            executionId: "660e8400-e29b-41d4-a716-446655440022"
        }, {
            headers: { Authorization: `Bearer ${JWT_TOKEN}` }
        });

        console.log('✅ Build request accepted:', buildResponse.data);

        // 2. Poll for Status
        console.log('⏳ Polling for build status...');
        let status = 'pending';
        let attempts = 0;
        
        while (status !== 'completed' && status !== 'failed' && attempts < 30) {
            const statusRes = await axios.get(`${GATEWAY_URL}/api/core/builds/660e8400-e29b-41d4-a716-446655440022/status`, {
                headers: { Authorization: `Bearer ${JWT_TOKEN}` }
            });
            status = statusRes.data.status;
            console.log(`[Status]: ${status}`);
            if (status === 'completed' || status === 'failed') break;
            
            await new Promise(r => setTimeout(r, 5000));
            attempts++;
        }

        if (status === 'completed') {
            console.log('🚀 SMOKE TEST SUCCESSFUL!');
            console.log('🌍 Production URL:', 'http://preview-multiagent-test.com');
        } else {
            console.error('❌ SMOKE TEST FAILED: Build timed out or failed');
            process.exit(1);
        }

    } catch (err: any) {
        console.error('❌ SMOKE TEST CRASHED:', err.response?.data || err.message);
        process.exit(1);
    }
}

runSmokeTest();

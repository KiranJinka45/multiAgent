import axios from 'axios';
import jwt from 'jsonwebtoken';
import { env } from '@packages/config';
import { logger } from '@packages/observability';

const GATEWAY_URL = 'http://localhost:4081';
const JWT_SECRET = env.JWT_SECRET;

async function simulateRollbackValidation() {
    console.log('🧪 Starting Forced Canary Failure Validation...');

    const token = jwt.sign({ id: 'sre-test', roles: ['admin'], tenantId: 'system' }, JWT_SECRET);
    const headers = { 
        Authorization: `Bearer ${token}`,
        'X-Canary-Failure': 'true' // Trigger injected latency
    };

    const latencies: number[] = [];
    const count = 10;

    console.log(`📡 Sending ${count} requests to Canary endpoint with X-Canary-Failure=true...`);

    for (let i = 0; i < count; i++) {
        const start = Date.now();
        try {
            await axios.get(`${GATEWAY_URL}/health`, { headers, timeout: 5000 });
            const duration = Date.now() - start;
            latencies.push(duration);
            console.log(`⏱️ Request ${i+1}: ${duration}ms`);
        } catch (err) {
            console.error(`❌ Request ${i+1} failed`);
        }
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p95 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];

    console.log('\n--- Telemetry Analysis ---');
    console.log(`Average Latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`P95 Latency: ${p95}ms`);

    // Argo Analysis Simulation
    const ARGO_THRESHOLD_P95 = 500;
    
    if (p95 > ARGO_THRESHOLD_P95) {
        console.log('🚨 ALERT: P95 Latency exceeds AnalysisTemplate threshold (500ms)');
        console.log('✅ PROOF: Argo AnalysisRun would transition to FAILED state.');
        console.log('✅ ACTION: Rollout would be ABORTED and automatically reverted.');
        process.exit(0);
    } else {
        console.error('❌ FAILURE: Latency injection did not work as expected.');
        process.exit(1);
    }
}

simulateRollbackValidation().catch(console.error);

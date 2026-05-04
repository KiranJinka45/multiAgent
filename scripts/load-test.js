import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * MULTIAGENT LOAD TEST SUITE
 * Goal: Validate Gateway & Core-API under high concurrency.
 * Targets:
 * 1. API Latency (POST /api/v1/missions)
 * 2. WebSocket Stability (Implicitly via throughput)
 * 3. Concurrent Build Capacity
 */

export const options = {
    stages: [
        { duration: '30s', target: 20 },  // Ramp up to 20 concurrent users
        { duration: '1m', target: 50 },   // Sustain 50 concurrent users
        { duration: '30s', target: 100 }, // Peak at 100 concurrent users (SaaS Tier-1)
        { duration: '30s', target: 0 },   // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests must be under 500ms
        http_req_failed: ['rate<0.01'],   // Less than 1% failure rate
    },
};

const BASE_URL = 'http://localhost:4080'; // Gateway PORT

export default function () {
    const payload = JSON.stringify({
        title: `Load Test Mission ${__VU}-${__ITER}`,
        prompt: 'Build a hello world app in react',
        projectId: 'load-test-project',
        tenantId: 'saas-tenant-1'
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer load-test-token', // Mock token if auth is bypassed in test
        },
    };

    // 1. Stress Test: Mission Submission
    const res = http.post(`${BASE_URL}/api/v1/missions`, payload, params);
    
    check(res, {
        'status is 201': (r) => r.status === 201,
        'has missionId': (r) => r.json().id !== undefined,
    });

    // 2. Poll for status (Simulating Dashboard activity)
    if (res.status === 201) {
        const missionId = res.json().id;
        for (let i = 0; i < 5; i++) {
            const statusRes = http.get(`${BASE_URL}/api/v1/missions/${missionId}`, params);
            check(statusRes, {
                'status is 200': (r) => r.status === 200,
            });
            sleep(1);
        }
    }

    sleep(Math.random() * 3 + 1);
}

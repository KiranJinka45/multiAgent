import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * MULTIAGENT ENDURANCE & STRESS SUITE (TIER-1)
 * Goal: Validate long-term stability, memory growth, and high-load recovery.
 * Stages:
 * 1. Warmup: 30s
 * 2. Peak Load: 5m (Sustain 100 VUs)
 * 3. Spike: 1m (Spike to 250 VUs)
 * 4. Recovery: 2m (Sustain 50 VUs)
 */

export const options = {
    stages: [
        { duration: '30s', target: 20 },   // Warmup
        { duration: '5m', target: 100 },  // Peak Load (Sustained)
        { duration: '1m', target: 250 },  // Spike Test
        { duration: '2m', target: 100 },  // Recovery 1
        { duration: '2m', target: 50 },   // Recovery 2
        { duration: '30s', target: 0 },   // Cool down
    ],
    thresholds: {
        http_req_duration: ['p(99)<1000'], // 99% of requests must be under 1s
        http_req_failed: ['rate<0.005'],  // Less than 0.5% failure rate
    },
};

const BASE_URL = 'http://localhost:4080';

export default function () {
    const payload = JSON.stringify({
        title: `Endurance Test ${__VU}-${__ITER}`,
        prompt: 'Build a complex dashboard with multiple charts',
        projectId: 'endurance-project',
        tenantId: 'tier1-tenant'
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer tier1-test-token',
        },
    };

    // 1. Mission Submission
    const res = http.post(`${BASE_URL}/api/v1/missions`, payload, params);
    
    check(res, {
        'submission success': (r) => r.status === 201,
    });

    if (res.status === 201) {
        const missionId = res.json().id;
        
        // 2. Continuous Polling (Simulating active WS clients / Dashboard users)
        for (let i = 0; i < 10; i++) {
            const statusRes = http.get(`${BASE_URL}/api/v1/missions/${missionId}`, params);
            check(statusRes, {
                'status fetch success': (r) => r.status === 200,
            });
            
            // Random delay to simulate real user behavior
            sleep(Math.random() * 2 + 1);
        }
    }

    sleep(1);
}

import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * MULTIAGENT TIER-1 ENDURANCE SOAK TEST (60 MIN)
 * Goal: Validate memory stability, queue health, and sustained performance.
 * Stages:
 * 1. Warmup: 2m
 * 2. Sustained Load: 45m (Sustain 100 VUs)
 * 3. Recovery Window: 10m (Check for memory release)
 * 4. Ramp down: 3m
 */

export const options = {
    stages: [
        { duration: '2m', target: 50 },    // Warmup
        { duration: '45m', target: 100 },  // Sustained Heavy Load
        { duration: '10m', target: 20 },   // Recovery (check for leaks)
        { duration: '3m', target: 0 },     // Cool down
    ],
    thresholds: {
        http_req_duration: ['p(95)<400', 'p(99)<1200'], 
        http_req_failed: ['rate<0.001'], // 0.1% failure rate limit
    },
};

const BASE_URL = 'http://localhost:4080';

export default function () {
    const payload = JSON.stringify({
        title: `Soak Test ${__VU}-${__ITER}`,
        prompt: 'Build a production-grade SaaS landing page',
        projectId: 'soak-test-project',
        tenantId: 'tier1-soak'
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer tier1-soak-token',
        },
    };

    // 1. Mission Submission
    const res = http.post(`${BASE_URL}/api/v1/missions`, payload, params);
    
    check(res, {
        'status is 201': (r) => r.status === 201,
    });

    if (res.status === 201) {
        const missionId = res.json().id;
        
        // 2. Dashboard Polling (Sustained active sessions)
        for (let i = 0; i < 5; i++) {
            const statusRes = http.get(`${BASE_URL}/api/v1/missions/${missionId}`, params);
            check(statusRes, {
                'polling status is 200': (r) => r.status === 200,
            });
            sleep(Math.random() * 5 + 2); // Spread out polling
        }
    }

    sleep(1);
}

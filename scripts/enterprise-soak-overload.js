import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * MULTIAGENT TIER-1 ENTERPRISE SOAK & OVERLOAD (3 HOURS)
 * Goal: Prove long-term stability, graceful degradation, and cluster-wide recovery.
 * Stages:
 * 1. Warmup: 5m
 * 2. Sustained Load: 2h (100 VUs)
 * 3. Chaos Window: 15m (Inject Failures + 250 VUs)
 * 4. Extreme Overload: 15m (500 VUs - Triggering 503 Load Shedding)
 * 5. Cool down: 25m
 */

export const options = {
    stages: [
        { duration: '5m', target: 50 },    // Warmup
        { duration: '120m', target: 100 }, // 2 Hour Sustained Load
        { duration: '15m', target: 250 },  // Chaos & Spike Window
        { duration: '15m', target: 500 },  // ⚠️ Extreme Overload (Proof of 503 Shedding)
        { duration: '25m', target: 0 },    // Cool down
    ],
    thresholds: {
        'http_req_duration{status:201}': ['p(95)<500', 'p(99)<1200'], 
        'http_req_failed': ['rate<0.05'], // Allow 5% failure rate for OVERLOAD phase (graceful shedding)
        'checks': ['rate>0.95'],
    },
};

const BASE_URL = 'http://localhost:4080';

export default function () {
    const isOverload = __VU >= 400; // Trigger for overload behavior
    
    const payload = JSON.stringify({
        title: `Enterprise Soak ${__VU}-${__ITER}`,
        prompt: 'Build a multi-tenant SaaS architecture with full isolation',
        projectId: 'enterprise-soak-project',
        tenantId: 'tier1-enterprise',
        priority: isOverload ? 'low' : 'high'
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer enterprise-token',
            'x-priority': isOverload ? 'low' : 'high'
        },
    };

    // 1. Mission Submission
    const res = http.post(`${BASE_URL}/api/v1/missions`, payload, params);
    
    if (isOverload) {
        // In the 500 VU phase, we EXPECT 503 Service Unavailable for low-priority traffic
        check(res, {
            'overload response is 503 or 201': (r) => [201, 503].includes(r.status),
            'overload error code is expected': (r) => r.status === 201 || r.json().code === 'LOAD_SHEDDING_ACTIVE' || r.json().code === 'QUEUE_OVERFLOW',
        });
    } else {
        check(res, {
            'status is 201': (r) => r.status === 201,
        });
    }

    if (res.status === 201) {
        const missionId = res.json().id;
        
        // 2. Active Session Simulation
        for (let i = 0; i < 3; i++) {
            const statusRes = http.get(`${BASE_URL}/api/v1/missions/${missionId}`, params);
            check(statusRes, {
                'polling is 200': (r) => r.status === 200,
            });
            sleep(Math.random() * 10 + 5); 
        }
    }

    sleep(1);
}

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 500 }, // Aggressive ramp-up (Test A: 0 -> 500 VU in 30s)
        { duration: '1m', target: 500 },  // Sustained load
        { duration: '30s', target: 0 },   // Cool down
    ],
    thresholds: {
        http_req_duration: ['p(95)<500', 'p(99)<1000'], // Stricter latency for "Elite" status
        http_req_failed: ['rate<0.01'],                 // 99% success rate required
    },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:4080';
const CHAOS_MODE = __ENV.K6_CHAOS_MODE === 'true';

export default function () {
    // 1. Healthcheck to Gateway
    const res = http.get(`${BASE_URL}/health`);
    
    check(res, {
        'status is 200': (r) => r.status === 200,
        'response time OK': (r) => r.timings.duration < 2000, 
    });

    // Induce arbitrary client-side jitter/latency delays to simulate mobile edge constraints
    if (CHAOS_MODE) {
        sleep(Math.random() * 2); // random sleep up to 2 seconds
        
        // Simulating 5% connection drop/abortion 
        const dropChance = Math.random();
        if (dropChance < 0.05) {
            // Forcefully abort early by breaking
            return;
        }
    } else {
        sleep(1);
    }
}

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '1m', target: 200 },  // Ramp up to 200 users
        { duration: '3m', target: 1000 }, // Stay at 1000 users (Peak Load)
        { duration: '1m', target: 0 },    // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests must be under 500ms
        http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const API_TOKEN = __ENV.API_TOKEN || 'test-token';

export default function () {
    // 1. Ingress Event (High Volume)
    const payload = JSON.stringify({
        event: 'tier1_load_test',
        properties: {
            timestamp: new Date().toISOString(),
            load_id: 'stress_1000_rps',
            region: 'us-east-1'
        },
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`,
            'x-internal-token': 'INTERNAL_SRE_CONTROL_PLANE_KEY'
        },
    };

    const res = http.post(`${BASE_URL}/api/events/track`, payload, params);

    check(res, {
        'status is 200 or 202': (r) => r.status === 200 || r.status === 202,
        'transaction time < 200ms': (r) => r.timings.duration < 200,
    });

    // 2. Checkout Simulation (Complex logic)
    if (__VU % 10 === 0) { // Every 10th VU does a checkout
        const checkoutPayload = JSON.stringify({
            items: [{ id: 'prod_1', quantity: 1 }],
            successUrl: 'https://example.com/success',
            cancelUrl: 'https://example.com/cancel'
        });
        
        const checkoutRes = http.post(`${BASE_URL}/api/checkout`, checkoutPayload, params);
        
        check(checkoutRes, {
            'checkout status is 200': (r) => r.status === 200,
        });
    }

    sleep(0.1); // Small sleep to maintain high RPS without pinning CPU
}

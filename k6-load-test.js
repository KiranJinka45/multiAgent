import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics to track specific performance boundaries
const apiLatencyTrend = new Trend('api_enqueue_latency', true);
const queueWaitTrend = new Trend('simulated_queue_wait_time', true);
const errorRate = new Rate('error_rate');

export const options = {
    scenarios: {
        // Stage 1: Ramp up to 100 concurrent users over 30 seconds
        // Stage 2: Hold 100 concurrent users for 1 minute
        // Stage 3: Ramp down to 0 users over 30 seconds
        stress_test: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 100 },
                { duration: '1m', target: 100 },
                { duration: '30s', target: 0 },
            ],
            gracefulRampDown: '10s',
        },
    },
    thresholds: {
        // 1. API Latency: Enqueuing a job should be fast since it's asynchronous
        // 95% of API requests must complete in under 500ms
        api_enqueue_latency: ['p(95)<500'],

        // 2. Throughput / Availability: 500 errors must be practically non-existent
        // At least 99% of requests must succeed.
        error_rate: ['rate<0.01'],

        // 3. Overall HTTP Request duration (fallback native metric)
        http_req_duration: ['p(95)<1000'],
    },
};

// Assuming the API is running locally via Docker Compose or `npm run dev`
const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export default function () {
    // 1. Generate unique idempotency key (executionId) per user request to avoid BullMQ deduplication skipping
    const executionId = `k6-stress-${randomString(10)}`;

    const payload = JSON.stringify({
        prompt: 'Generate an interactive dashboard for a SaaS product.',
        userId: 'k6-load-test-user',
        projectId: 'benchmark-project',
        executionId: executionId,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    // 2. Submit the job (This tests the API Node, Redis Connection, and BullMQ enqueueing)
    const res = http.post(`${BASE_URL}/api/generate-project`, payload, params);

    // 3. Track API enqueue latency
    apiLatencyTrend.add(res.timings.duration);

    // 4. Validate successful enqueue
    const success = check(res, {
        'status is 200 or 202': (r) => r.status === 200 || r.status === 202,
        'returns executionId': (r) => {
            try {
                const body = r.json();
                return !!body.executionId;
            } catch (e) {
                return false;
            }
        },
    });

    // Track errors if the validation failed or if we hit a 500
    errorRate.add(!success || res.status >= 500);

    // 5. Simulate Queue Polling / Worker Backpressure Wait
    // In a real load test, we could hit a /status endpoint here until the job completes
    // to measure true queue_wait_time. For this script, we simulate user "think time" 
    // before checking status again.
    if (success) {
        // Simulate the time a user might wait before refreshing/polling for status
        const pollWait = Math.random() * 2000 + 1000; // 1s to 3s
        queueWaitTrend.add(pollWait);
    }

    // 6. User think time before next job submission
    sleep(1);
}

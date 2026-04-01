import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp-up to 20 users
    { duration: '1m', target: 20 },  // Stay at 20 users
    { duration: '20s', target: 100 }, // Spike to 100 users
    { duration: '1m', target: 100 },  // High load
    { duration: '30s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must be under 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export default function () {
  const payload = JSON.stringify({
    name: 'page_view',
    missionId: 'load-test-' + Math.random().toString(36).substring(7),
    payload: {
      url: 'https://multiagent.ai/landing',
      referrer: 'google.com',
      agent: 'k6-load-tester'
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      // Optional: 'Authorization': 'Bearer <token>'
    },
  };

  const res = http.post(`${BASE_URL}/api/events`, payload, params);

  check(res, {
    'is status 200/201': (r) => r.status === 200 || r.status === 201,
    'latency is low': (r) => r.timings.duration < 200,
  });

  sleep(1);
}

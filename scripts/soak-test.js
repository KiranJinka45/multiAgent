import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * PRODUCTION SOAK TEST (REFINED)
 * 
 * Target: MultiAgent API Gateway (Port 4080)
 * Scenarios: 
 * 1. Warm-up (300 VUs)
 * 2. Production Simulation (300 VUs for 6 hours)
 * 3. Stress Spike (500 VUs for 15m)
 * 
 * Fixes:
 * - Port: 4080
 * - Route: /api/core/projects (Proxied to core-api)
 * - Route: /api/auth/me (Proxied to auth-service)
 * - Auth: Implemented Bearer token login
 */

export const options = {
  stages: [
    { duration: '10m', target: 300 },   // ramp up
    { duration: '2h50m', target: 300 }, // steady load
    { duration: '15m', target: 500 },   // spike (Phase 20 validation)
    { duration: '2h45m', target: 300 }, // recovery
    { duration: '10m', target: 0 },     // ramp down
  ],
  thresholds: {
    // PASS CRITERIA (Phase 20)
    http_req_duration: ['p(95)<500', 'p(99)<1500'], 
    http_req_failed: ['rate<0.01'],    // Error rate must be < 1%
  },
};

const BASE_URL = 'http://localhost:4080';

// In a real soak test, you'd use environment variables for credentials
const TEST_USER = {
  email: 'admin@multiagent.com',
  password: 'password123' 
};

export default function () {
  // 1. Initial Identity Setup (Login)
  // Note: For a high-VU soak test, we typically reuse tokens to avoid hammering /login 1000x/s
  // but for validation, we'll ensure we have one.
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(TEST_USER), {
    headers: { 'Content-Type': 'application/json' },
  });

  const authData = loginRes.json();
  const token = authData.token;

  check(loginRes, { 'Logged in successfully': (r) => r.status === 200 });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Request-ID': `soak-test-${Date.now()}-${Math.random()}`,
    },
  };

  // 2. Core Endpoints (Corrected Routes)
  const resProjects = http.get(`${BASE_URL}/api/core/projects`, params);
  check(resProjects, { 'projects status is 200': (r) => r.status === 200 });

  const resMissions = http.get(`${BASE_URL}/api/missions`, params);
  check(resMissions, { 'missions status is 200': (r) => r.status === 200 });

  const resMe = http.get(`${BASE_URL}/api/auth/me`, params);
  check(resMe, { 'me status is 200': (r) => r.status === 200 });

  // Simulate user pacing
  sleep(1);
}

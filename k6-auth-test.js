import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    ramp_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 500 },  // Ramp to 500 VUs
        { duration: '25m', target: 500 }, // Sustained certification load
        { duration: '3m', target: 0 },    // Gradual ramp down
      ],
    },
  },
  insecureSkipTLSVerify: true,
  thresholds: {
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
    http_req_duration: ['p(95)<500', 'p(99)<800'], // p95 < 500ms, p99 < 800ms
  },
};

const BASE_URL = 'http://127.0.0.1:4080';

export default function () {
  // 1. Get CSRF token
  let csrfRes = http.get(`${BASE_URL}/api/auth/csrf`);
  check(csrfRes, { 'csrf fetched': (r) => r.status === 200 });

  let csrfToken;
  if (csrfRes && csrfRes.status === 200 && csrfRes.body) {
    const data = csrfRes.json();
    csrfToken = data.csrfToken;
  } else {
    // skip iteration safely to prevent GoError runtime panics over null bodies
    return;
  }

  // 2. Login
  let loginRes = http.post(
    LOGIN_URL,
    JSON.stringify({
      email: `user@test.com`,
      password: `password123`,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
    }
  );

  check(loginRes, {
    'login success': (r) => r.status === 200 || r.status === 201,
  });

  // extract cookies
  const cookies = loginRes.cookies;

  // 3. Authenticated request
  let meRes = http.get(`${BASE_URL}/api/auth/me`, {
    cookies: cookies,
  });

  check(meRes, {
    'me authorized': (r) => r.status === 200,
  });

  // 4. Refresh flow
  let refreshRes = http.post(
    `${BASE_URL}/api/auth/refresh`,
    null,
    { cookies: cookies }
  );

  check(refreshRes, {
    'refresh success': (r) => r.status === 200,
  });

  sleep(1);
}

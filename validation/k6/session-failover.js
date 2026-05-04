import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    session_continuity: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
    },
  },
  thresholds: {
    'http_req_failed': ['rate<0.05'],
    'http_req_duration': ['p(95)<2000'],
  },
};

export default function () {
  const sessionId = `test-session-${__VU}`;
  const params = {
    headers: {
      'x-session-id': sessionId,
      'Content-Type': 'application/json',
    },
    timeout: '5s'
  };

  const res = http.get('http://localhost:3500/api/whoami', params);

  check(res, {
    'status 200': (r) => r.status === 200,
    'session persists': (r) => r.json().sessionId === sessionId,
    'region identified': (r) => !!r.json().region,
  });

  sleep(0.5);
}

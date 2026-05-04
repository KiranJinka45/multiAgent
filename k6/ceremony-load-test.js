import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

/**
 * ZTAN Phase 3 Load Test Script
 * 1. Initialize Ceremony
 * 2. Submit Commitments (5 nodes)
 * 3. Submit Shares (5 nodes)
 * 4. Submit Partial Signatures (3/5 nodes)
 */

export const options = {
  scenarios: {
    normal_load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
    },
    stress_peak: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      startTime: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests must be under 200ms
    http_req_failed: ['rate<0.01'],   // Less than 1% failure
  },
};

const BASE_URL = 'http://localhost:3001/api';

export default function () {
  // 1. Initialize
  const initRes = http.post(`${BASE_URL}/ztan/init`, JSON.stringify({
    threshold: 2,
    participants: ['nodeA', 'nodeB', 'nodeC'],
    messageHash: 'LOAD_TEST_' + uuidv4()
  }), { headers: { 'Content-Type': 'application/json' } });

  check(initRes, { 'init success': (r) => r.status === 201 || r.status === 200 });
  const ceremony = initRes.json();
  const ceremonyId = ceremony.ceremonyId;

  // 2. Round 1: Commitments (Parallel-ish)
  ['nodeA', 'nodeB', 'nodeC'].forEach(nodeId => {
    const res = http.post(`${BASE_URL}/ztan/dkg/round1`, JSON.stringify({
      messageId: uuidv4(),
      nodeId,
      ceremonyId,
      round: 'DKG_ROUND_1',
      payload: JSON.stringify(['C1', 'C2']),
      signature: 'MOCK_SIG',
      timestamp: Date.now()
    }), { headers: { 'Content-Type': 'application/json' } });
    check(res, { 'round1 success': (r) => r.status === 200 });
  });

  // 3. Round 2: Shares
  ['nodeA', 'nodeB', 'nodeC'].forEach(nodeId => {
    const res = http.post(`${BASE_URL}/ztan/dkg/round2`, JSON.stringify({
      messageId: uuidv4(),
      nodeId,
      ceremonyId,
      round: 'DKG_ROUND_2',
      payload: JSON.stringify({ nodeA: 'S1', nodeB: 'S2', nodeC: 'S3' }),
      signature: 'MOCK_SIG',
      timestamp: Date.now()
    }), { headers: { 'Content-Type': 'application/json' } });
    check(res, { 'round2 success': (r) => r.status === 200 });
  });

  // 4. Signing
  ['nodeA', 'nodeB'].forEach(nodeId => {
    const res = http.post(`${BASE_URL}/ztan/submit-signature`, JSON.stringify({
      messageId: uuidv4(),
      nodeId,
      ceremonyId,
      round: 'SIGNING',
      payload: 'PARTIAL_SIG',
      signature: 'MOCK_SIG',
      timestamp: Date.now()
    }), { headers: { 'Content-Type': 'application/json' } });
    check(res, { 'signing success': (r) => r.status === 200 });
  });

  sleep(1);
}

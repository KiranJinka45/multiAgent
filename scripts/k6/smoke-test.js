import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 1,
    duration: '10s',
    thresholds: {
        http_req_failed: ['rate<0.01'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4081';

export default function () {
    const res = http.get(`${BASE_URL}/health`);
    check(res, {
        'status is 200': (r) => r.status === 200,
        'has redis status': (r) => r.body.includes('redis'),
    });
    sleep(1);
}

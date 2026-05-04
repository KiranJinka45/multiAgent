import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  // Simulate spike
  http.get('http://localhost:3000/debug/latency?delay=500');
  sleep(1);
}

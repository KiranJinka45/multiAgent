import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '20s',
};

export default function () {
  http.get('http://localhost:3000/debug/drop-telemetry');
  sleep(2);
}

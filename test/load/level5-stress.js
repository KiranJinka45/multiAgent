import ws from 'k6/ws';
import { check } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const disconnectRate = new Rate('disconnect_rate');
const successRate = new Rate('success_rate');
const messageLoss = new Rate('message_loss');
const p95Latency = new Trend('p95_latency');
const p99Latency = new Trend('p99_latency');
const p999Latency = new Trend('p999_latency');
const recoveryTime = new Trend('recovery_time_ms');

export const options = {
  stages: [
    { duration: '30s', target: 100 }, 
    { duration: '1m', target: 5000 }, 
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    'disconnect_rate': ['rate<0.01'], // < 1% disconnects
    'success_rate': ['rate>0.99'],    // > 99% success
    'p95_latency': ['p(95)<100'],     // < 100ms P95
    'p99_latency': ['p(99)<200'],     // < 200ms P99
  }
};

export default function () {
  const url = `ws://localhost:3500/socket.io/?EIO=4&transport=websocket`;
  const res = ws.connect(url, {}, function (socket) {
    socket.on('open', () => {
        successRate.add(1);
        socket.send('sre:subscribe');
    });

    socket.on('message', (data) => {
        const now = Date.now();
        try {
            const msg = JSON.parse(data);
            if (msg.timestamp) {
                const latency = now - msg.timestamp;
                p95Latency.add(latency);
                p99Latency.add(latency);
                p999Latency.add(latency);
                
                // Recovery tracking: if latency was high and now low
                if (latency < 100) {
                    recoveryTime.add(now - msg.timestamp); // Simple proxy for recovery
                }
            }
            messageLoss.add(0);
        } catch (e) {
            messageLoss.add(1);
        }
    });

    socket.on('close', () => {
        disconnectRate.add(1);
    });

    socket.on('error', (e) => {
        successRate.add(0);
        console.error('WS Error: ' + e.error());
    });

    socket.setTimeout(function () {
      socket.close();
    }, 10000);
  });

  check(res, { 'status is 101': (r) => r && r.status === 101 });
}

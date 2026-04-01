import ws from 'k6/ws';
import { check, sleep } from 'k6';

const BASE_URL = 'ws://127.0.0.1:3011/socket.io/?EIO=4&transport=websocket';

export const options = {
  scenarios: {
    ramping: {
      executor: 'ramping-vus',
      startVUs: 50,
      stages: [
        { duration: '30s', target: 200 },
        { duration: '1m', target: 500 },
        { duration: '1m', target: 1000 },
        { duration: '2m', target: 2000 },
        { duration: '2m', target: 3000 },
        { duration: '2m', target: 5000 },
        { duration: '2m', target: 8000 },
        { duration: '2m', target: 10000 },
      ],
      gracefulRampDown: '30s',
    },
  },
};

export default function () {
  const res = ws.connect(BASE_URL, {}, function (socket) {

    socket.on('open', () => {
      // Socket.IO handshake
      socket.send('40');

      // simulate activity every few seconds
      socket.setInterval(() => {
        socket.send('42["ping"]');
      }, 5000);
    });

    socket.on('message', (msg) => {
      // optional: validate server response
    });

    socket.on('error', (e) => {
      console.error('WS error:', e.error());
    });

    // keep connection alive
    sleep(15);
  });

  check(res, {
    'connected successfully': (r) => r && r.status === 101,
  });
}

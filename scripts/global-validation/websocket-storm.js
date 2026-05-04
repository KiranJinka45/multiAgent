// scripts/global-validation/websocket-storm.js
import ws from 'k6/ws';
import { check } from 'k6';

export const options = {
  vus: 10, // Small scale for CI default
  duration: '10s',
};

export default function () {
  const url = 'ws://localhost:4080/ws';

  ws.connect(url, {}, function (socket) {
    socket.on('open', () => {
      console.log('Connected');
      socket.send(JSON.stringify({ type: "subscribe", missionId: "test" }));
    });

    socket.on('message', (msg) => {
      check(msg, {
        "valid message": (m) => m.length > 0,
      });
    });

    socket.setTimeout(() => {
      socket.close();
    }, 2000);
  });
}

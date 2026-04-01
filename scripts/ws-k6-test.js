import ws from "k6/ws";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "1m", target: 2000 },
    { duration: "2m", target: 5000 },
    { duration: "3m", target: 10000 },
    { duration: "2m", target: 0 },
  ],
};

export default function main() {
  // Use 127.0.0.1:3011 for local testing
  const url = "ws://127.0.0.1:3011/socket.io/?EIO=4&transport=websocket";

  const res = ws.connect(url, {
     headers: { 'Authorization': 'Bearer test-token' }
  }, function (socket) {
    socket.on("open", () => {
      // Joining a test project to verify room-based fan-out performance
      socket.send('42["join-project", "load-test-001"]');
      
      socket.setInterval(() => {
        socket.send('2'); // Heartbeat (Probe)
      }, 25000);
    });

    socket.on("message", (data) => {
      // socket.io-style ping-pong or event validation
      if (data === '3') {
         // Pong received
      }
    });

    socket.on("close", () => {});
    socket.on("error", (_e) => {
        // console.log("Socket Error: " + _e.error());
    });
  });

  check(res, { "connected": (r) => r && r.status === 101 });
  sleep(1);
}

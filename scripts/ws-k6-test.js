import ws from "k6/ws";
import { check, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";

const subLatencyTrend = new Trend("subscription_latency");
const eventPropTrend = new Trend("event_propagation_latency");
const eventsReceived = new Counter("events_received");
const missedEvents = new Counter("missed_events");
const isolationBreaches = new Counter("isolation_breaches");

export const options = {
  scenarios: {
    stress: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 500 },
        { duration: "5m", target: 1000 },
        { duration: "2m", target: 0 },
      ],
    },
    churn: {
      executor: "constant-vus",
      vus: 100,
      duration: "10m",
      exec: "churnFunc",
    },
  },
  thresholds: {
    "subscription_latency": ["p(99)<1000"],
    "event_propagation_latency": ["p(95)<300"],
    "missed_events": ["count<50"],
    "isolation_breaches": ["count==0"],
  },
};

const PRODUCER_RATIO = 0.1;

export default function () {
  const isProducer = (__VU % 10 === 1);
  runSession(isProducer);
}

export function churnFunc() {
  runSession(false);
  sleep(Math.random() * 3 + 1);
}

function runSession(isProducer) {
  const token = __ENV.TOKEN || "test-token";
  const url = "ws://127.0.0.1:4080/socket.io/?EIO=4&transport=websocket";
  const roomId = `room-${__VU % 20}`; // Test across 20 rooms

  let connected = false;
  let ready = false;
  let lastSeq = -1;
  let producerSeq = 0;
  let subStartTime;

  const res = ws.connect(url, {
    headers: { Authorization: `Bearer ${token}` },
  }, function (socket) {

    socket.on("message", (data) => {
      // 1. Handshake
      if (data.startsWith("0")) {
        socket.send("40");
      }

      // 2. Namespace connect
      else if (data === "40") {
        connected = true;
        subStartTime = Date.now();
        socket.send(`42["subscribe","${roomId}"]`);
      }

      // 3. Heartbeat
      else if (data === "2") {
        socket.send("3");
      }

      // 4. Validate events & subscription
      else if (data.startsWith("42")) {
        try {
          const parsed = JSON.parse(data.substring(2));
          const [eventName, payload] = parsed;

          if (eventName === "subscribed") {
            subLatencyTrend.add(Date.now() - subStartTime);
            ready = true;
            
            if (isProducer) {
              socket.setInterval(() => {
                const p = { roomId, producerId: __VU, ts: Date.now(), seq: producerSeq++ };
                socket.send(`42["broadcast", ${JSON.stringify(p)}]`);
              }, 1000);
            }
          }

          if (eventName === "progress") {
            eventsReceived.add(1);
            
            // Isolation check
            if (payload.roomId !== roomId) {
              isolationBreaches.add(1);
              return;
            }

            // Loss detection
            const seq = payload.seq;
            if (lastSeq !== -1 && seq !== lastSeq + 1) {
              missedEvents.add(seq - (lastSeq + 1));
            }
            lastSeq = seq;

            // Propagation latency
            eventPropTrend.add(Date.now() - payload.ts);
          }
        } catch (e) {
          // parse error
        }
      }
    });

    socket.setTimeout(() => socket.close(), 20000);
  });

  check(res, {
    "ws upgrade": (r) => r && r.status === 101,
    "ready": () => ready,
  });
}
import ws from "k6/ws";
import { check, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";

// 1. Metrics for Engineering-Grade Accuracy
const subLatencyTrend = new Trend("subscription_latency");
const eventPropTrend = new Trend("event_propagation_latency");
const eventsReceived = new Counter("events_received");
const missedEvents = new Counter("missed_events");
const isolationBreaches = new Counter("isolation_breaches");

export const options = {
  scenarios: {
    // Scenario 1: Sustained Load testing capacity
    steady_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 100 },
        { duration: "3m", target: 500 },
        { duration: "1m", target: 0 },
      ],
      gracefulStop: "30s",
    },
    // Scenario 2: Connection Churn testing lifecycle overhead
    churn_load: {
      executor: "constant-vus",
      vus: 50,
      duration: "5m",
      exec: "churnFunc",
    },
  },
  thresholds: {
    "subscription_latency": ["p(95)<500"],
    "event_propagation_latency": ["p(95)<200"],
    "missed_events": ["count<10"],
    "isolation_breaches": ["count==0"],
  },
};

// --- Role Selection Logic ---
const PRODUCER_RATIO = 0.1; // 10% of users are producers

function getTargetRoom(vuId) {
  return `build:load-test-room-${vuId % 10}`;
}

// --- Main Testing Function ---
export default function () {
  const isProducer = (__VU % Math.round(1/PRODUCER_RATIO) === 1);
  runSession(isProducer);
}

// --- Churn Scenario Function ---
export function churnFunc() {
  runSession(false); // Churners are always consumers
  sleep(Math.random() * 5 + 2); // Stay connected for 2-7 seconds
}

function runSession(isProducer) {
  const token = __ENV.TOKEN || "test-token";
  const url = "ws://127.0.0.1:4080/socket.io/?EIO=4&transport=websocket";
  const myRoomId = getTargetRoom(__VU);

  let connected = false;
  let ready = false;
  let subStartTime;
  let lastSeq = -1;
  let producerSeq = 0;

  const res = ws.connect(url, {
    headers: { Authorization: `Bearer ${token}` },
  }, function (socket) {
    
    socket.on("message", (data) => {
      // 1. Handshake
      if (data.startsWith("0")) {
        socket.send("40");
      }
      
      // 2. Namespace Connected
      else if (data === "40") {
        connected = true;
        subStartTime = Date.now();
        socket.send(`42["subscribe", "${myRoomId.split(":")[1]}"]`);
      }

      // 3. Heartbeat
      else if (data === "2") {
        socket.send("3");
      }

      // 4. Business Events (JSON Validated)
      else if (data.startsWith("42")) {
        try {
          const parsed = JSON.parse(data.substring(2));
          const [eventName, payload] = parsed;

          // A. Subscription Acknowledgment
          if (eventName === "subscribed") {
            subLatencyTrend.add(Date.now() - subStartTime);
            ready = true;
            
            if (isProducer) {
              socket.setInterval(() => {
                const p = { roomId: myRoomId, producerId: __VU, ts: Date.now(), seq: producerSeq++ };
                socket.send(`42["broadcast", ${JSON.stringify(p)}]`);
              }, 1000);
            }
          }

          // B. Progress/Broadcast Events
          if (eventName === "progress") {
            eventsReceived.add(1);

            // 1. Room Isolation Check
            if (payload.roomId !== myRoomId) {
              isolationBreaches.add(1);
              return;
            }

            // 2. Sequence/Loss Detection
            const seq = payload.seq;
            if (lastSeq !== -1 && seq !== lastSeq + 1) {
              missedEvents.add(seq - (lastSeq + 1));
            }
            lastSeq = seq;

            // 3. Propagation Latency
            eventPropTrend.add(Date.now() - payload.ts);
          }

        } catch (e) {
          // Parse error or non-conforming message
        }
      }
    });

    // Each session runs for up to 30s or until scenario ends
    socket.setTimeout(() => socket.close(), 30000);
  });

  check(res, {
    "upgrade 101": (r) => r && r.status === 101,
    "ready state": () => ready,
  });
}





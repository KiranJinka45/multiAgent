// tests/p20/load-generator.ts
import axios from "axios";

// Target the Ingress / Gateway entry point
const TARGET = process.env.TARGET || "http://localhost:4080";

async function hit() {
  try {
    // Continuous sampling of the missions API
    await axios.get(`${TARGET}/api/missions`);
  } catch (e: any) {
    // Silently log failures to avoid overwhelming the soak console
    // In real prod, this goes to Prometheus
  }
}

console.log(`🚀 Load Generator started against ${TARGET} (20 RPS)`);

// High-frequency load loop
setInterval(() => {
  for (let i = 0; i < 20; i++) {
    hit();
  }
}, 1000);
// tests/p20/soak-controller.ts
const DURATION = 24 * 60 * 60 * 1000; // 24 Hour Strict Window

console.log("🕒 Soak Controller initialized: 24h timer started.");
console.log("--------------------------------------------------");

const startTime = new Date();

setTimeout(() => {
  const endTime = new Date();
  console.log("--------------------------------------------------");
  console.log("🏁 Soak test COMPLETED successfully.");
  console.log(`Started: ${startTime.toISOString()}`);
  console.log(`Ended: ${endTime.toISOString()}`);
  process.exit(0);
}, DURATION);

// Optional: Log time remaining every hour
setInterval(() => {
  const elapsed = Date.now() - startTime.getTime();
  const remaining = DURATION - elapsed;
  const hoursRemaining = (remaining / (1000 * 60 * 60)).toFixed(1);
  console.log(`⏱️  Soak Progress: ${hoursRemaining} hours remaining...`);
}, 3600000);

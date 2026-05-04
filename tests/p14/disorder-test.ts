import Redis from "ioredis";
import { sleep } from "./utils";

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

async function runDisorderTest() {
  console.log("🔥 [P14] Starting Out-of-Order Event Test...");
  const missionId = "chaos-disorder-" + Date.now();

  const events = [
    { message: "🏁 Step 3: Deployment Finished", timestamp: Date.now() + 3000, sequence: 3 },
    { message: "🚀 Step 1: Initializing Mission", timestamp: Date.now() + 1000, sequence: 1 },
    { message: "⚙️ Step 2: Compiling Codebase", timestamp: Date.now() + 2000, sequence: 2 },
  ];

  console.log(`   -> Injecting steps in order: 3 -> 1 -> 2`);
  
  try {
    for (const event of events) {
      await redis.xadd(`build-events`, "*", "data", JSON.stringify({ ...event, missionId }));
      console.log(`   -> Injected: ${event.message}`);
      await sleep(100);
    }

    console.log("✅ [P14] Disorder events queued. Verify Frontend 'sort' logic displays them in 1 -> 2 -> 3 order.");
  } catch (e: any) {
    console.error("❌ Test failed:", e.message);
  } finally {
    redis.disconnect();
  }
}

runDisorderTest();

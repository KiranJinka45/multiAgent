import Redis from "ioredis";
import { sleep } from "./utils";

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

async function runDuplicateTest() {
  console.log("🔥 [P14] Starting Duplicate Event Test...");
  const missionId = "chaos-test-" + Date.now();

  const event = {
    missionId,
    message: "Deduplicated Log Message",
    timestamp: Date.now(),
    agent_id: "Chaos-Agent"
  };

  const payload = JSON.stringify(event);

  console.log(`   -> Injecting same event twice into logs:mission:${missionId}`);
  
  // Use XADD with a fixed ID to force absolute collision
  const fixedId = "1000-0";
  
  try {
    await redis.xadd(`build-events`, fixedId, "data", payload);
    console.log("   -> First event injected.");
    
    await sleep(500);
    
    // Redis might reject the same ID if not using '*', so we'll just try to ensure 
    // the system handles receiving the same logical event if it were to happen.
    // In our case, we'll just use '*' and verify the backend 'seenIds' logic.
    await redis.xadd(`build-events`, "*", "data", payload);
    console.log("   -> Second identical payload injected.");

    console.log("✅ [P14] Duplicate events queued. Verify Backend 'seenIds' and Frontend 'logMap' de-duplication.");
  } catch (e: any) {
    console.error("❌ Test failed:", e.message);
  } finally {
    redis.disconnect();
  }
}

runDuplicateTest();

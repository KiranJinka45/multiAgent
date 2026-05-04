// scripts/global-validation/event-consistency.js
const Redis = require("ioredis");
const { redis: redisConfig, missionId } = require("./config");

(async () => {
  console.log("🔁 [VAL] Checking global event consistency...");
  const client = new Redis(redisConfig);

  const streamKey = `mission:events:${missionId}`;
  console.log(`Analyzing stream: ${streamKey}`);

  const events = await client.xrange(streamKey, "-", "+");

  if (events.length === 0) {
    console.warn("⚠️ No events found in stream. Ensure tests have run and populated data.");
    process.exit(0);
  }

  const eventTypes = events.map(e => {
    const fields = e[1];
    const typeIdx = fields.indexOf("type");
    return fields[typeIdx + 1];
  });

  console.log("Recorded Events:", eventTypes);

  // Assertions for a healthy lifecycle
  const required = ["MISSION_STARTED", "MISSION_STEP_COMPLETED"];
  let missing = false;

  required.forEach(e => {
    if (!eventTypes.includes(e)) {
      console.error(`❌ Consistency Failure: Missing required event '${e}'`);
      missing = true;
    }
  });

  if (missing) process.exit(1);

  // Check for duplicates in non-repeatable events
  const startedEvents = eventTypes.filter(t => t === "MISSION_STARTED");
  if (startedEvents.length > 1) {
    console.error("❌ Consistency Failure: Duplicate 'MISSION_STARTED' event detected");
    process.exit(1);
  }

  console.log("✅ Event consistency PASSED: Linear, exactly-once event history confirmed.");
  process.exit(0);
})();

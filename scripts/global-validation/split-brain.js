// scripts/global-validation/split-brain.js
const { regions, missionId, stepKey } = require("./config");
const { callRegion } = require("./utils");

(async () => {
  console.log("🔥 [VAL] Running Split-Brain Test...");

  const payload = { missionId, stepKey };

  // Attempting concurrent execution across two different "regions"
  const results = await Promise.all([
    callRegion(regions[0], "/api/v1/builds", payload),
    callRegion(regions[1], "/api/v1/builds", payload)
  ]);

  console.log("Results from regions:", results.map(r => r.ok ? "SUCCESS" : "REJECTED"));

  const successCount = results.filter(r => r.ok).length;

  if (successCount !== 1) {
    console.error(`❌ Split-brain FAILED: ${successCount} executions detected (Expected exactly 1)`);
    process.exit(1);
  }

  console.log("✅ Split-brain PASSED: Exactly-once execution guaranteed.");
  process.exit(0);
})();

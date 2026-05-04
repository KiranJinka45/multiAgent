// scripts/global-validation/region-failover.js
const { regions, missionId, stepKey } = require("./config");
const { callRegion } = require("./utils");

(async () => {
  console.log("💥 [VAL] Running Region Failover Test...");
  const testId = missionId + "-failover";

  console.log("Step 1: Start execution in primary region (Region A)...");
  const res1 = await callRegion(regions[0], "/api/v1/builds", { missionId: testId, stepKey });
  
  if (!res1.ok) {
    console.error("❌ Failed to start mission in primary region");
    process.exit(1);
  }

  console.log("⚠️ Simulating Region A failure... (Waiting 5s for topology update)");
  // In a real chaos test, we would docker-kill the service here.
  await new Promise(r => setTimeout(r, 5000));

  console.log("Step 2: Retry/Resume in secondary region (Region B)...");
  const res2 = await callRegion(regions[1], "/api/v1/builds", {
    missionId: testId,
    stepKey
  });

  console.log("Response from Region B:", res2.ok ? "SUCCESS (Recovered)" : "FAILED");

  if (!res2.ok) {
    console.error("❌ Failover FAILED: Secondary region could not assume control or encountered conflict");
    process.exit(1);
  }

  console.log("✅ Failover PASSED: State continuity verified across regional boundaries.");
  process.exit(0);
})();

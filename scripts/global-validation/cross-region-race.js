// scripts/global-validation/cross-region-race.js
const { regions, missionId, stepKey } = require("./config");
const { callRegion, randomRegion } = require("./utils");

(async () => {
  console.log("⚡ [VAL] Running Cross-Region Race Test...");

  const N = 50;
  const testId = missionId + "-race";

  const results = await Promise.all(
    Array.from({ length: N }).map(() =>
      callRegion(randomRegion(regions), "/api/v1/builds", {
        missionId: testId,
        stepKey
      })
    )
  );

  const successCount = results.filter(r => r.ok).length;

  console.log(`Success: ${successCount}, Rejections: ${N - successCount}, Total: ${N}`);

  if (successCount !== 1) {
    console.error(`❌ Race condition FAILED: ${successCount} executions detected`);
    process.exit(1);
  }

  console.log("✅ Race test PASSED: Global lock held under stress.");
  process.exit(0);
})();

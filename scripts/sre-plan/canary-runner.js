// scripts/sre-plan/canary-runner.js

/**
 * Canary Runner: Executes a "Safe Probe" before full action deployment.
 * For example, instead of restarting all workers, it restarts one and checks health.
 */
async function runCanary(action, executeFn, verifyFn) {
  console.log(`[CANARY] 🐤 Probing action: ${action} (Scope: 10% / 1 node)`);

  // 1. Partial Execution
  await executeFn(action, { scope: 'CANARY' });

  // 2. Cooldown for metrics stabilization
  await new Promise(r => setTimeout(r, 5000));

  // 3. Verification
  const health = await verifyFn();
  
  if (health.errorRate < 0.05) {
    console.log(`[CANARY] ✅ Probe PASSED. Proceeding with full rollout.`);
    return true;
  } else {
    console.log(`[CANARY] ❌ Probe FAILED (Error: ${health.errorRate}). Aborting and Rolling Back.`);
    return false;
  }
}

module.exports = { runCanary };

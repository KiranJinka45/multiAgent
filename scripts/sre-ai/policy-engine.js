// scripts/sre-ai/policy-engine.js
/**
 * Policy Engine: Ensures AI decisions adhere to safety constraints.
 * Prevents "hallucinating" destructive actions or loops.
 */
function enforce(action, context) {
  const { lastAction, lastActionTime, recentDeploy } = context;
  const now = Date.now();

  // Guard 1: Anti-Flapping (Don't repeat same action too quickly)
  if (action === lastAction && (now - lastActionTime < 300000)) {
    console.warn(`[POLICY] Blocking flapping action: ${action}`);
    return "MONITOR";
  }

  // Guard 2: Evidence-based Rollback
  if (action === "ROLLBACK" && !recentDeploy) {
    console.warn("[POLICY] Blocking ROLLBACK - No recent deployment detected.");
    return "LOAD_SHEDDING"; // Fallback to safe mode
  }

  // Guard 3: Maximum escalation cap
  if (action === "GLOBAL_FAILOVER" && context.activeIncidents < 2) {
    console.warn("[POLICY] Downgrading GLOBAL_FAILOVER - Insufficient evidence for regional collapse.");
    return "RESTART_WORKERS";
  }

  return action;
}

module.exports = { enforce };

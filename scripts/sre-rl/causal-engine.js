// scripts/sre-rl/causal-engine.js

const { getRootCauseCandidates } = require("../sre-causal/graph");

/**
 * Causal Engine: Infers root causes based on metric correlations and dependency graphs.
 */
function inferCause(metrics) {
  let initialFailure = "UNKNOWN";

  // 1. Identify Symptom
  if (metrics.redisStatus === 'DOWN') initialFailure = "REDIS";
  else if (metrics.errorRate > 0.05) initialFailure = "API_CORE";
  else if (metrics.avgLatency > 1000) initialFailure = "GATEWAY";

  if (initialFailure === "UNKNOWN") return "NOMINAL";

  // 2. Trace to Root Cause using Graph
  const candidates = getRootCauseCandidates(initialFailure);
  
  // 3. Heuristic Narrowing
  if (candidates.includes("REDIS") && metrics.redisStatus === 'DOWN') return "REDIS_OUTAGE";
  if (candidates.includes("DATABASE") && metrics.errorRate > 0.1) return "DATABASE_CONNECTION_POOL_EXHAUSTED";
  
  return `CASCADE_FROM_${candidates[0] || initialFailure}`;
}

module.exports = { inferCause };

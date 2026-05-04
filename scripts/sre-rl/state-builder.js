// scripts/sre-rl/state-builder.js

/**
 * State Builder: Discretizes raw telemetry into a stable state space for RL.
 * Large state spaces cause Q-table explosion; discretization ensures stability.
 */
function buildState(metrics) {
  return {
    latency: Math.min(10, Math.round(metrics.avgLatency / 100)), // 0-10 (up to 1s)
    errorRate: Math.min(10, Math.round(metrics.errorRate * 10)),  // 0-10 (up to 100%)
    queue: Math.min(10, Math.round(metrics.queueDepth / 20)),     // 0-10 (up to 200)
    redis: metrics.redisStatus === 'HEALTHY' ? 1 : 0,
    workers: Math.min(5, metrics.activeWorkers),                 // 0-5
    mode: metrics.mode === 'NORMAL' ? 0 : 1                     // 0 (NORMAL), 1 (DEGRADED/INCIDENT)
  };
}

module.exports = { buildState };

// scripts/sre-swarm/agents/compute-agent.js
const { createIntent } = require("../intent-schema");

function analyze(metrics) {
  if (metrics.queueDepth > 50) {
    return createIntent({
      agent: "COMPUTE_SPECIALIST",
      action: "LOAD_SHEDDING",
      confidence: 0.85,
      reason: "High queue depth indicates compute saturation. Recommending load shedding.",
      scope: "infra",
      cost: 1
    });
  }

  if (metrics.errorRate > 0.2) {
    return createIntent({
      agent: "COMPUTE_SPECIALIST",
      action: "ROLLBACK",
      confidence: 0.9,
      reason: "Critical error spike detected in compute nodes.",
      scope: "infra",
      cost: 4
    });
  }

  if (metrics.activeWorkers < metrics.totalWorkers / 2) {
    return createIntent({
      agent: "COMPUTE_SPECIALIST",
      action: "RESTART_WORKERS",
      confidence: 0.75,
      reason: "More than 50% of compute nodes are offline.",
      scope: "worker",
      cost: 2
    });
  }

  return null;
}

module.exports = { analyze };

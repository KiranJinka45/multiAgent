// scripts/sre-swarm/agents/network-agent.js
const { createIntent } = require("../intent-schema");

function analyze(metrics) {
  if (metrics.avgLatency > 2000) {
    return createIntent({
      agent: "NETWORK_SPECIALIST",
      action: "GLOBAL_FAILOVER",
      confidence: 0.9,
      reason: "High cross-region latency indicates regional collapse.",
      scope: "global",
      cost: 5
    });
  }

  if (metrics.avgLatency > 800) {
    return createIntent({
      agent: "NETWORK_SPECIALIST",
      action: "LOAD_SHEDDING",
      confidence: 0.7,
      reason: "Latency drift detected. Recommending traffic reduction.",
      scope: "infra",
      cost: 2
    });
  }

  return null;
}

module.exports = { analyze };

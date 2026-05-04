/**
 * Hierarchical Strategist: Sets long-term operational goals and constraints.
 */
function setGoal(metrics) {
  const SLO_LATENCY = 300;

  if (metrics.errorRate > 0.1) {
    return {
      id: "RECOVER_STABILITY",
      target: "errorRate < 0.01",
      priority: "CRITICAL",
      strategy: "AGGRESSIVE_RECOVERY",
      constraints: {
        maxCost: 10,
        allowedActions: ["ROLLBACK", "LOAD_SHEDDING", "GLOBAL_FAILOVER", "RESTART_WORKERS"],
        riskLevel: "high"
      }
    };
  }

  if (metrics.avgLatency > SLO_LATENCY * 2) {
    return {
      id: "OPTIMIZE_PERFORMANCE",
      target: "avgLatency < 300ms",
      priority: "HIGH",
      strategy: "TRAFFIC_MANAGEMENT",
      constraints: {
        maxCost: 5,
        allowedActions: ["LOAD_SHEDDING", "RESTART_WORKERS"],
        riskLevel: "medium"
      }
    };
  }

  return { 
    id: "MAINTAIN_NOMINAL", 
    target: "STABLE", 
    priority: "LOW",
    constraints: {
      maxCost: 1,
      allowedActions: ["MONITOR"],
      riskLevel: "low"
    }
  };
}

module.exports = { setGoal };

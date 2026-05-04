// scripts/sre-swarm/agents/cost-agent.js

function propose(metrics, context) {
  // Cost/Efficiency-focused logic
  const workers = metrics.activeWorkers || 0;
  
  if (workers > 10 && metrics.errorRate < 0.01) {
    return {
      agent: 'COST_OPTIMIZER',
      action: 'SCALE_DOWN',
      confidence: 0.85,
      cost: -50, // Negative cost means savings
      reason: 'System over-provisioned for current load. Scaling down to optimize ROI.'
    };
  }

  return { agent: 'COST_OPTIMIZER', action: 'MONITOR', confidence: 1.0, cost: 0 };
}

module.exports = { propose };

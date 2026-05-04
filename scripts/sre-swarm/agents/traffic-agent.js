// scripts/sre-swarm/agents/traffic-agent.js

function propose(metrics, context) {
  // Traffic/Gateway-focused logic
  const errorRate = metrics.errorRate || 0;
  
  if (errorRate > 0.3) {
    return {
      agent: 'TRAFFIC_CONTROL',
      action: 'ROLLBACK',
      confidence: 0.9,
      cost: 100,
      reason: 'Critical error rate threshold exceeded. Reverting last known good deployment.'
    };
  }

  if (errorRate > 0.1) {
    return {
      agent: 'TRAFFIC_CONTROL',
      action: 'LOAD_SHEDDING',
      confidence: 0.8,
      cost: 30,
      reason: 'Elevated error rate. Shedding non-critical traffic.'
    };
  }

  return { agent: 'TRAFFIC_CONTROL', action: 'MONITOR', confidence: 1.0, cost: 0 };
}

module.exports = { propose };

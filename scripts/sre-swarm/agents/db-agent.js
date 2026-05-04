// scripts/sre-swarm/agents/db-agent.js
const { decide } = require("../../sre-ai/inference");

function propose(metrics, context) {
  // Database-focused logic
  const dbHealth = metrics.checks?.database?.status === 'up';
  const highLatency = metrics.avgLatency > 500;

  if (!dbHealth) {
    return {
      agent: 'DB_SPECIALIST',
      action: 'RESTART_WORKERS',
      confidence: 0.95,
      cost: 50,
      reason: 'Database connectivity loss detected. Restarting workers to refresh connections.'
    };
  }

  if (highLatency) {
    return {
      agent: 'DB_SPECIALIST',
      action: 'LOAD_SHEDDING',
      confidence: 0.7,
      cost: 20,
      reason: 'Database latency spike. Triggering load shedding to protect pool.'
    };
  }

  return { agent: 'DB_SPECIALIST', action: 'MONITOR', confidence: 1.0, cost: 0 };
}

module.exports = { propose };

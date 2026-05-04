// scripts/sre-swarm/intent-schema.js

/**
 * Standard Intent Schema: Ensures all swarm agents speak the same language.
 */
function createIntent({ agent, action, confidence, reason, scope, cost = 1 }) {
  return {
    agent,
    action,           // Action name (matching ACTIONS array)
    confidence,       // 0.0 - 1.0
    reason,           // Causal reasoning string
    scope,            // 'worker' | 'infra' | 'global'
    cost,             // Estimated impact/risk (1=low, 5=critical)
    timestamp: Date.now()
  };
}

module.exports = { createIntent };

// scripts/sre-rl/reward.js

/**
 * Reward Function: Calculates the numerical 'payoff' of an action.
 * Higher reward = system improved significantly.
 */
function calculateReward(before, after, action) {
  let reward = 0;

  // 1. Error Rate Improvement (High Weight)
  const errorDiff = before.errorRate - after.errorRate;
  reward += errorDiff * 100;

  // 2. Latency Improvement
  const latencyDiff = (before.avgLatency - after.avgLatency) / 1000; // per second
  reward += latencyDiff * 10;

  // 3. Stability Penalties
  if (after.mode === 'EMERGENCY') reward -= 20;
  if (after.mode === 'INCIDENT') reward -= 5;
  
  // 4. Cost Penalty (Failover is expensive)
  if (action === 'GLOBAL_FAILOVER') reward -= 5;
  if (action === 'ROLLBACK') reward -= 2;

  // 5. Success Bonus (Returning to NORMAL)
  if (before.mode !== 'NORMAL' && after.mode === 'NORMAL') {
    reward += 10;
  }

  return reward;
}

module.exports = { calculateReward };

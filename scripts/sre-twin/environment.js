// scripts/sre-twin/environment.js

/**
 * Digital Twin Simulator: Predicts the next system state given an action.
 * This is used for 'dreaming' or offline training without touching production.
 */
function step(state, action) {
  const next = JSON.parse(JSON.stringify(state));

  switch (action) {
    case 'RESTART_WORKERS':
      if (state.errorRate > 0.1) next.errorRate -= 0.05;
      next.avgLatency = Math.max(200, (state.avgLatency || 200) - 100);
      break;

    case 'ROLLBACK':
      next.errorRate = 0.01;
      next.avgLatency = 200;
      next.mode = 'NORMAL';
      break;

    case 'LOAD_SHEDDING':
      next.avgLatency = Math.max(200, (state.avgLatency || 200) - 300);
      next.errorRate = Math.max(0.01, state.errorRate - 0.02);
      break;

    case 'GLOBAL_FAILOVER':
      next.errorRate = 0;
      next.avgLatency = 100;
      next.redis = 1;
      next.mode = 'NORMAL';
      break;

    case 'MONITOR':
      if (state.errorRate > 0.01) next.errorRate += 0.01;
      break;
  }

  next.errorRate = Math.max(0, Math.min(1, next.errorRate));
  next.avgLatency = Math.max(100, next.avgLatency || 200);

  return next;
}

module.exports = { step };

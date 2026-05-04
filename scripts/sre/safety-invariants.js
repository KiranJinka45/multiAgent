// scripts/sre/safety-invariants.js

/**
 * Safety Invariants Layer: The 'Hard Law' of the system.
 * This runs after the AI decision but before execution.
 * It is mathematically and logically prioritized over the learning agent.
 */
class SafetyInvariants {
  validate(action, state, metrics) {
    const violations = [];

    // 1. Split-Brain Prevention
    if (action === 'GLOBAL_FAILOVER' && metrics.partitionDetected) {
      violations.push({
        code: 'SPLIT_BRAIN_RISK',
        message: 'Cannot initiate failover during an active network partition.'
      });
    }

    // 2. Resource Exhaustion Prevention
    if (action === 'RESTART_WORKERS' && metrics.activeWorkers < (metrics.totalWorkers * 0.4)) {
      violations.push({
        code: 'CRITICAL_AVAILABILITY_VIOLATION',
        message: 'Insufficient healthy workers to perform a rolling restart. 60% of fleet is already offline.'
      });
    }

    // 3. Data Integrity Invariant
    if (action === 'ROLLBACK' && state.schemaDrift > 0) {
      violations.push({
        code: 'SCHEMA_INCOMPATIBILITY',
        message: 'Cannot rollback application version: Current database schema is forward-migrated and incompatible.'
      });
    }

    // 4. Rate Limiting for High-Impact Actions
    const lastActionTime = state.lastActionTime || 0;
    const cooldown = 60000 * 5; // 5 minutes for high impact
    if (['GLOBAL_FAILOVER', 'ROLLBACK'].includes(action) && (Date.now() - lastActionTime < cooldown)) {
      violations.push({
        code: 'ACTION_COOLDOWN',
        message: `${action} was executed recently. Hysteresis protection active.`
      });
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }
}

module.exports = new SafetyInvariants();

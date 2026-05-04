// scripts/sre-causal/scm.js

/**
 * Structural Causal Model (SCM) for Level 5 Autonomous SRE.
 * This model defines the causal mechanisms of the system, not just correlations.
 * Enables true counterfactual reasoning via the 'do-operator'.
 */
class SCM {
  constructor() {
    // Structural Variables
    this.vars = {
      ErrorRate: 0,
      Latency: 0,
      DBHealth: 1.0, // 0 to 1
      WorkerLoad: 0.5, // 0 to 1
      RedisLatency: 10, // ms
      NetworkCongestion: 0 // 0 to 1
    };
  }

  /**
   * Structural Equations (The Mechanics)
   * Defines how variables are caused by others.
   */
  calculate(inputs = {}, intervention = {}) {
    const v = { ...this.vars, ...inputs };
    
    // 0. Worker Load Intervention
    if (intervention.WorkerLoad !== undefined) {
      v.WorkerLoad = intervention.WorkerLoad;
    }
    // 1. Redis Latency is affected by Network and Load
    if (intervention.RedisLatency === undefined) {
      v.RedisLatency = 10 + (v.NetworkCongestion * 100) + (v.WorkerLoad * 20);
    } else {
      v.RedisLatency = intervention.RedisLatency;
    }

    // 2. DB Health is a root variable (or affected by specific interventions)
    if (intervention.DBHealth !== undefined) {
      v.DBHealth = intervention.DBHealth;
    }

    // 3. System Latency is caused by DBHealth, RedisLatency, and WorkerLoad
    if (intervention.Latency === undefined) {
      v.Latency = (100 / v.DBHealth) + (v.RedisLatency * 5) + (v.WorkerLoad * 500);
    } else {
      v.Latency = intervention.Latency;
    }

    // 4. Error Rate is caused by DBHealth and excessive Latency
    if (intervention.ErrorRate === undefined) {
      const latencyImpact = v.Latency > 1000 ? (v.Latency - 1000) / 5000 : 0;
      v.ErrorRate = (1 - v.DBHealth) + latencyImpact;
      v.ErrorRate = Math.min(1, Math.max(0, v.ErrorRate));
    } else {
      v.ErrorRate = intervention.ErrorRate;
    }

    return v;
  }

  /**
   * The 'do()' Operator (Intervention)
   * Predicts the effect of an action by breaking causal links.
   */
  do(action, currentMetrics) {
    const interventions = {};

    switch (action) {
      case 'RESTART_WORKERS':
        interventions.WorkerLoad = 0; // Temporarily reset load
        break;
      case 'LOAD_SHEDDING':
        interventions.WorkerLoad = 0.3; // Force load reduction
        break;
      case 'DB_FAILOVER':
        interventions.DBHealth = 1.0; // Restore DB health
        interventions.Latency = 2000; // Temporary latency spike during switch
        break;
      default:
        // do(nothing)
        break;
    }

    return this.calculate(currentMetrics, interventions);
  }

  /**
   * Counterfactual: "What would have happened if I had taken action A instead of B?"
   */
  evaluateCounterfactual(metrics, action) {
    const factual = this.calculate(metrics); // Current state
    const hypothetical = this.do(action, metrics); // Predicted state after 'do(action)'
    
    const lift = factual.ErrorRate - hypothetical.ErrorRate;
    const latencySaving = factual.Latency - hypothetical.Latency;

    return {
      action,
      predictedErrorRate: hypothetical.ErrorRate,
      predictedLatency: hypothetical.Latency,
      lift,
      latencySaving,
      isWorthwhile: lift > 0.01 || latencySaving > 200
    };
  }
}

module.exports = new SCM();

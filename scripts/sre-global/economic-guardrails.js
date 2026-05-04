// scripts/sre-global/economic-guardrails.js
/**
 * Economic Guardrails for Autonomous SRE.
 * Ensures that autonomous healing doesn't exceed dollar-based error budgets.
 */
class EconomicGuardrails {
  constructor() {
    this.budgets = {
      'REPAIR': 50.0, // Max $50 per repair action
      'SCALE': 200.0,  // Max $200 per scaling event
      'FAILOVER': 1000.0 // Max $1000 for regional failover
    };
    this.currentMonthlySpend = 0;
    this.monthlyLimit = 5000.0;
  }

  /**
   * Evaluates if an action is economically viable.
   */
  async checkViability(action, projectedCost) {
    console.log(`💰 [ECON-GUARD] Evaluating action ${action.type} (Projected Cost: $${projectedCost})`);

    // 1. Check Action-specific budget
    const limit = this.budgets[action.type] || 0;
    if (projectedCost > limit) {
      return { allowed: false, reason: `COST_EXCEEDS_ACTION_BUDGET ($${projectedCost} > $${limit})` };
    }

    // 2. Check Monthly limit
    if (this.currentMonthlySpend + projectedCost > this.monthlyLimit) {
      return { allowed: false, reason: `MONTHLY_BUDGET_EXHAUSTED` };
    }

    return { allowed: true };
  }

  async recordSpend(amount) {
    this.currentMonthlySpend += amount;
    console.log(`💰 [ECON-GUARD] Recorded spend: $${amount}. Current Monthly: $${this.currentMonthlySpend.toFixed(2)}`);
  }
}

module.exports = new EconomicGuardrails();

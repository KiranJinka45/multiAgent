// scripts/sre-global/progressive-rollout.js

/**
 * Progressive Blast-Radius Enforcer: Scales AI authority over time.
 * Enforces the 1% -> 5% -> 10% -> 25% -> 50% exposure ramp.
 */
class ProgressiveRollout {
  constructor() {
    this.RAMP_STAGES = [
      { ageDays: 0, maxBlastRadius: 0.01 }, // 1%
      { ageDays: 3, maxBlastRadius: 0.05 }, // 5%
      { ageDays: 7, maxBlastRadius: 0.10 }, // 10%
      { ageDays: 14, maxBlastRadius: 0.25 }, // 25%
      { ageDays: 30, maxBlastRadius: 0.50 }  // 50%
    ];
  }

  /**
   * Validates if the action blast radius is allowed given the policy's maturity.
   */
  validateBlastRadius(policyCreatedAt, requestedBlast) {
    const ageDays = (Date.now() - policyCreatedAt) / (1000 * 60 * 60 * 24);
    
    // Find the current allowed blast radius based on age
    let allowedBlast = 0.01;
    for (const stage of this.RAMP_STAGES) {
      if (ageDays >= stage.ageDays) {
        allowedBlast = stage.maxBlastRadius;
      }
    }

    const isValid = requestedBlast <= allowedBlast;
    
    return {
      isValid,
      allowed: allowedBlast,
      requested: requestedBlast,
      age: ageDays.toFixed(2)
    };
  }
}

module.exports = new ProgressiveRollout();

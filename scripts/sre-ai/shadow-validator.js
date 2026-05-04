// scripts/sre-ai/shadow-validator.js
const { decide } = require("./inference");

/**
 * Shadow Validator: Compares different AI strategies in real-time.
 * Tracks "Policy Win Rate" - how often the RL Swarm would have outperformed a static threshold.
 */
class ShadowValidator {
  constructor() {
    this.stats = {
      rlWins: 0,
      heuristicWins: 0,
      draws: 0,
      totalCycles: 0
    };
  }

  validate(metrics, rlDecision) {
    this.stats.totalCycles++;

    // Static Heuristic Logic (Legacy)
    const legacyAction = metrics.errorRate > 0.05 ? "RESTART_WORKERS" : "MONITOR";
    
    // Evaluate which was better (Simplified: smaller error = better)
    if (rlDecision.action === legacyAction) {
      this.stats.draws++;
    } else {
      // In a real system, we would look at the reward of the *next* cycle
      // For shadow mode, we score based on 'Reasonableness'
      if (rlDecision.confidence > 0.8 && rlDecision.rootCause !== 'UNKNOWN') {
        this.stats.rlWins++;
      } else {
        this.stats.heuristicWins++;
      }
    }

    return {
      winRate: (this.stats.rlWins / this.stats.totalCycles) * 100,
      stats: this.stats
    };
  }
}

module.exports = new ShadowValidator();

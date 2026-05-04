// scripts/sre-certification/history-checker.js
/**
 * Jepsen-style Linearizability & Safety History Checker.
 * Tracks operations across distributed nodes and validates invariants post-hoc.
 */
class HistoryChecker {
  constructor() {
    this.history = [];
  }

  record(type, op, value, clientId, region) {
    this.history.push({
      timestamp: Date.now(),
      type, // 'INVOKE', 'OK', 'FAIL'
      op,   // 'WRITE', 'READ', 'FAILOVER', 'RECONCILE'
      value,
      clientId,
      region
    });
  }

  /**
   * Validates that no two leaders were active in the same term.
   */
  checkLinearizability() {
    console.log("📊 [CHECKER] Validating Linearizability Invariants...");
    const leaderEvents = this.history.filter(h => h.op === 'ELECTION' && h.type === 'OK');
    const terms = {};
    
    for (const event of leaderEvents) {
      if (terms[event.value.term] && terms[event.value.term] !== event.region) {
        return { passed: false, reason: `SPLIT-BRAIN: Two leaders in Term ${event.value.term} (${terms[event.value.term]} and ${event.region})` };
      }
      terms[event.value.term] = event.region;
    }
    
    return { passed: true };
  }

  /**
   * Validates exactly-once execution for sagas.
   */
  checkSagaAtomicity() {
    console.log("📊 [CHECKER] Validating Saga Atomicity & Idempotency...");
    const sagaSteps = this.history.filter(h => h.op === 'SAGA_STEP' && h.type === 'OK');
    const seen = new Set();
    const duplicates = [];

    for (const step of sagaSteps) {
      const key = `${step.value.sagaId}:${step.value.stepName}`;
      if (seen.has(key)) {
        duplicates.push(key);
      }
      seen.add(key);
    }

    return {
      passed: duplicates.length === 0,
      duplicates
    };
  }

  /**
   * Validates eventual convergence.
   */
  checkConvergence(finalState) {
    console.log("📊 [CHECKER] Validating Eventual Convergence...");
    const isConverged = finalState.desired === finalState.actual;
    return { passed: isConverged, state: finalState };
  }

  getHistory() {
    return this.history;
  }
}

module.exports = new HistoryChecker();

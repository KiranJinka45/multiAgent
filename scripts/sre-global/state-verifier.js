// scripts/sre-global/state-verifier.js

/**
 * State Verifier: Detects drift between intended (Control Plane) and actual (Infra) state.
 * This is the 'Truth Detection' layer for Level 5 Autonomous SRE.
 */
class StateVerifier {
  /**
   * Performs a multi-system audit.
   */
  async verify(expectedState, observedState) {
    console.log("🔍 [VERIFIER] Auditing system state against desired intent...");
    
    const skew = parseInt(process.env.CLOCK_SKEW || '0');
    const audit = {
      db: this.checkDB(expectedState.db, observedState.db),
      traffic: this.checkTraffic(expectedState.traffic, observedState.traffic),
      dns: this.checkDNS(expectedState.dns, observedState.dns),
      timestamp: Date.now() + skew
    };


    audit.hasDrift = Object.values(audit).some(s => s && s.status === 'DRIFT');
    audit.classification = this.classifyDrift(audit);

    return audit;
  }

  checkDB(expected, observed) {
    if (!expected) return null;
    return {
      status: observed.primary === expected.primary ? 'OK' : 'DRIFT',
      details: { expected: expected.primary, observed: observed.primary }
    };
  }

  checkTraffic(expected, observed) {
    if (!expected) return null;
    const diff = Math.abs(observed.weight - expected.weight);
    return {
      status: diff < 0.05 ? 'OK' : 'DRIFT',
      details: { expected: expected.weight, observed: observed.weight }
    };
  }

  checkDNS(expected, observed) {
    if (!expected) return null;
    return {
      status: observed.target === expected.target ? 'OK' : 'DRIFT',
      details: { expected: expected.target, observed: observed.target }
    };
  }

  classifyDrift(audit) {
    if (!audit.hasDrift) return 'NONE';
    
    // If DNS is wrong but DB is right -> PARTIAL (we can complete forward)
    if (audit.dns?.status === 'DRIFT' && audit.db?.status === 'OK') return 'PARTIAL';
    
    // If DB is wrong -> CRITICAL (Split brain risk or failed promotion)
    if (audit.db?.status === 'DRIFT') return 'CRITICAL';

    return 'TRANSIENT';
  }
}

module.exports = new StateVerifier();

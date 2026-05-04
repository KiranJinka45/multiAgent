const infra = require('./infra-verifier');
const Reconciler = require('./reconciler');
const monitor = require('./convergence-monitor');

/**
 * Continuous Truth Loop: The bridge between Intent and Reality.
 */
class TruthLoop {
  constructor() {
      this.reconciler = new Reconciler(infra.observers);
      this.lastIntent = null;
      this.converged = false;
  }

  async run(getControlState) {
    // 1. Get Intent from Control Plane
    const control = await getControlState();
    
    if (JSON.stringify(control) !== JSON.stringify(this.lastIntent)) {
        monitor.recordIntentChange(control);
        this.lastIntent = control;
        this.converged = false;
    }


    // 2. Verify Reality
    const check = await infra.verifyState(control);

    if (check.consistent && !this.converged) {
        monitor.recordConvergence(control);
        this.converged = true;
    }

    // 3. Heal if Drift Detected
    if (!check.consistent) {
      console.log('🚨 [TRUTH-LOOP] Drift detected in REAL infra. Triggering Reconciliation Saga...');
      
      const healingAction = {
          type: 'RECONCILE',
          target: 'infra',
          intent: control,
          audit: check
      };
      
      await this.reconciler.reconcile(healingAction.audit, healingAction.intent);


      return { healed: true };
    }

    console.log("✅ [TRUTH-LOOP] Intent and Reality are Synchronized.");
    return { healed: false };
  }
}

module.exports = TruthLoop;

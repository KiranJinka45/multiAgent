// scripts/sre-global/reconciler.js
const stateVerifier = require('./state-verifier');
const ObserverRegistry = require('./observer-registry');
const HaltMonitor = require('./halt-monitor');

/**
 * Reconciliation Engine: Truth Enforcement for Global SRE.
 * Fixes drift without blindly rolling back, preferring forward completion.
 */
class ReconciliationEngine {
  constructor(observers) {
    this.registry = new ObserverRegistry(observers);
    this.haltMonitor = new HaltMonitor(15000); // 15s expected TTAC
    this.strategies = {
        'TRANSIENT': this.retry.bind(this),
        'PARTIAL': this.completeForward.bind(this),
        'CRITICAL': this.rollback.bind(this),
        'IRREVERSIBLE': this.compensateAndStabilize.bind(this)
    };
  }

  async reconcile(audit, context) {
    const classification = audit.classification || (audit.consistent === false ? 'CRITICAL' : 'NONE');
    const strategy = this.strategies[classification];

    // Level 5: Quorum Stabilization & Diversity Analysis
    const observations = audit.details ? audit.details.observations : [];
    const targetState = audit.expectedState;
    
    const { hasQuorum, count, quorum, diversityMet } = this.registry.getQuorumStatus(observations, targetState);
    const confidence = this.registry.getWeightedConsensus(observations, targetState);
    const ttacDuration = Date.now() - (audit.timestamp || Date.now());
    
    console.log(`\n📊 [LEVEL-5 TRUST ANALYSIS]`);
    console.log(`  ➡ Quorum Status: ${hasQuorum ? '✅ MET' : '❌ FAILED'} (${count}/${quorum}) | Diversity: ${diversityMet ? 'OK' : 'FAIL'}`);
    console.log(`  ➡ Weighted Confidence: ${(confidence * 100).toFixed(0)}%`);
    console.log(`  ➡ TTAC Duration: ${ttacDuration}ms`);
    
    if (!hasQuorum || confidence < 0.85) { // Tightened threshold
        const duration = this.haltMonitor.recordHold();
        console.warn(`  🛑 ACTION_HALTED: Insufficient Trust/Diversity. Holding for ${duration}ms...`);
        return { healed: false, reason: 'INSUFFICIENT_TRUST' };
    }

    // Level 5: Quorum Stabilization Window (Wait for jitter to settle)
    const holdDuration = this.haltMonitor.recordHold();
    if (holdDuration < 5000) { // 5s stabilization window
        console.log(`  ⏳ [STABILIZING] Quorum met but waiting for stabilization window (5s)...`);
        return { healed: false, reason: 'STABILIZING' };
    }

    // Success: Reset halt monitor and proceed
    this.haltMonitor.reset();
    console.log(`🔧 [RECONCILER] Quorum STABLE and Diversity verified. Applying ${classification} strategy...`);

    
    if (!strategy || classification === 'NONE') {
        console.log(`✅ [RECONCILER] No action required for classification: ${classification}`);
        return;
    }

    console.log(`🔧 [RECONCILER] Quorum and Trust verified. Applying ${classification} strategy...`);
    const res = await strategy(audit, context);
    
    // Level 5: Simulate fixing the real world (Avoid feedback loops)
    const infra = require('./infra-verifier');
    if (context && context.dns && infra.realWorldState.dns !== context.dns) {
        await infra.updateReality('dns', context.dns);
    }
    if (context && context.db && infra.realWorldState.db.primary !== context.db) {
        await infra.updateReality('db', { primary: context.db, status: 'SYNCHRONIZED' });
    }

    
    return res;
  }


  async retry(audit, context) {
    console.log("  ➡ [RETRY] Attempting transient fix (Wait and re-verify)...");
    await new Promise(r => setTimeout(r, 2000));
    // In real life, this would re-trigger the failed step
  }

  async completeForward(audit, context) {
    console.log("  ➡ [FORWARD] DB is correct. Finishing DNS/Traffic propagation...");
    // Force the remaining steps of the saga to finish
  }

  async rollback(audit, context) {
    console.log("  ⚠️ [ROLLBACK] Reverting to last known-good configuration.");
    // Execute compensation logic in reverse
  }

  async compensateAndStabilize(audit, context) {
    console.log("  🚨 [COMPENSATE] Data divergence detected. Stabilizing system and alerting humans.");
    // Complex forward-sync or fencing
  }
}

module.exports = ReconciliationEngine;

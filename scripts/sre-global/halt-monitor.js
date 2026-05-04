// scripts/sre-global/halt-monitor.js
/**
 * Halt Monitor (Level 5): Distinguishing Skeptical Holds from Stuck States.
 * Tracks the duration of skeptical halts and raises alerts if they exceed
 * the expected Time To Actual Correctness (TTAC).
 */
class HaltMonitor {
  constructor(expectedTTAC = 10000) { // Default 10s for DNS propagation
    this.haltStartTime = null;
    this.expectedTTAC = expectedTTAC;
    this.alertRaised = false;
  }

  recordHold() {
    if (!this.haltStartTime) {
      this.haltStartTime = Date.now();
    }

    const duration = Date.now() - this.haltStartTime;
    if (duration > this.expectedTTAC * 2 && !this.alertRaised) {
      console.error(`\n🚨 [HALT-MONITOR] CRITICAL ALERT: Persistent Skeptical Hold!`);
      console.error(`  ➡ Duration: ${duration}ms (Exceeded expected TTAC ${this.expectedTTAC}ms)`);
      console.error(`  ➡ Possible Causes: Network partition, Observer failure, or Physical reality divergence.`);
      this.alertRaised = true;
    }

    return duration;
  }

  reset() {
    this.haltStartTime = null;
    this.alertRaised = false;
  }
}

module.exports = HaltMonitor;

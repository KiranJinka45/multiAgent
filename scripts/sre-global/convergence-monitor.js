// scripts/sre-global/convergence-monitor.js
/**
 * Convergence Monitor: Tracks TTAC (Time To Actual Correctness).
 * Level 5 systems measure the "slop" of the physical world.
 */
class ConvergenceMonitor {
  constructor() {
    this.events = [];
  }

  recordIntentChange(intent) {
    this.events.push({
      timestamp: Date.now(),
      type: 'INTENT',
      state: intent
    });
  }

  recordConvergence(actual) {
    const lastIntent = this.events.filter(e => e.type === 'INTENT').pop();
    if (!lastIntent) return;

    const ttac = Date.now() - lastIntent.timestamp;
    console.log(`\n📊 [CONVERGENCE] Time To Actual Correctness (TTAC): ${ttac}ms`);
    
    this.events.push({
      timestamp: Date.now(),
      type: 'CONVERGENCE',
      state: actual,
      ttac
    });
  }
}

module.exports = new ConvergenceMonitor();

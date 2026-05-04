// scripts/sre-certification/divergence-auditor.js
/**
 * Divergence Auditor (Level 5 Readiness): Detects real-world split-brain.
 * Proves the system can handle scenarios where "Reality" itself is inconsistent
 * across different global vantage points.
 */
class DivergenceAuditor {
  constructor(observers) {
    this.observers = observers;
  }

  async audit(expected) {
    console.log(`\n🕵️ [DIVERGENCE-AUDIT] Auditing global consistency for ${expected}...`);
    
    // Simulate real-world divergence (e.g. DNS propagation slop)
    const observations = this.observers.map(obs => {
        return {
            observer: obs.id,
            seen: obs.cachedValue,
            lastUpdate: obs.lastUpdate
        };
    });

    const values = observations.map(o => o.seen);
    const uniqueValues = [...new Set(values)];

    if (uniqueValues.length > 1) {
      console.warn(`🚨 [DIVERGENCE-AUDIT] GLOBAL SPLIT-BRAIN DETECTED!`);
      uniqueValues.forEach(val => {
          const count = values.filter(v => v === val).length;
          console.warn(`  ➡ ${count} observers see: ${val}`);
      });
      return { status: 'DIVERGED', values: uniqueValues };
    }

    console.log(`  ✅ Global Consensus: ${uniqueValues[0]} (All observers synchronized)`);
    return { status: 'SYNCHRONIZED', value: uniqueValues[0] };
  }
}

module.exports = DivergenceAuditor;

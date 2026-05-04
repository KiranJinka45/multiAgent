const RealitySimulator = require('./reality-simulator');

class InfraVerifier {
  constructor() {
    this.simulator = new RealitySimulator(3);
    this.realWorldState = {

      dns: 'regionA',
      db: { primary: 'regionA', status: 'SYNCHRONIZED' },
      traffic: { regionA: 'HEALTHY', regionB: 'HEALTHY' }
    };

    // Simulated Global Observers (Cloudflare, Google, OpenDNS)
    this.observers = [
        { id: '1.1.1.1', cacheTTL: 5000, lastUpdate: Date.now(), cachedValue: 'regionA' },
        { id: '8.8.8.8', cacheTTL: 10000, lastUpdate: Date.now(), cachedValue: 'regionA' },
        { id: '9.9.9.9', cacheTTL: 2000, lastUpdate: Date.now(), cachedValue: 'regionA' }
    ];
  }

  async verifyDNS(expected) {
    console.log(`🔍 [INFRA-VERIFY] Global DNS Consensus Audit for ${expected}...`);
    
    const observations = this.observers.map(obs => {
        // Simulate propagation delay and TTL caching
        const elapsed = Date.now() - obs.lastUpdate;
        if (elapsed < obs.cacheTTL) {
            return obs.cachedValue; // Still seeing stale data
        }
        return this.realWorldState.dns; // Finally seeing truth
    });

    const voteCount = observations.reduce((acc, val) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
    }, {});

    const consensus = Object.keys(voteCount).reduce((a, b) => voteCount[a] > voteCount[b] ? a : b);
    const confidence = (voteCount[consensus] / this.observers.length) * 100;

    console.log(`  🌐 Consensus: ${consensus} (${confidence.toFixed(0)}% confidence) | Expected: ${expected}`);
    return consensus === expected;
  }

  async verifyDB(expectedPrimary) {
    console.log(`🔍 [INFRA-VERIFY] DB State Audit (Primary: ${expectedPrimary})...`);
    // Level 5: Check if there's a hidden split-brain in the DB layer itself
    return this.realWorldState.db.primary === expectedPrimary;
  }

  async verifyTraffic(region) {
    return this.realWorldState.traffic[region] === 'HEALTHY';
  }

  async verifyState(controlPlaneIntent) {
    const results = await Promise.all([
      this.verifyDNS(controlPlaneIntent.dns),
      this.verifyDB(controlPlaneIntent.db),
      this.verifyTraffic(controlPlaneIntent.region)
    ]);
    const targetState = controlPlaneIntent.dns;
    const observations = this.observers.map((obs, idx) => ({
        observerId: obs.id,
        state: this.simulator.getObserverState(idx, this.observers.length)
    }));

    const consensusCount = observations.filter(o => o.state === targetState).length;
    const consensus = consensusCount / this.observers.length;

    return {
      consistent: consensus >= 0.7,
      expected: targetState,
      actual: consensus >= 0.7 ? targetState : 'diverged',
      details: {
        consensus,
        confidence: consensus,
        observations 
      }
    };

  }

  async updateReality(key, value) {
    console.log(`🛰️ [INFRA-REALITY] Updating Reality: ${key} -> ${JSON.stringify(value)}`);
    this.realWorldState[key] = value;
    
    if (key === 'dns') {
        this.simulator.updateTarget(value);
    }

    if (key === 'dns') {
        this.observers.forEach(obs => {
            obs.lastUpdate = Date.now();
            // obs.cachedValue remains stale until TTL expires in verifyDNS()
        });
    }
  }
}

module.exports = new InfraVerifier();

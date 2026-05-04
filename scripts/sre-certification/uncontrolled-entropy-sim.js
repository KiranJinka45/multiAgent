// scripts/sre-certification/uncontrolled-entropy-sim.js
/**
 * Uncontrolled Entropy Simulator (Level 5): Emergent Physical Failures.
 * Simulates asymmetric packet loss, ISP-level overrides, and kernel buffer collapse.
 */
class UncontrolledEntropySim {
  static getAnomaly() {
    const dice = Math.random();
    
    if (dice < 0.05) {
      return {
        type: 'ASYMMETRIC_LOSS',
        description: 'Node A -> Node B works, Node B -> Node A fails (50% drop)',
        impact: 'Consensus timeout / Partial replication'
      };
    }
    
    if (dice < 0.10) {
      return {
        type: 'ISP_DNS_OVERRIDE',
        description: 'Local ISP resolver returning legacy IP regardless of TTL',
        impact: 'Permanent divergence in regional vantage points'
      };
    }
    
    if (dice < 0.15) {
      return {
        type: 'KERNEL_BUFFER_COLLAPSE',
        description: 'TCP stack latency spikes to 15s under high pressure',
        impact: 'Spurious leader election'
      };
    }

    return { type: 'NOMINAL', description: 'Stable internet background noise' };
  }
}

module.exports = UncontrolledEntropySim;

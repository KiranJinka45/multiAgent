// scripts/sre-global/observer-registry.js
/**
 * Weighted Observer Registry (Level 5): Trust Decay & Fault Isolation.
 * Not all observers are equal. This registry tracks reliability,
 * applies trust weights, and automatically decays trust for inconsistent nodes.
 */
class ObserverRegistry {
  constructor(observers) {
    this.observers = observers.map(obs => ({
      ...obs,
      weight: 1.0,
      reliabilityScore: 1.0,
      lastSeen: Date.now(),
      inconsistencies: 0
    }));
  }

  recordObservation(observerId, isConsistent) {
    const obs = this.observers.find(o => o.id === observerId);
    if (!obs) return;

    if (!isConsistent) {
      obs.inconsistencies++;
      obs.reliabilityScore *= 0.8; // 20% decay per failure
      obs.weight = Math.max(0.2, obs.reliabilityScore); // Weight Floor (Level 5)
    } else {
      // Level 5: Trust Recovery
      obs.reliabilityScore = Math.min(1.0, obs.reliabilityScore + 0.05); 
      obs.weight = obs.reliabilityScore;
    }

    
    obs.lastSeen = Date.now();
  }

  getWeightedConsensus(observations, targetState) {
    let totalWeight = 0;
    let agreeingWeight = 0;

    this.observers.forEach(obs => {
      const observation = observations.find(o => o.observerId === obs.id);
      if (!observation) return;

      totalWeight += obs.weight;
      if (observation.state === targetState) {
        agreeingWeight += obs.weight;
      }
    });

    return totalWeight > 0 ? agreeingWeight / totalWeight : 0;
  }

  getQuorumStatus(observations, targetState) {
    const agreeingCount = observations.filter(o => o.state === targetState).length;
    const quorum = Math.floor(this.observers.length / 2) + 1;
    
    // Level 5: Diversity Quorum (Correlated Failure Protection)
    const agreeingProviders = new Set(
        observations
            .filter(o => o.state === targetState)
            .map(o => this.observers.find(obs => obs.id === o.observerId).provider)
    );
    const totalProviders = new Set(this.observers.map(o => o.provider)).size;
    const hasDiversity = totalProviders > 1 
        ? agreeingProviders.size > 1 // Must have at least 2 distinct providers
        : true; 

    return {
      hasQuorum: agreeingCount >= quorum && hasDiversity,
      count: agreeingCount,
      quorum,
      diversityMet: hasDiversity
    };

  }

}

module.exports = ObserverRegistry;

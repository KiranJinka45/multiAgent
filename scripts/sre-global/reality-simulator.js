// scripts/sre-certification/reality-simulator.js
/**
 * Reality Simulator (Level 5): Non-Linear Propagation.
 * Simulates real-world DNS/CDN propagation using Sigmoid curves.
 * This provides the "Uncontrolled Uncertainty" needed to test the
 * Quorum Stabilization Window and TTAC logic.
 */
class RealitySimulator {
  constructor(totalObservers) {
    this.targetState = 'regionA';
    this.startTime = Date.now();
    this.propagationWindow = 15000; // 15s total propagation
  }

  updateTarget(newState) {
    this.targetState = newState;
    this.startTime = Date.now();
  }

  getObserverState(observerIndex, totalObservers) {
    const elapsed = Date.now() - this.startTime;
    
    // Each observer has a different "Activation Time" in the window
    const observerDelay = (observerIndex / totalObservers) * this.propagationWindow;
    
    // Sigmoid function for "Probability of Truth"
    const x = (elapsed - observerDelay) / 2000; // 2s transition window
    const pTruth = 1 / (1 + Math.exp(-x));
    
    return Math.random() < pTruth ? this.targetState : 'stale';
  }
}

module.exports = RealitySimulator;

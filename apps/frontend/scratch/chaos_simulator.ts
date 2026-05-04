/**
 * Chaos Telemetry Simulator v1.1
 * Run these in the browser console to stress-test the SRE Control Surface.
 */

window.ChaosSimulator = {
  activeInterval: null,
  
  stop() {
    if (this.activeInterval) {
      clearInterval(this.activeInterval);
      this.activeInterval = null;
      console.log('🛑 Chaos stopped.');
    }
  },

  /**
   * Scenario 1: High-Frequency Load Test
   * Injects updates at specified frequency (Hz)
   */
  stressTest(hz = 100) {
    this.stop();
    console.log(`🚀 Starting Stress Test at ${hz}Hz...`);
    let seq = 9000;
    this.activeInterval = setInterval(() => {
      window.dispatchEvent(new CustomEvent('sre:mock_update', {
        detail: {
          sequenceId: seq++,
          perception: {
            convergenceState: 'STABLE',
            tuningVelocity: 0.001,
            velocityDecay: -0.05,
            wassersteinDistance: 0.02 + Math.random() * 0.01,
            brierScore: 0.04,
            signalIntegrityState: 'NOMINAL',
            diversity: { satisfied: true, providers: 4, required: 3 }
          },
          governance: {
            mode: 'STABLE',
            reason: 'Equilibrium reached',
            reasoningDecomposition: { quorumContribution: 0.95, diversityFactor: 0.8, safetyBuffer: 0.05 }
          }
        }
      }));
    }, 1000 / hz);
  },

  /**
   * Scenario 2: Diversity Collapse
   * Forces system into HEALING due to lack of providers
   */
  simulateDiversityCollapse() {
    this.stop();
    console.log('⚠️ Simulating Diversity Collapse...');
    window.dispatchEvent(new CustomEvent('sre:mock_update', {
      detail: {
        sequenceId: 10001,
        perception: {
          convergenceState: 'OSCILLATING',
          tuningVelocity: 0.15,
          velocityDecay: 0.02,
          wassersteinDistance: 0.03,
          brierScore: 0.05,
          signalIntegrityState: 'NOMINAL',
          diversity: { satisfied: false, providers: 1, required: 3 }
        },
        governance: {
          mode: 'HEALING',
          reason: 'Diversity deficit: Single provider seen',
          reasoningDecomposition: { quorumContribution: 1.0, diversityFactor: 0.3, safetyBuffer: 0.0 }
        }
      }
    }));
  },

  /**
   * Scenario 3: Rapid Drift Injection
   * Moves WD from nominal to critical
   */
  simulateDriftBurst() {
    this.stop();
    console.log('📈 Simulating Rapid Drift Burst...');
    let drift = 0.02;
    let seq = 11000;
    this.activeInterval = setInterval(() => {
      drift += 0.005;
      window.dispatchEvent(new CustomEvent('sre:mock_update', {
        detail: {
          sequenceId: seq++,
          perception: {
            convergenceState: 'STABLE',
            tuningVelocity: 0.02,
            velocityDecay: 0.01,
            wassersteinDistance: drift,
            brierScore: 0.04,
            signalIntegrityState: 'NOMINAL',
            diversity: { satisfied: true, providers: 4, required: 3 }
          },
          governance: {
            mode: drift > 0.05 ? 'HEALING' : 'STABLE',
            reason: drift > 0.05 ? 'CRITICAL_DRIFT' : 'Nominal drift',
            reasoningDecomposition: { quorumContribution: 0.9, diversityFactor: 0.8, safetyBuffer: 0.05 }
          }
        }
      }));
      if (drift > 0.1) this.stop();
    }, 200);
  },

  /**
   * Scenario 4: Signal Poisoning (The "Silent Liar")
   * High confidence, low accuracy
   */
  simulateSignalPoisoning() {
    this.stop();
    console.log('🧪 Simulating Signal Poisoning...');
    window.dispatchEvent(new CustomEvent('sre:mock_update', {
      detail: {
        sequenceId: 12001,
        perception: {
          convergenceState: 'STABLE',
          tuningVelocity: 0.005,
          velocityDecay: -0.01,
          wassersteinDistance: 0.02,
          brierScore: 0.35, // Poor accuracy
          signalIntegrityState: 'DEGRADED',
          anomalyHypothesis: { type: 'NOISE', confidence: 0.98, precision: 0.4, recall: 0.3, f1: 0.35 }
        },
        governance: {
          mode: 'STABLE',
          reason: 'Trust synthesis pending',
          reasoningDecomposition: { quorumContribution: 0.95, diversityFactor: 0.9, safetyBuffer: 0.05 }
        }
      }));
    },
  /**
   * Scenario 5: Reality Soak (Uncontrolled Entropy)
   * Simulates bursty telemetry, variable jitter, and sequence gaps.
   */
  simulateRealitySoak() {
    this.stop();
    console.log('🌌 Starting Reality Soak (Uncontrolled Entropy)...');
    let seq = 15000;
    const tick = () => {
      // Simulate variable jitter (50ms - 800ms)
      const nextDelay = Math.random() * 750 + 50;
      
      // Simulate packet loss (skip 1-3 sequences)
      const skip = Math.random() > 0.95 ? Math.floor(Math.random() * 3) + 1 : 1;
      seq += skip;

      window.dispatchEvent(new CustomEvent('sre:mock_update', {
        detail: {
          sequenceId: seq,
          perception: {
            convergenceState: Math.random() > 0.9 ? 'OSCILLATING' : 'STABLE',
            tuningVelocity: 0.001 + Math.random() * 0.01,
            velocityDecay: -0.01 + (Math.random() - 0.5) * 0.05,
            wassersteinDistance: 0.02 + Math.random() * 0.04, // Frequent drift noise
            brierScore: 0.04 + Math.random() * 0.1, // Jittery accuracy
            signalIntegrityState: Math.random() > 0.98 ? 'DEGRADED' : 'NOMINAL',
            diversity: { satisfied: true, providers: 4, required: 3 }
          },
          governance: {
            mode: 'STABLE',
            reason: 'Equilibrium maintained',
            reasoningDecomposition: { quorumContribution: 0.9, diversityFactor: 0.8, safetyBuffer: 0.1 }
          }
        }
      }));

      this.activeInterval = setTimeout(tick, nextDelay);
    };
    tick();
  },
  /**
   * Scenario 6: Multi-Operator Conflict
   * Simulates two operators tuning the system simultaneously.
   * Verifies Last-Writer-Wins (LWW) and optimistic concurrency.
   */
  simulateMultiOperatorConflict() {
    this.stop();
    console.log('⚔️ Simulating Multi-Operator Conflict...');
    const now = Date.now();
    
    // Operator A (Earlier)
    console.log('👤 Operator A: Setting confidence to 0.85 (t=now-100)');
    window.dispatchEvent(new CustomEvent('sre:mock_tune', {
      detail: { confidenceThreshold: 0.85, operatorTimestamp: now - 100, operatorId: 'OP_A' }
    }));

    // Operator B (Later)
    setTimeout(() => {
      console.log('👤 Operator B: Setting confidence to 0.95 (t=now)');
      window.dispatchEvent(new CustomEvent('sre:mock_tune', {
        detail: { confidenceThreshold: 0.95, operatorTimestamp: now, operatorId: 'OP_B' }
      }));
      console.log('✅ Final state should be 0.95 (Operator B wins)');
    }, 500);
  }
};

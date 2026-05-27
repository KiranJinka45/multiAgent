export interface LongitudinalTrend {
  status: string;
  determinismRate: number;
  avgSemanticDrift: number;
  isolationIntegrityScore: number;
  resourceEfficiency: number;
  governanceEfficiencyIndex: number;
  complexityFactor: number;
  regressionScore: number;
  driftAcceleration: number;
  survivabilityProjection: number;
}

export class LongitudinalAnalyzer {
  /**
   * Performs longitudinal trend analysis over campaign telemetry packets.
   */
  static analyze(packets: any[], baselinePackets?: any[]): LongitudinalTrend {
    if (!packets || packets.length === 0) {
      return {
        status: 'BORING',
        determinismRate: 1.0,
        avgSemanticDrift: 0.0,
        isolationIntegrityScore: 100,
        resourceEfficiency: 1.0,
        governanceEfficiencyIndex: 100.0,
        complexityFactor: 1.0,
        regressionScore: 100,
        driftAcceleration: 0.0,
        survivabilityProjection: 365,
      };
    }

    // Determinism Rate
    const revertibleCount = packets.filter(p => p.recovery?.revertible !== false).length;
    const determinismRate = revertibleCount / packets.length;

    // Average Semantic Drift
    const avgSemanticDrift = packets.reduce((sum, p) => sum + (p.semanticDrift ?? 0.0), 0) / packets.length;

    // Isolation Integrity Score
    const sandboxCount = packets.filter(p => p.attestation?.isolationLevel === 'sandbox').length;
    const isolationIntegrityScore = Math.round((sandboxCount / packets.length) * 100);

    // Resource Efficiency
    let totalCeiling = 0;
    let totalConsumption = 0;
    for (const p of packets) {
      totalCeiling += p.economics?.costCeiling ?? 10000;
      totalConsumption += p.economics?.tokenConsumption ?? 2000;
    }
    const resourceEfficiency = totalCeiling > 0 
      ? Math.max(0, Math.min(1, (totalCeiling - totalConsumption) / totalCeiling)) 
      : 0.8;

    // Complexity Factor
    let totalKeys = 0;
    for (const p of packets) {
      totalKeys += Object.keys(p.provenance ?? p.attestation ?? {}).length;
    }
    const complexityFactor = 1.0 + (totalKeys / packets.length) * 0.1;

    // Drift Acceleration
    let driftAcceleration = 0.0001;
    if (packets.length >= 2) {
      const firstDrift = packets[0].semanticDrift ?? 0;
      const lastDrift = packets[packets.length - 1].semanticDrift ?? 0;
      driftAcceleration = (lastDrift - firstDrift) / Math.max(1, packets.length - 1);
    }

    // Regression Score
    const regressionScore = LongitudinalAnalyzer.calculateRegressionScore(packets);

    // Governance Efficiency
    const governanceEfficiencyIndex = Math.max(0, Math.min(100, 100 - (complexityFactor - 1) * 20));

    // Survivability Projection
    const absDriftAcceleration = Math.max(0.00001, Math.abs(driftAcceleration));
    const survivabilityProjection = Math.max(1, Math.round(0.3 / absDriftAcceleration));

    // Status Envelope
    let status = 'BORING';
    if (avgSemanticDrift > 0.10 || regressionScore < 85) {
      status = 'REGRESSION_RISK';
    } else if (avgSemanticDrift > 0.05 || regressionScore < 95) {
      status = 'ELEVATED_RISK';
    } else if (complexityFactor > 1.5) {
      status = 'INEFFICIENT_GOVERNANCE';
    }

    return {
      status,
      determinismRate,
      avgSemanticDrift,
      isolationIntegrityScore,
      resourceEfficiency,
      governanceEfficiencyIndex,
      complexityFactor,
      regressionScore,
      driftAcceleration,
      survivabilityProjection,
    };
  }

  /**
   * Calculates the regression score and detects predictive risk based on drift trends (Hidden Risk).
   */
  static calculateRegressionScore(packets: any[]): number {
    if (!packets || packets.length === 0) return 100;
    const avgSemanticDrift = packets.reduce((sum, p) => sum + (p.semanticDrift ?? 0.0), 0) / packets.length;
    
    // Check drift acceleration trend (Hidden Risk)
    let accelerationFactor = 0;
    if (packets.length >= 2) {
      const firstDrift = packets[0].semanticDrift ?? 0;
      const lastDrift = packets[packets.length - 1].semanticDrift ?? 0;
      const driftDelta = lastDrift - firstDrift;
      if (driftDelta > 0) {
        // Positive acceleration means increasing drift, apply penalty
        accelerationFactor = driftDelta * 100;
      }
    }
    
    return Math.max(0, Math.min(100, Math.round(100 - (avgSemanticDrift * 150) - accelerationFactor)));
  }

  /**
   * Calculates consecutive epochs within nominal bounds ("Boring Time").
   */
  static calculateBoringEpochs(packets: any[]): number {
    if (!packets || packets.length === 0) return 0;
    let boringCount = 0;
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i];
      const drift = p.semanticDrift ?? 0;
      const isRevertible = p.recovery?.revertible !== false;
      const isSandbox = p.attestation?.isolationLevel === 'sandbox';

      if (drift < 0.10 && isRevertible && isSandbox) {
        boringCount++;
      } else {
        break;
      }
    }
    return boringCount;
  }
}

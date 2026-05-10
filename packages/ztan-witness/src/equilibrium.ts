import { logger } from '../../observability/src';

export interface EquilibriumMetrics {
  readonly quorumEntropy: number;          // 0 to 1 (Higher = more diverse)
  readonly coalitionConcentration: number; // 0 to 1 (Higher = more concentrated)
  readonly institutionalDependencyIndex: number; // Measure of shared dependencies
}

/**
 * 🛡️ EquilibriumEngine
 * Governs the dynamic pluralism of institutional governance.
 * Detects hidden coalitions and monitors governance entropy to prevent centralization.
 */
export class EquilibriumEngine {
  private readonly ENTROPY_THRESHOLD = 0.6; // Minimum entropy for a valid governance act

  /**
   * Calculates the Shannon Entropy of a quorum's power distribution.
   * H = -Σ p_i * log2(p_i)
   */
  public calculateEntropy(powers: number[]): number {
    const total = powers.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;

    let entropy = 0;
    for (const p of powers) {
      const share = p / total;
      if (share > 0) {
        entropy -= share * Math.log2(share);
      }
    }

    // Normalize by max possible entropy (log2 of number of participants)
    const maxEntropy = Math.log2(powers.length);
    return maxEntropy === 0 ? 1 : entropy / maxEntropy;
  }

  /**
   * Detects if a quorum has become operationally homogenized (Coalition Detection).
   */
  public detectCoalition(
    participants: string[], 
    dependencyMatrix: Map<string, string[]>
  ): number {
    // Simplified: measure overlap in shared dependencies (e.g. same data center, same parent org)
    let sharedDependencies = 0;
    const seenDeps = new Set<string>();

    for (const id of participants) {
      const deps = dependencyMatrix.get(id) || [];
      for (const dep of deps) {
        if (seenDeps.has(dep)) {
          sharedDependencies++;
        }
        seenDeps.add(dep);
      }
    }

    return sharedDependencies / (participants.length * 2); // Normalized concentration
  }

  /**
   * Validates if a governance act maintains constitutional equilibrium.
   */
  public validateEquilibrium(metrics: EquilibriumMetrics): boolean {
    if (metrics.quorumEntropy < this.ENTROPY_THRESHOLD) {
      logger.warn({ entropy: metrics.quorumEntropy.toFixed(2) }, '[EquilibriumEngine] REJECTED: Low governance entropy (Homogenization Risk)');
      return false;
    }

    if (metrics.coalitionConcentration > 0.4) {
      logger.warn({ concentration: metrics.coalitionConcentration.toFixed(2) }, '[EquilibriumEngine] REJECTED: Hidden coalition detected (Operational Dependency Risk)');
      return false;
    }

    return true;
  }
}

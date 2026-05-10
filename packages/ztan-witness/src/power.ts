import { InstitutionalTrustState } from './trust';
import { logger } from '../../observability/src';

export interface GovernancePower {
  readonly institutionId: string;
  readonly baseWeight: number;      // Fixed weight based on constitutional maturity
  readonly trustMultiplier: number; // Derived from InstitutionalTrustState
  readonly currentInfluence: number; // Total effective weight (clamped)
  readonly influenceCap: number;    // Maximum percentage of a single quorum
}

/**
 * 🛡️ PowerRegistry
 * Governs institutional governance authority and anti-capture constraints.
 * Ensures that institutional power is explicit, trust-weighted, and constrained.
 */
export class PowerRegistry {
  private powers: Map<string, GovernancePower> = new Map();
  private readonly DEFAULT_INFLUENCE_CAP = 0.33; // No single institution > 33%

  /**
   * Calculates the effective governance power based on trust state.
   */
  public calculateEffectivePower(
    institutionId: string, 
    baseWeight: number, 
    trustState: InstitutionalTrustState
  ): GovernancePower {
    let multiplier = 0;

    switch (trustState) {
      case InstitutionalTrustState.TRUSTED:
        multiplier = 1.0;
        break;
      case InstitutionalTrustState.LIMITED_TRUST:
        multiplier = 0.5;
        break;
      case InstitutionalTrustState.PROBATIONARY:
        multiplier = 0.1;
        break;
      case InstitutionalTrustState.SUSPENDED:
      case InstitutionalTrustState.REVOKED:
        multiplier = 0;
        break;
    }

    const effectiveWeight = baseWeight * multiplier;
    
    const power: GovernancePower = {
      institutionId,
      baseWeight,
      trustMultiplier: multiplier,
      currentInfluence: effectiveWeight,
      influenceCap: this.DEFAULT_INFLUENCE_CAP
    };

    this.powers.set(institutionId, power);
    return power;
  }

  /**
   * Evaluates if a proposed quorum meets diversity requirements.
   */
  public validateQuorumDiversity(participants: string[]): boolean {
    if (participants.length === 0) return false;

    let totalWeight = 0;
    const participantPowers = participants.map(id => this.powers.get(id)).filter(Boolean) as GovernancePower[];

    for (const p of participantPowers) {
      totalWeight += p.currentInfluence;
    }

    for (const p of participantPowers) {
      const share = p.currentInfluence / totalWeight;
      if (share > p.influenceCap) {
        logger.warn({ 
            institutionId: p.institutionId, 
            share: (share * 100).toFixed(2) + "%" 
        }, '[PowerRegistry] REJECTED: Institutional dominance detected (Anti-Capture Rule Violation)');
        return false;
      }
    }

    return true;
  }

  public getPower(institutionId: string): GovernancePower | undefined {
    return this.powers.get(institutionId);
  }
}

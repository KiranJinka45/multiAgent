import { logger } from '../../observability/src';

export enum InstitutionalTrustState {
  TRUSTED = "TRUSTED",               // Full constitutional alignment
  LIMITED_TRUST = "LIMITED_TRUST",   // Some semantic drift or version mismatch
  PROBATIONARY = "PROBATIONARY",     // New or recovering institution
  SUSPENDED = "SUSPENDED",           // Temporary freeze due to evidence/audit
  REVOKED = "REVOKED"                // Permanent disqualification
}

export interface TrustPosture {
  readonly state: InstitutionalTrustState;
  readonly lastAuditDate: string;
  readonly justification: string;
  readonly constraints: string[];
}

/**
 * 🛡️ TrustRegistry
 * Governs the institutional legitimacy of external entities.
 * Separates technical replay correctness from institutional trustworthiness.
 */
export class TrustRegistry {
  private registry: Map<string, TrustPosture> = new Map();

  /**
   * Sets the trust posture for an institution.
   */
  public updatePosture(institutionId: string, posture: TrustPosture): void {
    logger.info({ 
        institutionId, 
        state: posture.state 
    }, '[TrustRegistry] Institutional trust posture updated');
    this.registry.set(institutionId, posture);
  }

  /**
   * Retrieves the current trust posture for an institution.
   */
  public getPosture(institutionId: string): TrustPosture {
    return this.registry.get(institutionId) || {
      state: InstitutionalTrustState.PROBATIONARY,
      lastAuditDate: new Date().toISOString(),
      justification: "Initial institutional contact",
      constraints: ["STRICT_VERIFICATION"]
    };
  }

  /**
   * Evaluates trust degradation based on constitutional drift.
   */
  public evaluateDrift(institutionId: string, driftDetected: boolean): void {
    const current = this.getPosture(institutionId);
    
    if (driftDetected && current.state === InstitutionalTrustState.TRUSTED) {
      logger.warn({ institutionId }, '[TrustRegistry] Constitutional drift detected. Degrading trust to LIMITED_TRUST.');
      this.updatePosture(institutionId, {
        ...current,
        state: InstitutionalTrustState.LIMITED_TRUST,
        justification: "Constitutional version drift detected"
      });
    }
  }
}

import { InteroperabilityLayer, VerificationConfidence, TranslatedProof, ForeignProof } from './interop';
import { InstitutionalConstitution, CompatibilityClass } from './constitution';
import { logger } from '../../observability/src';

/**
 * 🛡️ SovereignVerificationEngine
 * Governs institutional verification while preserving sovereignty.
 * It ensures that verification confidence is explicitly tracked as truth crosses boundaries.
 */
export class SovereignVerificationEngine {
  constructor(private readonly interopLayer: InteroperabilityLayer) {}

  /**
   * Verifies a foreign proof and returns the institutional confidence level.
   */
  public verify(foreignConstitution: InstitutionalConstitution, proof: ForeignProof): TranslatedProof {
    logger.info({ 
      origin: proof.originInstitutionId,
      version: foreignConstitution.version 
    }, '[SovereignVerification] Initiating cross-institution verification');

    const result = this.interopLayer.verifyForeignProof(foreignConstitution, proof);

    // Sovereignty Rule: Native finality is ONLY possible on FULL_VERIFIED
    if (result.confidence !== VerificationConfidence.FULL_VERIFIED) {
        logger.warn({ 
            confidence: result.confidence,
            origin: proof.originInstitutionId 
        }, '[SovereignVerification] Foreign truth verified with DEGRADED confidence.');
    }

    return result;
  }
}

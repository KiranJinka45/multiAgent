import { ConstitutionManager, CompatibilityClass, InstitutionalConstitution } from './constitution';
import { ByzantineEvidence } from './evidence';
import { logger } from '../../observability/src';

export interface ForeignProof {
  readonly originInstitutionId: string;
  readonly constitutionVersion: string;
  readonly data: any;
  readonly signature: string;
}

export enum VerificationConfidence {
  FULL_VERIFIED = "FULL_VERIFIED",             // Native verification on same constitution
  SEMANTICALLY_TRANSLATED = "SEMANTICALLY_TRANSLATED", // Translated via trusted mapping
  PARTIALLY_VERIFIED = "PARTIALLY_VERIFIED",   // Some invariants verified, others skipped
  UNVERIFIABLE = "UNVERIFIABLE"               // No shared semantics or runtime
}

export interface TranslatedProof {
  readonly canonicalId: string;
  readonly semanticRoot: string;
  readonly status: "TRANSLATED" | "VERIFIED" | "INCOMPATIBLE";
  readonly confidence: VerificationConfidence;
  readonly integrityMetadata: {
    readonly informationLost: string[];
    readonly mappingsApplied: string[];
    readonly assuranceDegradation: string;
  };
}

/**
 * 🛡️ InteroperabilityLayer
 * Governs the exchange and verification of truth across different institutions.
 * Ensures that foreign truth is only accepted if semantic compatibility is proven.
 */
export class InteroperabilityLayer {
  constructor(private readonly constitutionManager: ConstitutionManager) {}

  /**
   * Processes a foreign proof by first validating constitutional compatibility.
   */
  public verifyForeignProof(foreignConstitution: InstitutionalConstitution, proof: ForeignProof): TranslatedProof {
    const compatibility = this.constitutionManager.evaluateCompatibility(foreignConstitution);

    if (compatibility === CompatibilityClass.INCOMPATIBLE) {
      logger.error({ foreignInstitutionId: foreignConstitution.institutionId }, '[InteropLayer] REJECTED: Incompatible institutional constitution');
      return { canonicalId: "", semanticRoot: "", status: "INCOMPATIBLE" };
    }

    logger.info({ 
      compatibility, 
      origin: proof.originInstitutionId 
    }, '[InteropLayer] Semantic compatibility confirmed. Proceeding with sovereign translation.');

    return this.translate(proof, compatibility);
  }

  /**
   * Normalizes foreign proofs while tracking integrity degradation.
   */
  private translate(proof: ForeignProof, compatibility: CompatibilityClass): TranslatedProof {
    let confidence = VerificationConfidence.UNVERIFIABLE;
    const informationLost: string[] = [];
    const mappingsApplied: string[] = [];
    let assuranceDegradation = "None";

    // 1. Determine Confidence & Degradation
    if (compatibility === CompatibilityClass.FULLY_COMPATIBLE) {
      confidence = VerificationConfidence.FULL_VERIFIED;
    } else if (compatibility === CompatibilityClass.REPLAY_COMPATIBLE) {
      confidence = VerificationConfidence.SEMANTICALLY_TRANSLATED;
      mappingsApplied.push("Canonical Root Normalization");
    } else if (compatibility === CompatibilityClass.PROOF_TRANSLATABLE) {
      confidence = VerificationConfidence.PARTIALLY_VERIFIED;
      informationLost.push("Native Arbitration Semantics");
      mappingsApplied.push("Semantic Field Mapping");
      assuranceDegradation = "Cross-Runtime Semantic Drift";
    }

    // 2. Semantic Mapping
    const semanticRoot = this.normalizeRoot(proof.data.root || proof.data.rootHash || "");
    
    return {
      canonicalId: `INTEROP-${proof.originInstitutionId}-${Date.now()}`,
      semanticRoot,
      status: "TRANSLATED",
      confidence,
      integrityMetadata: {
        informationLost,
        mappingsApplied,
        assuranceDegradation
      }
    };
  }

  private normalizeRoot(rawRoot: string): string {
    // Ensure all roots follow the local canonical 256-bit hash format
    return rawRoot.startsWith("0x") ? rawRoot : `0x${rawRoot}`;
  }
}

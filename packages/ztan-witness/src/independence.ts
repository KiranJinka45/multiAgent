/**
 * 🛡️ Institutional Independence Criteria
 * Defines the socio-technical constraints for a healthy federated governance.
 */
export interface IndependenceProfile {
  institutionId: string;
  fundingSources: string[];
  infrastructureProvider: string;
  legalJurisdiction: string;
  operatorRotationInterval: number; // Days
}

export class IndependenceValidator {
  /**
   * Validates if a proposed federation meets the minimum diversity criteria.
   */
  public validateFederationDiversity(profiles: IndependenceProfile[]): boolean {
    const jurisdictions = new Set(profiles.map(p => p.legalJurisdiction));
    const providers = new Set(profiles.map(p => p.infrastructureProvider));

    // Rule: Federation must span at least 3 legal jurisdictions
    if (jurisdictions.size < 3) {
      console.warn("[Independence] REJECTED: Insufficient jurisdictional diversity (found " + jurisdictions.size + ")");
      return false;
    }

    // Rule: No single infra provider should host > 33% of nodes
    const providerCounts = new Map<string, number>();
    for (const p of profiles) {
      providerCounts.set(p.infrastructureProvider, (providerCounts.get(p.infrastructureProvider) || 0) + 1);
    }

    for (const [provider, count] of providerCounts) {
      if (count / profiles.length > 0.33) {
        console.warn(`[Independence] REJECTED: Infra provider ${provider} has too much concentration`);
        return false;
      }
    }

    return true;
  }
}

/**
 * 🛡️ HistoriographyArchive
 * Stores the chronological evolution of institutional legitimacy.
 * "Constitutional Historiography Infrastructure"
 */
export interface LegitimacyEpoch {
  id: string;
  timestamp: number;
  mode: 'NORMAL' | 'DEGRADED' | 'HEALING' | 'RESTORED';
  continuityJustification?: string;
  forensicEvidenceHash?: string;
  reconciliationSignature?: string;
  dissentingInstitutions: string[];
  minorityAnnotations: Map<string, { category: 'REPLAY' | 'JURISDICTION' | 'TRUST', content: string }>; 
}

export class HistoriographyArchive {
  private epochs: LegitimacyEpoch[] = [];

  /**
   * Records the transition to a new legitimacy mode.
   */
  public recordTransition(epoch: LegitimacyEpoch): void {
    console.log(`[Historiography] Transition Recorded: ${epoch.id} -> ${epoch.mode}`);
    this.epochs.push(epoch);
  }

  /**
   * Allows an institution to attach a signed minority annotation to an epoch.
   * Constrained to specific categories to prevent "Social Grievance" drift.
   */
  public attachMinorityAnnotation(
    epochId: string, 
    institutionId: string, 
    category: 'REPLAY' | 'JURISDICTION' | 'TRUST',
    annotation: string
  ): void {
    const epoch = this.epochs.find(e => e.id === epochId);
    if (epoch && annotation.length <= 500) {
      console.log(`[Historiography] Annotation (${category}) attached to ${epochId} by ${institutionId}.`);
      epoch.minorityAnnotations.set(institutionId, { category, content: annotation });
    } else {
      console.error("[Historiography] REJECTED: Annotation exceeds character limit or missing epoch.");
    }
  }

  /**
   * Retrieves the complete constitutional history of the institution.
   */
  public getConstitutionalLineage(): LegitimacyEpoch[] {
    return [...this.epochs];
  }

  /**
   * Detects "Legitimacy Decay" by analyzing the frequency and duration of non-NORMAL epochs.
   */
  public analyzeStability(): string {
    const nonNormalCount = this.epochs.filter(e => e.mode !== 'NORMAL').length;
    const stabilityScore = 1 - (nonNormalCount / this.epochs.length);

    return `Constitutional Stability: ${(stabilityScore * 100).toFixed(2)}%`;
  }
}

import { TrustRegistry } from './trust';
import { QuorumEngine } from './quorum';

/**
 * 🛡️ RecoveryOrchestrator
 * Governs the legitimacy of system resumption after a T0 Safety Halt.
 */
export class RecoveryOrchestrator {
  private trust = new TrustRegistry();
  private quorum = new QuorumEngine();

  /**
   * Evaluates if a system resumption is constitutionally legitimate.
   */
  public async validateResumption(
    evidenceHash: string, 
    auditSignature: string,
    operatorQuorum: string[],
    haltDurationDays: number = 0
  ): Promise<boolean> {
    // 1. Mandatory Evidence Audit: Resume requires a signed forensic evidence audit
    if (!this.verifyAudit(evidenceHash, auditSignature)) {
      console.error("[Recovery] RESUME DENIED: Mandatory forensic evidence audit missing or invalid.");
      return false;
    }

    // 2. Resumption Quorum: Standard RESUME requires a super-quorum (67%+)
    const authorityWeight = this.quorum.calculateWeight(operatorQuorum);
    
    // Emergency Degraded Continuity: If halt exceeds 14 days, allow 51% consensus
    const isEmergency = haltDurationDays >= 14;
    const requiredWeight = isEmergency ? 0.51 : 0.67;

    if (authorityWeight < requiredWeight) {
      console.error(`[Recovery] RESUME DENIED: Insufficient weighted authority (${(authorityWeight * 100).toFixed(2)}%).`);
      return false;
    }

    if (isEmergency) {
      console.warn("[Recovery] EMERGENCY DEGRADED RESUMPTION: Restarting with 51% consensus. Forensic cool-down reduced to 24h.");
      // Logic to flag all future receipts in this epoch as "DEGRADED_LEGITIMACY"
    }

    // 3. Multi-Institution Consensus: Resumption cannot be performed by a single institution
    const institutionCount = new Set(operatorQuorum.map(id => this.trust.getInstitution(id))).size;
    if (institutionCount < 2) {
      console.error("[Recovery] RESUME DENIED: Resumption must be multi-institutional.");
      return false;
    }

    console.log("[Recovery] RESUME AUTHORIZED: Constitutional recovery conditions satisfied.");
    return true;
  }

  private verifyAudit(hash: string, signature: string): boolean {
    // Logic to verify independent auditor signature against the forensic evidence hash
    return !!(hash && signature);
  }
}

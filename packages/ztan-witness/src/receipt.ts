import { VerificationConfidence, TranslatedProof } from './interop';
import { InstitutionalConstitution } from './constitution';

export interface SovereignVerificationReceipt {
  readonly receiptId: string;
  readonly timestamp: string;
  
  // Sovereignty Context
  readonly sourceConstitution: InstitutionalConstitution;
  readonly targetConstitution: InstitutionalConstitution;
  
  // Verification Evidence
  readonly translatedProof: TranslatedProof;
  readonly verificationConfidence: VerificationConfidence;
  
  // Replay Outcome
  readonly replayStatus: "SUCCESS" | "FAILURE" | "INCONCLUSIVE";
  readonly resultHash: string;
  
  // Witness Accountability
  readonly verifyingWitnessId: string;
  readonly signature: string;
  
  // Traceability
  readonly lineage: {
    readonly foreignEpochId: number;
    readonly foreignRootHash: string;
  };
}

/**
 * 🛡️ ReceiptVault
 * Stores and manages sovereign verification receipts.
 * Ensures that all cross-institutional verification is immutable and auditable.
 */
export class ReceiptVault {
  private receipts: Map<string, SovereignVerificationReceipt> = new Map();

  public store(receipt: SovereignVerificationReceipt): void {
    this.receipts.set(receipt.receiptId, receipt);
  }

  public get(receiptId: string): SovereignVerificationReceipt | undefined {
    return this.receipts.get(receiptId);
  }

  public list(): SovereignVerificationReceipt[] {
    return Array.from(this.receipts.values());
  }
}

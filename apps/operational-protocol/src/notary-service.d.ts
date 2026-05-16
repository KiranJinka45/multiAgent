export interface NotarizationAnchor {
    sequenceId: number;
    blockHash: string;
    rootHash: string;
    timestamp: string;
    immutable: boolean;
    retentionUntil: string;
    auditGrade: boolean;
    s3Key?: string;
}
/**
 * ELITE TIER (TRUE): WORM Audit Anchoring
 * Transitioned from memory-only simulation to PRODUCTION S3 Object Lock (COMPLIANCE).
 */
export declare class NotaryService {
    private s3Client;
    private bucketName;
    private localLedger;
    private lastRootHash;
    constructor();
    /**
     * ELITE: Notarize a head hash into the immutable S3 ledger with Object Lock.
     */
    notarize(headHash: string): Promise<NotarizationAnchor>;
    /**
     * ELITE: Verify a block against the immutable ledger.
     */
    verify(blockHash: string, sequenceId: number): Promise<boolean>;
}
export declare const notaryService: NotaryService;
//# sourceMappingURL=notary-service.d.ts.map
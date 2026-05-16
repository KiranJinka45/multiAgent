import { ZKProof } from './stability-circuit';
export interface AuditEntry {
    sequenceId: number;
    elite?: {
        multiAgent?: {
            consensus: {
                action: string;
            };
        };
    };
    governance: {
        isCertified: boolean;
        mode: string;
        attestations: any[];
    };
    _audit: {
        hash: string;
        prevHash: string;
        ts: number;
        ztan_consensus: boolean;
        aggregatedSignature?: string;
        zkProof?: ZKProof;
        notarized?: boolean;
        notarySeq?: number;
    };
    _verification_data?: {
        acc: number;
        ldet: number;
        lsla: number;
    };
}
export declare class AuditVerifier {
    /**
     * Verifies a single audit entry for Elite Tier compliance.
     */
    static verifyEntry(entry: AuditEntry, groupPublicKey: string): Promise<boolean>;
}
//# sourceMappingURL=audit-verify.d.ts.map
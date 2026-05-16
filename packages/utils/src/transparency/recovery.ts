import { governanceSignablePayload } from './governance.js';
import type { GovernanceReceipt, GovernanceSignature, CouncilMember, WitnessMember } from './governance.js';
import type { ISigner } from './signer.js';
import { MerkleTree } from './merkle.js';


/**
 * 🛡️ EmergencyRecoveryCoordinator
 * Manages the witness-led recovery process. If a governance council is lost
 * or malicious, 2/3 of the Witness Federation can sign a COUNCIL_RESET receipt.
 */
export class EmergencyRecoveryCoordinator {
    
    /**
     * Signs a recovery proposal as a witness.
     */
    static async signRecoveryProposal(
        params: {
            newCouncil: { members: CouncilMember[]; threshold: number };
            epochId: number;
            sequenceNumber: number;
            previousGRoot: string;
            effectiveTimestamp: string;
            reason: string;
        },
        signer: ISigner
    ): Promise<GovernanceSignature> {
        const receipt: Omit<GovernanceReceipt, 'signatures' | 'gRoot'> = {
            action: 'COUNCIL_RESET',
            newCouncil: params.newCouncil,
            epochId: params.epochId,
            sequenceNumber: params.sequenceNumber,
            previousGRoot: params.previousGRoot,
            effectiveTimestamp: params.effectiveTimestamp,
            reason: params.reason
        };

        const payload = governanceSignablePayload(receipt as any);
        const signature = await signer.sign(Buffer.from(payload, 'utf8'));

        return {
            signerKeyId: signer.getKeyId(),
            signature
        };
    }

    /**
     * Aggregates recovery signatures into a final COUNCIL_RESET receipt.
     */
    static assembleRecoveryReceipt(
        params: {
            newCouncil: { members: CouncilMember[]; threshold: number };
            epochId: number;
            sequenceNumber: number;
            previousGRoot: string;
            effectiveTimestamp: string;
            reason: string;
        },
        witnessSignatures: GovernanceSignature[]
    ): GovernanceReceipt {
        const receipt: Omit<GovernanceReceipt, 'signatures' | 'gRoot'> = {
            action: 'COUNCIL_RESET',
            newCouncil: params.newCouncil,
            epochId: params.epochId,
            sequenceNumber: params.sequenceNumber,
            previousGRoot: params.previousGRoot,
            effectiveTimestamp: params.effectiveTimestamp,
            reason: params.reason,
            recoverySignatures: witnessSignatures // Attached for witness-led bypass
        };

        const payload = governanceSignablePayload(receipt as any);
        const leafHash = MerkleTree.hashLeaf(payload);
        const gTree = new MerkleTree();
        // Note: In practice, we'd need to load the full tree or use previousRoot + leaf
        // But for receipt assembly, we calculate the post-append root.
        // This logic is typically handled by the Coordinator during commit.
        
        return {
            ...receipt,
            gRoot: 'PENDING_COMMIT', // Will be filled by Coordinator
            signatures: [] // Council signatures are BYPASSED for RESET
        } as any;
    }
}

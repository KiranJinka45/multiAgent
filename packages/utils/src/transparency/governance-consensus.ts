import { GovernanceReceipt, GovernanceAction, CouncilMember, verifyGovernanceReceiptMultiSig } from './governance.js';
import { ISigner } from './signer.js';


/**
 * 🛡️ GovernanceProposal
 * Represents a proposed governance action currently gathering signatures.
 */
export interface GovernanceProposal {
    id: string;
    action: GovernanceAction;
    params: any;
    status: 'DRAFT' | 'VOTING' | 'COMMITTED' | 'REJECTED';
    signatures: { signerKeyId: string; signature: string }[];
    sequenceNumber: number;
    epochId: number;
    previousGRoot: string;
}

/**
 * 🛡️ GovernanceConsensus
 * Manages the lifecycle of governance proposals and ensures distributed
 * agreement before a receipt is committed to the transparency log.
 */
export class GovernanceConsensus {
    private pendingProposals: Map<string, GovernanceProposal> = new Map();

    constructor(
        private council: { members: CouncilMember[]; threshold: number }
    ) {}

    /**
     * Initiates a new proposal.
     */
    propose(proposal: Omit<GovernanceProposal, 'status' | 'signatures'>): GovernanceProposal {
        const newProposal: GovernanceProposal = {
            ...proposal,
            status: 'VOTING',
            signatures: []
        };
        this.pendingProposals.set(newProposal.id, newProposal);
        return newProposal;
    }

    /**
     * Adds a signature to a proposal.
     */
    castVote(proposalId: string, signerId: string, signature: string): string | null {
        const proposal = this.pendingProposals.get(proposalId);
        if (!proposal) return 'Proposal not found';
        if (proposal.status !== 'VOTING') return `Proposal is already ${proposal.status}`;

        // Verify signer is in council
        const isCouncilMember = this.council.members.some(m => m.id === signerId);
        if (!isCouncilMember) return 'Signer is not a council member';

        // Prevent duplicate votes
        if (proposal.signatures.some(s => s.signerKeyId === signerId)) {
            return 'Already voted';
        }

        proposal.signatures.push({ signerKeyId: signerId, signature });
        return null;
    }

    /**
     * Checks if a proposal has reached its threshold and can be committed.
     */
    isReady(proposalId: string): boolean {
        const proposal = this.pendingProposals.get(proposalId);
        if (!proposal) return false;
        return proposal.signatures.length >= this.council.threshold;
    }

    /**
     * Finalizes a proposal into a GovernanceReceipt.
     */
    commit(proposalId: string, gRoot: string): GovernanceReceipt | string {
        const proposal = this.pendingProposals.get(proposalId);
        if (!proposal) return 'Proposal not found';
        if (!this.isReady(proposalId)) return 'Insufficient signatures';

        const receipt: GovernanceReceipt = {
            action: proposal.action,
            ...proposal.params,
            sequenceNumber: proposal.sequenceNumber,
            epochId: proposal.epochId,
            previousGRoot: proposal.previousGRoot,
            gRoot: gRoot,
            effectiveTimestamp: proposal.params.effectiveTimestamp || new Date().toISOString(),
            reason: proposal.params.reason || 'Consensus reached',
            signatures: proposal.signatures
        };

        proposal.status = 'COMMITTED';
        return receipt;
    }

    getProposal(proposalId: string): GovernanceProposal | undefined {
        return this.pendingProposals.get(proposalId);
    }
}

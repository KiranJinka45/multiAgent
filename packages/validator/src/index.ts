export { ArtifactValidator } from '@packages/utils';

export const GovernanceEngine = {
    evaluateProposal: async (proposalId: string) => ({ approved: true, reason: null as string | null }),
    logViolation: async (proposalId: string, reason: string) => {},
};


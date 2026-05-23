import { FederatedGovernanceEngine } from '@packages/governance-core';

/**
 * Bridge between ztanctl and the Federated Governance Engine.
 */
export function getFederatedGovernance(): FederatedGovernanceEngine {
    return new FederatedGovernanceEngine();
}

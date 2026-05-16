import { GovernanceEngine } from '@packages/governance-core';

/**
 * Bridge between ztanctl and the Institutional Deployment Governance Engine.
 */
export function getDeploymentGovernance(): GovernanceEngine {
    return new GovernanceEngine();
}

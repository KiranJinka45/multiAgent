import type { CommandExecutionProposal } from '../filters/command-filter.js';

export interface OPAEvaluationResult {
    isAllowed: boolean;
    reason?: string;
    matchedPolicies: string[];
}

export class OPAGovernanceLayer {
    private static isServerAvailable = true; // Default to true to trigger active HTTP verification

    /**
     * Set the mock availability of the OPA server.
     */
    static setAvailability(available: boolean) {
        this.isServerAvailable = available;
    }

    /**
     * Evaluates the execution proposal against the OPA server.
     * CRITICAL INVARIANT: OPA unavailable -> execution denied (Fail-Closed).
     */
    static async evaluateProposal(proposal: CommandExecutionProposal): Promise<OPAEvaluationResult> {
        if (!this.isServerAvailable) {
            return {
                isAllowed: false,
                reason: 'FAIL_CLOSED: OPA Governance Server is unreachable or unavailable.',
                matchedPolicies: []
            };
        }

        // Live OPA HTTP boundary evaluation against the policy engine microservice
        try {
            const token = process.env.INTERNAL_SERVICE_TOKEN;
            if (!token) {
                return {
                    isAllowed: false,
                    reason: 'FAIL_CLOSED: INTERNAL_SERVICE_TOKEN is not configured. Refusing to evaluate with default credentials.',
                    matchedPolicies: []
                };
            }

            // OPA sidecar standard REST API endpoint
            const opaAddress = process.env.OPA_ADDRESS || 'http://localhost:8181';
            const response = await fetch(`${opaAddress}/v1/data/ztan/authz`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    input: {
                        tenantId: proposal.tenantId,
                        action: proposal.toolName,
                        operator: 'steward_omega',
                        payload: proposal.payload || '',
                        quota: {
                            currentCount: 0,
                            limit: 1000
                        }
                    }
                })
            });

            if (!response.ok) {
                return {
                    isAllowed: false,
                    reason: `FAIL_CLOSED: OPA Governance Server returned HTTP status ${response.status}`,
                    matchedPolicies: []
                };
            }

            const data = (await response.json()) as any;
            // OPA standard response: { result: { allow: true/false, reasons: [...] } }
            if (data?.result?.allow === true) {
                return {
                    isAllowed: true,
                    reason: 'Proposal meets OPA policy requirements.',
                    matchedPolicies: ['ztan.authz.allow']
                };
            } else {
                return {
                    isAllowed: false,
                    reason: `FAIL_CLOSED: OPA policy denied. Reasons: ${JSON.stringify(data?.result?.reasons || 'Unknown')}`,
                    matchedPolicies: []
                };
            }
        } catch (err: any) {
            return {
                isAllowed: false,
                reason: `FAIL_CLOSED: OPA Governance Server is unreachable or unavailable. Error: ${err.message}`,
                matchedPolicies: []
            };
        }
    }
}

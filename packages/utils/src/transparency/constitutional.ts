import { InstitutionalRole } from './governance.js';
import type { GovernanceReceipt, CouncilState, GovernanceAction } from './governance.js';


/**
 * ─── Constitutional Guardrails ──────────────────────────────────────────────
 * Formalizes the legality rules for institutional authority transitions.
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface ConstitutionalPolicy {
    recoveryChallengeWindowMs: number;
    minRecoveryIntervalMs: number;
    maxRecoveryEpochSkip: number;
    requireAuditorRatification: boolean;
    recoveryInactivityThreshold: number; // N evidence hashes missing
    degradedRecoveryTimeoutMs: number; // Time after which witnesses can override auditor deadlock
    degradedWitnessThreshold: number; // Threshold for degraded override (e.g., 4/5)
    immutableInvariants: string[]; // List of fields that require 100% ratification to change
}

export const DEFAULT_CONSTITUTION: ConstitutionalPolicy = {
    recoveryChallengeWindowMs: 24 * 60 * 60 * 1000, // 24 hours
    minRecoveryIntervalMs: 7 * 24 * 60 * 1000, // 7 days (Rate limit recovery)
    maxRecoveryEpochSkip: 1, // Prevent jumping multiple epochs at once
    requireAuditorRatification: true,
    recoveryInactivityThreshold: 10,
    degradedRecoveryTimeoutMs: 72 * 60 * 60 * 1000,
    degradedWitnessThreshold: 4,
    immutableInvariants: ['recoveryChallengeWindowMs', 'requireAuditorRatification'],
};

/**
 * ─── Constitutional Ceiling ─────────────────────────────────────────────────
 * Defines the absolute limits that cannot be crossed by any governance action,
 * preventing the "boiling frog" erosion of institutional safeguards.
 * ────────────────────────────────────────────────────────────────────────────
 */
export const CONSTITUTIONAL_CEILING = {
    minChallengeWindowMs: 6 * 60 * 60 * 1000, // 6 hours (absolute minimum)
    minRecoveryIntervalMs: 24 * 60 * 60 * 1000, // 24 hours (absolute minimum rate limit)
    maxInactivityThreshold: 50, // Prevent requiring impossible amounts of evidence
    minAuditorThreshold: 1, // Must always have at least one auditor for ratification
    requireAuditorRatification: true,
    degradedRecoveryTimeoutMs: 72 * 60 * 60 * 1000, // 72 hours (3x challenge window)
    degradedWitnessThreshold: 4, // Explicit threshold for 5-member federation
};

export class InstitutionalConstitution {
    private lastRecoveryAt: number = 0;
    private currentEpoch: number = 0;

    constructor(public policy: ConstitutionalPolicy = DEFAULT_CONSTITUTION) {}

    public isCoreClause(field: string): boolean {
        return this.policy.immutableInvariants.includes(field);
    }

    /**
     * Validates if a proposed COUNCIL_RESET is constitutionally legal.
     */
    public validateRecoveryLegality(receipt: GovernanceReceipt, currentEpoch: number): string | null {
        const now = new Date(receipt.effectiveTimestamp).getTime();

        // Rule 1: Rate Limiting
        if (now - this.lastRecoveryAt < this.policy.minRecoveryIntervalMs) {
            return `CONSTITUTIONAL_VIOLATION: Recovery too frequent. Min interval: ${this.policy.minRecoveryIntervalMs}ms`;
        }

        // Rule 2: Epoch Lineage
        if (receipt.sequenceNumber > currentEpoch + this.policy.maxRecoveryEpochSkip) {
            return `CONSTITUTIONAL_VIOLATION: Epoch skip too large. Max skip: ${this.policy.maxRecoveryEpochSkip}`;
        }

        return null;
    }

    public recordRecovery(timestamp: string, newEpoch: number): void {
        this.lastRecoveryAt = new Date(timestamp).getTime();
        this.currentEpoch = newEpoch;
    }

    public getChallengeExpiry(timestamp: string): string {
        return new Date(new Date(timestamp).getTime() + this.policy.recoveryChallengeWindowMs).toISOString();
    }

    /**
     * Ensures that a policy update does not violate the constitutional ceiling.
     */
    public validatePolicyUpdate(newPolicy: ConstitutionalPolicy): string | null {
        if (newPolicy.recoveryChallengeWindowMs < CONSTITUTIONAL_CEILING.minChallengeWindowMs) {
            return `CEILING_VIOLATION: challengeWindow cannot be less than ${CONSTITUTIONAL_CEILING.minChallengeWindowMs}ms`;
        }
        if (newPolicy.minRecoveryIntervalMs < CONSTITUTIONAL_CEILING.minRecoveryIntervalMs) {
            return `CEILING_VIOLATION: recoveryInterval cannot be less than ${CONSTITUTIONAL_CEILING.minRecoveryIntervalMs}ms`;
        }
        return null;
    }
}

/**
 * ─── Sovereignty Hierarchy ──────────────────────────────────────────────────
 * Enforces authority domains for each institutional role.
 * ────────────────────────────────────────────────────────────────────────────
 */
export class SovereigntyHierarchy {
    /**
     * Checks if a role has the authority to perform a specific action.
     */
    public static hasAuthority(role: InstitutionalRole, action: GovernanceAction): boolean {
        switch (role) {
            case InstitutionalRole.COUNCIL:
                return [
                    'WITNESS_ADD',
                    'WITNESS_REMOVE',
                    'THRESHOLD_UPDATE',
                    'WITNESS_QUARANTINE',
                    'COUNCIL_UPDATE',
                    'GOVERNANCE_PROPOSAL',
                    'COUNCIL_HEARTBEAT',
                    'STATE_CHECKPOINT',
                    'CONSTITUTIONAL_MIGRATE',
                    'PROTOCOL_UPGRADE',
                    'GOVERNANCE_SNAPSHOT',
                    'GUARDIAN_REGISTER',
                    'INSTITUTIONAL_HANDOVER'
                ].includes(action);

            case InstitutionalRole.WITNESS_FEDERATION:
                return [
                    'COUNCIL_RESET',
                    'AUDITOR_SLASH'
                ].includes(action);

            case InstitutionalRole.AUDITOR:
                return false;

            default:
                return false;
        }
    }

    /**
     * Verifies that a constitutional transition (RESET) is justified.
     */
    public static validateRecoveryJustification(
        receipt: GovernanceReceipt,
        policy: ConstitutionalPolicy
    ): string | null {
        if (receipt.action !== 'COUNCIL_RESET') return null;

        if (!receipt.inactivityProof) {
            return 'SOVEREIGNTY_VIOLATION: Recovery requires inactivityProof.';
        }

        if (receipt.inactivityProof.lastEvidenceHashes.length < policy.recoveryInactivityThreshold) {
            return `SOVEREIGNTY_VIOLATION: Insufficient evidence of failure. Need ${policy.recoveryInactivityThreshold} hashes.`;
        }

        return null;
    }
}

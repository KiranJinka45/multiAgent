import { InstitutionalPilotRegistry, PilotMetadata } from '@packages/production-pilot';
import { OperatorValidator } from '../archaeology/operator-validator.js';

export interface PilotValidationResult {
    allowed: boolean;
    reason?: string;
}

export interface ObservableOverrideException {
    exceptionId: string;
    operator: string;
    targetInvariant: string;
    expiresAtIso: string;
    reason: string;
    signatureBase64: string;
}

export class PilotGate {
    private static ALLOWED_STEWARDS = new Set([
        'steward_omega',
        'steward_alpha',
        'steward_beta'
    ]);

    private static activeExceptions: ObservableOverrideException[] = [];

    /**
     * Enforces Layer 7 pilot execution limitations.
     */
    public static validateExecution(
        pilotId: string,
        currentConcurrency: number,
        currentDrift: number
    ): PilotValidationResult {
        const registryResult = InstitutionalPilotRegistry.validateExecutionAllowed(
            pilotId,
            currentConcurrency,
            currentDrift
        );

        if (!registryResult.allowed) {
            return {
                allowed: false,
                reason: registryResult.reason
            };
        }

        return { allowed: true };
    }

    /**
     * Authenticates a manual override request from a pilot operator.
     * Enforces that the operator is a registered steward and the signature format is NIST P-256 Base64.
     */
    public static validateStewardOverride(operator: string, signatureBase64: string): PilotValidationResult {
        if (!this.ALLOWED_STEWARDS.has(operator)) {
            return {
                allowed: false,
                reason: `OPERATOR_NOT_WHITELISTED: Operator "${operator}" is not an authorized ZTAN steward.`
            };
        }

        const isValidSignature = OperatorValidator.verifyP256SignatureLayout(signatureBase64);
        if (!isValidSignature) {
            return {
                allowed: false,
                reason: 'CRYPTOGRAPHIC_SIGNATURE_INVALID: Override signature is malformed or not NIST P-256 Base64.'
            };
        }

        return { allowed: true };
    }

    /**
     * Registers a cryptographically signed, observable emergency exception.
     */
    public static registerObservableException(exception: ObservableOverrideException): PilotValidationResult {
        const auth = this.validateStewardOverride(exception.operator, exception.signatureBase64);
        if (!auth.allowed) {
            return auth;
        }

        const now = Date.now();
        const expiresTime = new Date(exception.expiresAtIso).getTime();
        if (expiresTime <= now) {
            return { allowed: false, reason: 'EXPIRED_TIMESTAMP: Exception override timestamp has already expired.' };
        }

        this.activeExceptions.push(exception);
        console.log(`[ObservableException] Emergency override registered: ${exception.exceptionId} for Invariant "${exception.targetInvariant}" (Reason: "${exception.reason}")`);
        return { allowed: true };
    }

    /**
     * Checks if a valid, unexpired override is active for the target invariant.
     */
    public static checkObservableException(targetInvariant: string): boolean {
        const now = Date.now();
        // Prune expired on read
        this.activeExceptions = this.activeExceptions.filter(ex => new Date(ex.expiresAtIso).getTime() > now);

        return this.activeExceptions.some(ex => ex.targetInvariant === targetInvariant);
    }

    /**
     * Clears all active overrides.
     */
    public static clearActiveExceptions(): void {
        this.activeExceptions = [];
    }
}

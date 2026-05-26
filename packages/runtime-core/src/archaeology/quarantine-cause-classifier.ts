/**
 * ─── ZTAN Quarantine Cause Classifier ────────────────────────────────────────
 * Translates raw node quarantine errors and execution exceptions into structured,
 * high-fidelity classification verdicts to preserve incident recovery lineage.
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface QuarantineVerdict {
    timestamp: string;
    verdict: string;
    confidence: number;
    primaryTrigger: string;
}

export function classifyQuarantineCause(errors: string[]): QuarantineVerdict {
    const errorString = errors.join(' | ').toUpperCase();
    
    let verdict = 'UNKNOWN_SAFETY_INVARIANT_VIOLATION';
    let confidence = 0.5;
    let primaryTrigger = 'SYSTEM_EXCEPTION';

    if (errorString.includes('FENCING_ERROR') || errorString.includes('EPOCH')) {
        verdict = 'EPOCH_LEASE_FENCING_BREACH';
        confidence = 0.95;
        primaryTrigger = 'DB_EPOCH_FENCE_TRIGGER';
    } else if (errorString.includes('OPA_') || errorString.includes('POLICY') || errorString.includes('REGO')) {
        verdict = 'POLICY_OPA_GATE_DENIAL';
        confidence = 0.95;
        primaryTrigger = 'FAIL_CLOSED_REGO_GATE';
    } else if (errorString.includes('CHECKSUM') || errorString.includes('LEDGER') || errorString.includes('INTEGRITY') || errorString.includes('LINEAGE')) {
        verdict = 'STORAGE_LEDGER_LINEAGE_CORRUPTION';
        confidence = 0.90;
        primaryTrigger = 'MERKLE_CHAIN_INTEGRITY_SCAN';
    } else if (errorString.includes('ENV_AUDIT_ERROR') || errorString.includes('SHADOW') || errorString.includes('UNLEDGERED')) {
        verdict = 'STARTUP_ATTESTATION_ENV_DRIFT';
        confidence = 0.95;
        primaryTrigger = 'ALLOWLIST_COMPLIANCE_AUDITOR';
    }

    return {
        timestamp: new Date().toISOString(),
        verdict,
        confidence,
        primaryTrigger
    };
}

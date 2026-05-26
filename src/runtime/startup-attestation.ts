import fs from 'fs';
import path from 'path';
import { verifyConfigChecksums } from './config-checksum';
import { auditEnvironmentVariables, loadAndVerifyComplianceLedger } from './ledger-verifier';

/**
 * ─── Startup Attestation Engine ─────────────────────────────────────────────
 * The primary mechanical boot validation gateway. Integrates environment audits,
 * config checksumming, and exception ledger expiration verifications.
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface ExceptionRecord {
    bypassId: string;
    targetInvariant: string;
    createdAt: string; // ISO String
    expiresAt: string; // ISO String
    operatorSignature: string;
    reason: string;
}

export function performStartupAttestation(workspaceRoot: string): { 
    success: boolean; 
    status: 'ACTIVE' | 'QUARANTINED'; 
    errors: string[]; 
    telemetry: any; 
} {
    const errors: string[] = [];
    const telemetry: any = {};

    // 1. Audit Environment Variables
    const envAudit = auditEnvironmentVariables();
    telemetry.envAudit = envAudit.activeVars;
    if (!envAudit.success) {
        errors.push(...envAudit.errors);
    }

    // 2. Verify Config Checksums against Cryptographically Signed Compliance Ledger
    try {
        const approvedLedger = loadAndVerifyComplianceLedger(workspaceRoot);
        const configAudit = verifyConfigChecksums(workspaceRoot, approvedLedger.approvedConfigHashes);
        telemetry.configAudit = configAudit.computedHashes;
        if (!configAudit.success) {
            errors.push(...configAudit.errors);
        }
    } catch (ledgerError: any) {
        errors.push(`[COMPLIANCE_ERROR] Attestation failed. Signed compliance ledger verification failed: ${ledgerError.message}`);
    }

    // 3. Audit Active Emergency Exception Bypasses
    const exceptionLedgerPath = path.resolve(workspaceRoot, 'db/exceptions_ledger.json');
    if (fs.existsSync(exceptionLedgerPath)) {
        try {
            const rawContent = fs.readFileSync(exceptionLedgerPath, 'utf-8');
            const exceptions: ExceptionRecord[] = JSON.parse(rawContent);
            const now = new Date();

            for (const exception of exceptions) {
                const createdDate = new Date(exception.createdAt);
                const expiryDate = new Date(exception.expiresAt);

                // Enforce maximum 72-hour bypass duration constraint
                const durationMs = expiryDate.getTime() - createdDate.getTime();
                const maxDurationMs = 72 * 60 * 60 * 1000; // 72 hours

                if (durationMs > maxDurationMs) {
                    errors.push(`[EXCEPTION_ERROR] Exception "${exception.bypassId}" exceeds maximum 72-hour duration ceiling.`);
                }

                // Enforce active expiration
                if (now.getTime() > expiryDate.getTime()) {
                    errors.push(`[EXCEPTION_ERROR] Active exception "${exception.bypassId}" has expired (Expired At: ${exception.expiresAt}). Node quarantine required.`);
                }
            }
            telemetry.activeExceptionsCount = exceptions.length;
        } catch (e: any) {
            errors.push(`[EXCEPTION_ERROR] Failed to parse exception ledger: ${e.message}`);
        }
    } else {
        telemetry.activeExceptionsCount = 0;
    }

    const success = errors.length === 0;
    return {
        success,
        status: success ? 'ACTIVE' : 'QUARANTINED',
        errors,
        telemetry
    };
}

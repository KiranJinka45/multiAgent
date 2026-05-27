import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * ─── Config Checksum Verification ───────────────────────────────────────────
 * Computes cryptographic SHA-256 hashes of frozen system configuration files
 * and compares them against approved values to detect unledgered drift.
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface ChecksumTarget {
    name: string;
    filePath: string;
    expectedHash?: string; // Optional if loading dynamically
}

// Immutable, core platform config files to verify on boot
const TARGETS: ChecksumTarget[] = [
    { name: 'Root Package JSON', filePath: 'package.json' },
    { name: 'Prisma Schema', filePath: 'packages/db/prisma/schema.prisma' },
    { name: 'Invariant Governance Charter', filePath: 'INVARIANT_GOVERNANCE_CHARTER.md' },
    { name: 'Unified Strategic Charter', filePath: 'UNIFIED_STRATEGIC_CHARTER.md' },
    { name: 'PNPM Workspace', filePath: 'pnpm-workspace.yaml' }
];

export function computeFileHash(absolutePath: string): string {
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`[CHECKSUM_ERROR] Target config file does not exist: ${absolutePath}`);
    }
    const fileBuffer = fs.readFileSync(absolutePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
}

export function verifyConfigChecksums(workspaceRoot: string, approvedHashes: Record<string, string>): { success: boolean; errors: string[]; computedHashes: Record<string, string> } {
    const errors: string[] = [];
    const computedHashes: Record<string, string> = {};

    for (const target of TARGETS) {
        const fullPath = path.resolve(workspaceRoot, target.filePath);
        try {
            const computed = computeFileHash(fullPath);
            computedHashes[target.filePath] = computed;

            const expected = approvedHashes[target.filePath];
            if (!expected) {
                errors.push(`[CHECKSUM_ERROR] No approved hash ledger record for config file: ${target.filePath}`);
                continue;
            }

            if (computed !== expected) {
                errors.push(`[CHECKSUM_ERROR] Cryptographic mismatch on ${target.name}. Expected: ${expected}, Computed: ${computed}`);
            }
        } catch (e: any) {
            errors.push(`[CHECKSUM_ERROR] Failed to checksum ${target.name}: ${e.message}`);
        }
    }

    return {
        success: errors.length === 0,
        errors,
        computedHashes
    };
}

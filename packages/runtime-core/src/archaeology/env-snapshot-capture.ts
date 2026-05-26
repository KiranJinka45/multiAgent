import crypto from 'crypto';

/**
 * ─── ZTAN Forensic Environment Snapshot Capture ──────────────────────────────
 * Hashes and records the active process environment map on validation failures,
 * preserving immutable cryptographic proof of unauthorized overrides.
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface EnvSnapshot {
    timestamp: string;
    allKeysHashed: Record<string, string>;
    unledgeredCount: number;
}

export function captureEnvironmentSnapshot(coreZtanVars: Set<string>): EnvSnapshot {
    const allKeysHashed: Record<string, string> = {};
    let unledgeredCount = 0;

    const keys = Object.keys(process.env);
    for (const key of keys) {
        const val = process.env[key] || '';
        // Cryptographically hash environment values to preserve sensitive credentials
        allKeysHashed[key] = crypto.createHash('sha256').update(val).digest('hex');
        
        if (!coreZtanVars.has(key)) {
            unledgeredCount++;
        }
    }

    return {
        timestamp: new Date().toISOString(),
        allKeysHashed,
        unledgeredCount
    };
}

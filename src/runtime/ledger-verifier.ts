import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * ─── Ledger Verifier & Environment Audit ────────────────────────────────────
 * Audits runtime process.env using semantic categorization and verifies the
 * config hash ledger against a cryptographically signed compliance manifest.
 * ────────────────────────────────────────────────────────────────────────────
 */

// Category 1: Strictly Enforced ZTAN / Production Control Variables
const CORE_ZTAN_VARS = new Set([
    'NODE_ENV',
    'DATABASE_URL',
    'PORT',
    'REDIS_URL',
    'ETCD_ENDPOINTS',
    'JWT_SECRET',
    'LOG_LEVEL'
]);

// Category 2: Permitted OS / Shell Informational Variables (No errors generated)
const PERMITTED_OS_VARS = new Set([
    'PATH',
    'PATHEXT',
    'OS',
    'HOSTNAME',
    'HOME',
    'PWD',
    'USER',
    'LANG',
    'USERNAME',
    'USERPROFILE',
    'SYSTEMROOT',
    'SYSTEMDRIVE',
    'WINDIR',
    'TEMP',
    'TMP',
    'ONEDRIVE',
    'ONEDRIVECONSUMER',
    'PROGRAMFILES',
    'PROGRAMDATA',
    'PROGRAMFILES(X86)',
    'PROGRAMW6432',
    'PSMODULEPATH',
    'SESSIONNAME',
    'PROMPT',
    'PUBLIC',
    'NUMBER_OF_PROCESSORS',
    'PROCESSOR_ARCHITECTURE',
    'PROCESSOR_IDENTIFIER',
    'PROCESSOR_LEVEL',
    'PROCESSOR_REVISION',
    'USERDOMAIN',
    'USERDOMAIN_ROAMINGPROFILE',
    'APPDATA',
    'LOCALAPPDATA',
    'COMPUTERNAME',
    'COMSPEC',
    'HOMEDRIVE',
    'HOMEPATH',
    'LOGONSERVER',
    'ALLUSERSPROFILE'
]);

// Category 3: Permitted CI / Tooling Variables (Safe during tests and builds)
const PERMITTED_TOOLING_VARS = new Set([
    'CI',
    'GITHUB_ACTIONS',
    'GITHUB_RUN_ID',
    'GITHUB_WORKFLOW',
    'GITHUB_SHA',
    'GITHUB_REF',
    'TERM',
    'COLORTERM',
    'VSCODE_CWD',
    'VSCODE_PID',
    'VSCODE_IPC_HOOK',
    'VSCODE_NLS_CONFIG',
    'VSCODE_CODE_CACHE_PATH',
    'NPM_PREFIX_JS',
    'NPM_PREFIX_NPX_CLI_JS',
    'NPX_CLI_JS',
    'FORCE_COLOR'
]);

// The pinned SHA-256 fingerprint of the canonical ZTAN Administrator Public Key
const CANONICAL_AUTHORITY_KEY_FINGERPRINT = 'd4c22808406fc0d83c536c2b6ccb8c3d6831aa65ad1e247ea061180f52f7bedf';

export interface LedgerManifest {
    approvedConfigHashes: Record<string, string>;
    approvedEnvValues: Record<string, string>;
}

export interface SignedLedgerEnvelope {
    ledger: LedgerManifest;
    signature: string; // Base64 signature
    signerKey: string; // PEM Public Key
}

/**
 * Loads and cryptographically verifies the approved compliance ledger manifest.
 * Ensures the approved hashes have not been mutated locally and the signing key matches the authority.
 */
export function loadAndVerifyComplianceLedger(workspaceRoot: string): LedgerManifest {
    const ledgerPath = path.resolve(workspaceRoot, 'approved_compliance_ledger.json');
    if (!fs.existsSync(ledgerPath)) {
        throw new Error(`[COMPLIANCE_ERROR] Signed compliance ledger is missing: ${ledgerPath}`);
    }

    const rawContent = fs.readFileSync(ledgerPath, 'utf-8');
    const envelope: SignedLedgerEnvelope = JSON.parse(rawContent);

    // Verify key fingerprint to prevent spoofing
    const computedFingerprint = crypto.createHash('sha256').update(envelope.signerKey).digest('hex');
    if (computedFingerprint !== CANONICAL_AUTHORITY_KEY_FINGERPRINT) {
        throw new Error(`[COMPLIANCE_ERROR] Untrusted signing authority key fingerprint: ${computedFingerprint}`);
    }

    // Cryptographically verify the signature of the "ledger" payload block
    const verifier = crypto.createVerify('sha256');
    verifier.update(JSON.stringify(envelope.ledger));
    const isValid = verifier.verify(envelope.signerKey, envelope.signature, 'base64');

    if (!isValid) {
        throw new Error('[COMPLIANCE_ERROR] Signed compliance ledger verification failed. Signature is invalid.');
    }

    return envelope.ledger;
}

export function auditEnvironmentVariables(): { 
    success: boolean; 
    errors: string[]; 
    activeVars: Record<string, string>; 
    informationalVars: string[]; 
} {
    const errors: string[] = [];
    const activeVars: Record<string, string> = {};
    const informationalVars: string[] = [];

    const activeKeys = Object.keys(process.env);

    for (const key of activeKeys) {
        const uppercaseKey = key.toUpperCase();

        // 1. Skip npm/pnpm runtime helper variables
        if (uppercaseKey.startsWith('NPM_') || uppercaseKey.startsWith('PNPM_')) {
            informationalVars.push(key);
            continue;
        }

        // 2. Map OS informational variables (no error generated)
        if (PERMITTED_OS_VARS.has(uppercaseKey)) {
            informationalVars.push(key);
            continue;
        }

        // 3. Map CI/tooling variables (no error generated)
        if (PERMITTED_TOOLING_VARS.has(uppercaseKey)) {
            informationalVars.push(key);
            continue;
        }

        // 4. Enforce strict allowlist matching for core ZTAN variables
        if (!CORE_ZTAN_VARS.has(key)) {
            errors.push(`[ENV_AUDIT_ERROR] Unledgered environment variable detected: "${key}". Shadow overrides are strictly blocked.`);
            continue;
        }

        // 5. Hash and store allowed production variables
        const value = process.env[key];
        if (value !== undefined) {
            activeVars[key] = crypto.createHash('sha256').update(value).digest('hex');
        }
    }

    return {
        success: errors.length === 0,
        errors,
        activeVars,
        informationalVars
    };
}

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * ─── Compliance Ledger Signature Generator ──────────────────────────────────
 * Generates an administrative authority key pair, hashes core configuration
 * files, and signs the compliance ledger to establish ZTAN's trust root.
 * ────────────────────────────────────────────────────────────────────────────
 */

function generateSignedLedger() {
    const workspaceRoot = path.resolve(__dirname, '../');
    const ztanDir = path.join(workspaceRoot, '.ztan');
    if (!fs.existsSync(ztanDir)) {
        fs.mkdirSync(ztanDir, { recursive: true });
    }

    const privateKeyPath = path.join(ztanDir, 'authority_private_key.pem');
    const publicKeyPath = path.join(ztanDir, 'authority_public_key.pem');

    let privateKeyPem: string;
    let publicKeyPem: string;

    if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
        console.log('[Compliance Ledger] Reusing existing authority key pair.');
        privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
        publicKeyPem = fs.readFileSync(publicKeyPath, 'utf8');
    } else {
        console.log('[Compliance Ledger] Generating new 2048-bit RSA authority key pair...');
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        privateKeyPem = privateKey;
        publicKeyPem = publicKey;
        fs.writeFileSync(privateKeyPath, privateKeyPem, 'utf8');
        fs.writeFileSync(publicKeyPath, publicKeyPem, 'utf8');
        console.log(`[Compliance Ledger] Saved private key to: ${privateKeyPath}`);
        console.log(`[Compliance Ledger] Saved public key to: ${publicKeyPath}`);
    }

    // Compute public key fingerprint
    const publicKeyFingerprint = crypto.createHash('sha256').update(publicKeyPem).digest('hex');
    console.log(`[Compliance Ledger] Authority Public Key Fingerprint: ${publicKeyFingerprint}`);

    // Files to include in the compliance ledger hash verification
    const coreFiles = [
        'package.json',
        'packages/db/prisma/schema.prisma',
        'INVARIANT_GOVERNANCE_CHARTER.md',
        'UNIFIED_STRATEGIC_CHARTER.md',
        'pnpm-workspace.yaml'
    ];

    const approvedConfigHashes: Record<string, string> = {};

    for (const relativePath of coreFiles) {
        const filePath = path.resolve(workspaceRoot, relativePath);
        if (!fs.existsSync(filePath)) {
            console.warn(`[Warning] Core file not found: ${filePath}`);
            continue;
        }
        const content = fs.readFileSync(filePath);
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        approvedConfigHashes[relativePath] = hash;
        console.log(`[Compliance Ledger] Hashed: ${relativePath} -> ${hash}`);
    }

    // Standard allowed environment variables with their static hashed values if expected
    const approvedEnvValues: Record<string, string> = {
        'NODE_ENV': crypto.createHash('sha256').update('development').digest('hex')
    };

    const ledger = {
        approvedConfigHashes,
        approvedEnvValues
    };

    // Sign the ledger payload using the private key
    const sign = crypto.createSign('sha256');
    sign.update(JSON.stringify(ledger));
    const signature = sign.sign(privateKeyPem, 'base64');

    const envelope = {
        ledger,
        signature,
        signerKey: publicKeyPem
    };

    const ledgerJsonPath = path.resolve(workspaceRoot, 'approved_compliance_ledger.json');
    fs.writeFileSync(ledgerJsonPath, JSON.stringify(envelope, null, 2), 'utf8');
    console.log(`[Compliance Ledger] Successfully wrote signed compliance ledger: ${ledgerJsonPath}`);
    console.log('[Compliance Ledger] Execution completed.');
}

try {
    generateSignedLedger();
} catch (e: any) {
    console.error('Fatal Compliance Ledger Generation Error:', e.message || e);
    process.exit(1);
}

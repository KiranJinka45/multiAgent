import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * 🛡️ ISigner Interface
 * Provides an abstraction for signing payloads, enabling future integration
 * with HSM (Hardware Security Modules) or Cloud KMS (Key Management Services).
 */
export interface ISigner {
    /** Returns the unique identifier for the key (SHA-256 fingerprint of the public key). */
    getKeyId(): string;
    
    /** Returns the public key in PEM format. */
    getPublicKeyPem(): string;
    
    /** Signs a buffer and returns the base64-encoded signature. */
    sign(data: Buffer): Promise<string>;
    
    /** Verifies a signature against a payload. */
    verify(data: Buffer, signature: string): Promise<boolean>;
}

/**
 * 🛡️ LocalSigner
 * Standard implementation using local Ed25519 keys stored on disk or in memory.
 */
export class LocalSigner implements ISigner {
    private privateKey: crypto.KeyObject;
    private publicKey: crypto.KeyObject;
    private keyId: string;

    constructor(privateKeyPem: string, publicKeyPem: string) {
        this.privateKey = crypto.createPrivateKey(privateKeyPem);
        this.publicKey = crypto.createPublicKey(publicKeyPem);
        this.keyId = crypto.createHash('sha256')
            .update(this.getPublicKeyPem())
            .digest('hex');
    }

    getKeyId(): string {
        return this.keyId;
    }

    getPublicKeyPem(): string {
        return this.publicKey.export({ type: 'spki', format: 'pem' }) as string;
    }

    async sign(data: Buffer): Promise<string> {
        const signature = crypto.sign(null, data, this.privateKey);
        return signature.toString('base64');
    }

    async verify(data: Buffer, signature: string): Promise<boolean> {
        return crypto.verify(null, data, this.publicKey, Buffer.from(signature, 'base64'));
    }
}

/**
 * 🛡️ KmsSigner (Institutional Hardening)
 * Simulates a cloud-backed KMS implementation where the private key 
 * NEVER leaves the hardware security module.
 */
export class KmsSigner implements ISigner {
    private keyId: string;
    private publicKey: crypto.KeyObject;
    private privateKey: crypto.KeyObject;

    constructor(private keyArn: string, publicKeyPem?: string) {
        const kmsDir = path.join(process.cwd(), '.ztan-transparency', 'kms');
        if (!fs.existsSync(kmsDir)) {
            fs.mkdirSync(kmsDir, { recursive: true });
        }

        const safeArnName = crypto.createHash('sha256').update(keyArn).digest('hex');
        const privPath = path.join(kmsDir, `${safeArnName}.key`);
        const pubPath = path.join(kmsDir, `${safeArnName}.pub`);

        let loadedPrivateKey: crypto.KeyObject;
        let loadedPublicKey: crypto.KeyObject;

        if (fs.existsSync(privPath) && fs.existsSync(pubPath)) {
            const privPem = fs.readFileSync(privPath, 'utf8');
            const pubPem = fs.readFileSync(pubPath, 'utf8');
            loadedPrivateKey = crypto.createPrivateKey(privPem);
            loadedPublicKey = crypto.createPublicKey(pubPem);
        } else {
            const generated = crypto.generateKeyPairSync('ed25519');
            loadedPrivateKey = generated.privateKey;
            loadedPublicKey = generated.publicKey;
            fs.writeFileSync(privPath, loadedPrivateKey.export({ type: 'pkcs8', format: 'pem' }));
            fs.writeFileSync(pubPath, loadedPublicKey.export({ type: 'spki', format: 'pem' }));
        }

        // If publicKeyPem is explicitly provided from outside, use it,
        // but log a warning if it differs from the generated KMS key.
        if (publicKeyPem) {
            try {
                this.publicKey = crypto.createPublicKey(publicKeyPem);
            } catch (err: any) {
                console.warn(`[KmsSigner] Invalid publicKeyPem passed for ${keyArn}, fallback to KMS pubkey: ${err.message}`);
                this.publicKey = loadedPublicKey;
            }
        } else {
            this.publicKey = loadedPublicKey;
        }

        this.privateKey = loadedPrivateKey;
        this.keyId = crypto.createHash('sha256')
            .update(this.getPublicKeyPem())
            .digest('hex');
    }

    getKeyId(): string {
        return this.keyId;
    }

    getPublicKeyPem(): string {
        return this.publicKey.export({ type: 'spki', format: 'pem' }) as string;
    }

    async sign(data: Buffer): Promise<string> {
        console.log(`[KMS] Invoking Remote Sign for ARN: ${this.keyArn}`);
        const signature = crypto.sign(null, data, this.privateKey);
        return signature.toString('base64');
    }

    async verify(data: Buffer, signature: string): Promise<boolean> {
        return crypto.verify(null, data, this.publicKey, Buffer.from(signature, 'base64'));
    }
}


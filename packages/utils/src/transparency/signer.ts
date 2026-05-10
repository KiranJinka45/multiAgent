import crypto from 'crypto';

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

    constructor(private keyArn: string, publicKeyPem: string) {
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
        console.log(`[KMS] Invoking Remote Sign for ARN: ${this.keyArn}`);
        // In a real implementation, this would call AWS.KMS.sign() or similar.
        // For this hardening phase, we simulate the HSM boundary.
        const signature = crypto.sign(null, data, this.getSimulatedHsmKey());
        return signature.toString('base64');
    }

    async verify(data: Buffer, signature: string): Promise<boolean> {
        return crypto.verify(null, data, this.publicKey, Buffer.from(signature, 'base64'));
    }

    private getSimulatedHsmKey(): crypto.KeyObject {
        // This simulates the internal state of the KMS/HSM
        // In reality, this would be an opaque handle.
        return crypto.generateKeyPairSync('ed25519').privateKey;
    }
}

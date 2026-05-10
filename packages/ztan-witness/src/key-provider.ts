import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Interface for witness key custody.
 * Allows switching between local files and future HSM/TPM providers.
 */
export interface KeyProvider {
    sign(data: Buffer): Buffer;
    getPublicKeyPem(): string;
    getPublicKey(): crypto.KeyObject;
    getKeyId(): string;
}

/**
 * Local file-based key provider (Current Implementation).
 */
export class LocalFileKeyProvider implements KeyProvider {
    private privateKey: crypto.KeyObject;
    private publicKey: crypto.KeyObject;
    private keyId: string;

    constructor(privKeyPath: string, pubKeyPath: string) {
        if (!fs.existsSync(privKeyPath) || !fs.existsSync(pubKeyPath)) {
            // Generate if missing (Maintain current behavior but encapsulated)
            const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
            fs.writeFileSync(privKeyPath, privateKey.export({ type: 'pkcs8', format: 'pem' }));
            fs.writeFileSync(pubKeyPath, publicKey.export({ type: 'spki', format: 'pem' }));
            this.privateKey = privateKey;
            this.publicKey = publicKey;
        } else {
            this.privateKey = crypto.createPrivateKey(fs.readFileSync(privKeyPath, 'utf8'));
            this.publicKey = crypto.createPublicKey(fs.readFileSync(pubKeyPath, 'utf8'));
        }

        this.keyId = crypto.createHash('sha256')
            .update(this.getPublicKeyPem())
            .digest('hex');
    }

    sign(data: Buffer): Buffer {
        return crypto.sign(null, data, this.privateKey);
    }

    getPublicKeyPem(): string {
        return this.publicKey.export({ type: 'spki', format: 'pem' }) as string;
    }

    getPublicKey(): crypto.KeyObject {
        return this.publicKey;
    }

    getKeyId(): string {
        return this.keyId;
    }
}

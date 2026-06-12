import * as crypto from 'crypto';

export interface KeyPair {
    publicKey: string;
    privateKey: string;
}

export class CryptoUtils {
    /**
     * Generates a new Ed25519 key pair in PEM format.
     */
    public static generateKeyPair(): KeyPair {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });
        
        return {
            publicKey: publicKey as string,
            privateKey: privateKey as string
        };
    }

    /**
     * Signs a JSON payload object using the provided PEM private key.
     * Returns the signature as a base64 string.
     */
    public static signPayload(payload: any, privateKeyPem: string): string {
        const payloadString = JSON.stringify(payload);
        const signature = crypto.sign(null, Buffer.from(payloadString), privateKeyPem);
        return signature.toString('base64');
    }

    /**
     * Verifies a base64 signature against a JSON payload object and PEM public key.
     */
    public static verifySignature(payload: any, signatureBase64: string, publicKeyPem: string): boolean {
        try {
            const payloadString = JSON.stringify(payload);
            const signature = Buffer.from(signatureBase64, 'base64');
            return crypto.verify(null, Buffer.from(payloadString), publicKeyPem, signature);
        } catch (_error) {
            // If the key is malformed or signature is invalid format, it fails verification.
            return false;
        }
    }
}

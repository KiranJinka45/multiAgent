import crypto from 'crypto';

/**
 * ─── Cryptographic Registry ────────────────────────────────────────────────
 * Supports algorithmic agility by mapping algorithm identifiers to their
 * respective verification engines. This is the foundation for Post-Quantum
 * readiness.
 * ────────────────────────────────────────────────────────────────────────────
 */

export enum SignatureAlgorithm {
    ED25519 = 'ed25519',
    RSA_4096 = 'rsa-4096',
    ECDSA_P256 = 'ecdsa-p256',
    DILITHIUM2 = 'dilithium2', // Placeholder for PQC readiness
}

export interface SignaturePayload {
    algorithm: SignatureAlgorithm;
    publicKey: string;
    signature: string;
    data: Buffer;
}

export class CryptoRegistry {
    public static verify(payload: SignaturePayload): boolean {
        const { algorithm, publicKey, signature, data } = payload;
        const sigBuffer = Buffer.from(signature, 'base64');

        switch (algorithm) {
            case SignatureAlgorithm.ED25519:
                return this.verifyEd25519(publicKey, sigBuffer, data);
            case SignatureAlgorithm.RSA_4096:
                return this.verifyRSA(publicKey, sigBuffer, data);
            case SignatureAlgorithm.ECDSA_P256:
                return this.verifyECDSA(publicKey, sigBuffer, data);
            default:
                throw new Error(`UNSUPPORTED_ALGORITHM: ${algorithm} is not supported by this institutional runtime.`);
        }
    }

    private static verifyEd25519(publicKey: string, signature: Buffer, data: Buffer): boolean {
        try {
            const pubKey = crypto.createPublicKey(publicKey);
            return crypto.verify(null, data, pubKey, signature);
        } catch (e) {
            return false;
        }
    }

    private static verifyRSA(publicKey: string, signature: Buffer, data: Buffer): boolean {
        try {
            const pubKey = crypto.createPublicKey(publicKey);
            return crypto.verify('sha256', data, pubKey, signature);
        } catch (e) {
            return false;
        }
    }

    private static verifyECDSA(publicKey: string, signature: Buffer, data: Buffer): boolean {
        try {
            const pubKey = crypto.createPublicKey(publicKey);
            return crypto.verify('sha256', data, pubKey, signature);
        } catch (e) {
            return false;
        }
    }
}

/**
 * ─── Signature Agility Engine ───────────────────────────────────────────────
 * Wraps governance verification to support heterogeneous signature sets.
 * ────────────────────────────────────────────────────────────────────────────
 */
export class SignatureAgilityEngine {
    public static verifyMultiSig(
        data: string,
        signatures: { signerKeyId: string; signature: string; algorithm?: SignatureAlgorithm }[],
        members: { id: string; publicKey: string }[]
    ): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        const validSigners = new Set<string>();
        const payloadBuffer = Buffer.from(data, 'utf8');

        for (const sig of signatures) {
            const member = members.find(m => m.id === sig.signerKeyId);
            if (!member) {
                errors.push(`Unknown signer: ${sig.signerKeyId}`);
                continue;
            }

            try {
                const isValid = CryptoRegistry.verify({
                    algorithm: sig.algorithm || SignatureAlgorithm.ED25519,
                    publicKey: member.publicKey,
                    signature: sig.signature,
                    data: payloadBuffer
                });

                if (isValid) {
                    validSigners.add(sig.signerKeyId);
                } else {
                    errors.push(`Invalid signature from ${sig.signerKeyId}`);
                }
            } catch (e: any) {
                errors.push(`Verification error for ${sig.signerKeyId}: ${e.message}`);
            }
        }

        return {
            valid: validSigners.size > 0, // Individual callers check threshold
            errors
        };
    }
}

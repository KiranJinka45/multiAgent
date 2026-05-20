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
            // Strict pre-flight DER/ASN.1 and Low-S verification
            this.validateAndParseDEREcdsa(signature);
            
            const pubKey = crypto.createPublicKey(publicKey);
            return crypto.verify('sha256', data, pubKey, signature);
        } catch (e) {
            return false;
        }
    }

    public static validateAndParseDEREcdsa(sig: Buffer): { r: bigint; s: bigint } {
        if (sig.length < 8) {
            throw new Error("[DER] Signature too short to be a valid DER sequence");
        }
        if (sig[0] !== 0x30) {
            throw new Error("[DER] Invalid sequence tag (must be 0x30)");
        }
        const totalLen = sig[1];
        if (sig.length !== totalLen + 2) {
            throw new Error("[DER] Trailing bytes or mismatched total length in DER payload");
        }

        let idx = 2;

        // Parse R
        if (sig[idx] !== 0x02) {
            throw new Error("[DER] Invalid tag for R (must be 0x02)");
        }
        const lenR = sig[idx + 1];
        if (lenR <= 0 || idx + 2 + lenR > sig.length) {
            throw new Error("[DER] Malformed length for R integer");
        }
        const rBytes = sig.subarray(idx + 2, idx + 2 + lenR);
        
        // DER integer padding rules
        if (rBytes[0] === 0x00 && rBytes.length > 1 && (rBytes[1] & 0x80) === 0) {
            throw new Error("[DER] Overlong integer padding in R");
        }
        if ((rBytes[0] & 0x80) !== 0) {
            throw new Error("[DER] Negative integers not allowed in DER signature R");
        }
        idx += 2 + lenR;

        // Parse S
        if (idx >= sig.length || sig[idx] !== 0x02) {
            throw new Error("[DER] Invalid tag for S (must be 0x02)");
        }
        const lenS = sig[idx + 1];
        if (lenS <= 0 || idx + 2 + lenS !== sig.length) {
            throw new Error("[DER] Malformed length or trailing bytes after S integer");
        }
        const sBytes = sig.subarray(idx + 2, idx + 2 + lenS);
        
        // DER integer padding rules
        if (sBytes[0] === 0x00 && sBytes.length > 1 && (sBytes[1] & 0x80) === 0) {
            throw new Error("[DER] Overlong integer padding in S");
        }
        if ((sBytes[0] & 0x80) !== 0) {
            throw new Error("[DER] Negative integers not allowed in DER signature S");
        }

        // Convert to BigInts
        const r = BigInt("0x" + rBytes.toString("hex"));
        const s = BigInt("0x" + sBytes.toString("hex"));

        // Strict Low-S check for secp256r1/P-256
        const P256_N = BigInt("0xffffffff00000000ffffffffffffffffbce6fa148f9dc941655f8cef3f39803f");
        const P256_HALF_N = P256_N / 2n;

        if (s > P256_HALF_N) {
            throw new Error("[DER] High-S signature rejected to prevent signature malleability");
        }

        return { r, s };
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

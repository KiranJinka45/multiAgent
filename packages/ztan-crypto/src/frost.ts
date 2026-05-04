import * as bls from '@noble/bls12-381';
import { VSS } from './vss';

/**
 * ZTAN-FROST: Flexible Round-Optimized Threshold Signatures
 * Implements Pedersen DKG and multi-round signing.
 */
export class Frost {
    /**
     * Round 1: Participant generates a local polynomial and publishes commitments.
     * @param t Threshold
     * @param n Total participants
     * @returns Coefficients (private) and Commitments (public)
     */
    static generateRound1(t: number, n: number): {
        coeffs: bigint[];
        commitments: string[];
    } {
        const coeffs = [];
        for (let i = 0; i < t; i++) {
            const secret = bls.utils.randomPrivateKey();
            coeffs.push(BigInt('0x' + Buffer.from(secret).toString('hex')));
        }
        
        return {
            coeffs,
            commitments: VSS.createCommitments(coeffs)
        };
    }

    /**
     * Generate a secret share for a specific target node index.
     * This share is sent over a secure channel to the target node.
     */
    static computeShareForNode(coeffs: bigint[], targetIndex: number): string {
        return VSS.evaluatePolynomial(coeffs, targetIndex).toString(16);
    }

    /**
     * Round 2: Aggregate all verified shares into a long-term secret share.
     * sk_i = sum(s_j,i) mod r
     */
    static aggregateShares(shares: string[]): string {
        const CURVE_ORDER = bls.CURVE.r;
        let sk = 0n;
        for (const s of shares) {
            sk = (sk + BigInt('0x' + s)) % CURVE_ORDER;
        }
        return sk.toString(16);
    }

    /**
     * Compute the Master Public Key from all participants' Round 1 commitments.
     * PK = sum(C_j,0)
     */
    static computeMasterPublicKey(allCommitments: string[][]): string {
        let pk = bls.PointG1.ZERO;
        for (const commitments of allCommitments) {
            pk = pk.add(bls.PointG1.fromHex(commitments[0]));
        }
        return pk.toHex(true);
    }

    /**
     * Compute a node's long-term verification key (PK_i = sk_i * G1)
     */
    static computeVerificationKey(skHex: string): string {
        const sk = BigInt('0x' + skHex);
        return bls.PointG1.BASE.multiply(sk).toHex(true);
    }

    /**
     * Compute a node's verification key from all Round 1 commitments.
     * Anyone can do this once Round 1 is complete.
     */
    static computeVerificationKeyFromCommitments(allCommitments: string[][], targetIndex: number): string {
        let vk = bls.PointG1.ZERO;
        for (const commitments of allCommitments) {
            // Evaluate this participant's commitment polynomial at targetIndex
            // sum(C_k * i^k)
            let participantContribution = bls.PointG1.ZERO;
            for (let k = 0; k < commitments.length; k++) {
                const Ck = bls.PointG1.fromHex(commitments[k]);
                const power = BigInt(targetIndex) ** BigInt(k);
                participantContribution = participantContribution.add(Ck.multiply(power));
            }
            vk = vk.add(participantContribution);
        }
        return vk.toHex(true);
    }

    /**
     * Verify a secret share against a verification key.
     */
    static verifyShare(shareHex: string, vkHex: string): boolean {
        const share = BigInt('0x' + shareHex);
        const expectedVk = bls.PointG1.BASE.multiply(share);
        return expectedVk.toHex(true) === vkHex;
    }

    /**
     * SIGNING Round 1: Generate ephemeral nonces and commitments.
     */
    static generateSigningNonces(): { d: string, e: string, D: string, E: string } {
        const d = bls.utils.randomPrivateKey();
        const e = bls.utils.randomPrivateKey();
        // ZTAN uses G2 for signatures, so nonces are on G2
        const D = bls.PointG2.BASE.multiply(BigInt('0x' + Buffer.from(d).toString('hex'))).toHex(true);
        const E = bls.PointG2.BASE.multiply(BigInt('0x' + Buffer.from(e).toString('hex'))).toHex(true);
        
        return {
            d: Buffer.from(d).toString('hex'),
            e: Buffer.from(e).toString('hex'),
            D, E
        };
    }

    /**
     * Compute Lagrange coefficient for a participant in a subset S.
     * L_i,S = product(j / (j - i)) mod r
     */
    static computeLagrangeCoefficient(i: number, S: number[]): bigint {
        const CURVE_ORDER = bls.CURVE.r;
        let numerator = 1n;
        let denominator = 1n;

        for (const j of S) {
            if (j === i) continue;
            numerator = (numerator * BigInt(j)) % CURVE_ORDER;
            let diff = (BigInt(j) - BigInt(i)) % CURVE_ORDER;
            if (diff < 0n) diff += CURVE_ORDER;
            denominator = (denominator * diff) % CURVE_ORDER;
        }

        // Modular inverse of denominator
        const invDenom = this.modInverse(denominator, CURVE_ORDER);
        return (numerator * invDenom) % CURVE_ORDER;
    }

    /**
     * Helper: Modular inverse using Fermat's Little Theorem
     */
    private static modInverse(a: bigint, m: bigint): bigint {
        return this.expMod(a, m - 2n, m);
    }

    private static expMod(base: bigint, exp: bigint, mod: bigint): bigint {
        let res = 1n;
        base = base % mod;
        while (exp > 0n) {
            if (exp % 2n === 1n) res = (res * base) % mod;
            base = (base * base) % mod;
            exp = exp / 2n;
        }
        return res;
    }

    /**
     * Compute the binding factor rho_i = H(i, message, commitments)
     */
    static computeBindingFactor(i: number, messageHash: string, commitments: { nodeId: number, D: string, E: string }[]): bigint {
        const CURVE_ORDER = bls.CURVE.r;
        const data = JSON.stringify({ i, m: messageHash, c: commitments });
        const hash = bls.utils.sha256(Buffer.from(data));
        return BigInt('0x' + Buffer.from(hash).toString('hex')) % CURVE_ORDER;
    }

    /**
     * Compute the group commitment R = sum(D_i + rho_i * E_i)
     */
    static computeGroupCommitment(items: { D: string, E: string, rho: bigint }[]): string {
        let R = bls.PointG2.ZERO;
        for (const item of items) {
            const Di = bls.PointG2.fromHex(item.D);
            const Ei = bls.PointG2.fromHex(item.E);
            R = R.add(Di).add(Ei.multiply(item.rho));
        }
        return R.toHex(true);
    }

    /**
     * Compute Round 2 partial signature z_i.
     */
    static computePartialSignature(
        skHex: string, 
        dHex: string, 
        eHex: string, 
        rho: bigint, 
        lambda: bigint, 
        challenge: bigint
    ): string {
        const CURVE_ORDER = bls.CURVE.r;
        const sk = BigInt('0x' + skHex);
        const d = BigInt('0x' + dHex);
        const e = BigInt('0x' + eHex);

        // z_i = d_i + (e_i * rho_i) + (lambda_i * sk_i * c) mod r
        const term1 = (d + (e * rho)) % CURVE_ORDER;
        const term2 = (lambda * sk * challenge) % CURVE_ORDER;
        const zi = (term1 + term2) % CURVE_ORDER;
        
        return zi.toString(16);
    }

    /**
     * Aggregate partial signatures: z = sum(z_i) mod r
     */
    static aggregateSignatures(partials: string[]): string {
        const CURVE_ORDER = bls.CURVE.r;
        let z = 0n;
        for (const zi of partials) {
            z = (z + BigInt('0x' + zi)) % CURVE_ORDER;
        }
        return z.toString(16);
    }

    /**
     * Compute a BLS partial signature (Decentralized BLS).
     * sig_i = lambda_i * sk_i * H(m)
     */
    static async computeBlsPartialSignature(skHex: string, bindingHash: Uint8Array, S: number[], i: number): Promise<string> {
        const sk = BigInt('0x' + skHex);
        const lambda = this.computeLagrangeCoefficient(i, S);
        const derivedSk = (sk * lambda) % bls.CURVE.r;
        
        // Use noble-bls to sign with the derived secret
        const sig = await bls.sign(bindingHash, derivedSk.toString(16).padStart(64, '0'));
        return Buffer.from(sig).toString('hex');
    }
}

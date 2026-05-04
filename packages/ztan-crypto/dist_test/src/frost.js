"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Frost = void 0;
const bls = __importStar(require("@noble/bls12-381"));
const vss_1 = require("./vss");
/**
 * ZTAN-FROST: Flexible Round-Optimized Threshold Signatures
 * Implements Pedersen DKG and multi-round signing.
 */
class Frost {
    /**
     * Round 1: Participant generates a local polynomial and publishes commitments.
     * @param t Threshold
     * @param n Total participants
     * @returns Coefficients (private) and Commitments (public)
     */
    static generateRound1(t, n) {
        const coeffs = [];
        for (let i = 0; i < t; i++) {
            const secret = bls.utils.randomPrivateKey();
            coeffs.push(BigInt('0x' + Buffer.from(secret).toString('hex')));
        }
        return {
            coeffs,
            commitments: vss_1.VSS.createCommitments(coeffs)
        };
    }
    /**
     * Generate a secret share for a specific target node index.
     * This share is sent over a secure channel to the target node.
     */
    static computeShareForNode(coeffs, targetIndex) {
        return vss_1.VSS.evaluatePolynomial(coeffs, targetIndex).toString(16);
    }
    /**
     * Round 2: Aggregate all verified shares into a long-term secret share.
     * sk_i = sum(s_j,i) mod r
     */
    static aggregateShares(shares) {
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
    static computeMasterPublicKey(allCommitments) {
        let pk = bls.PointG1.ZERO;
        for (const commitments of allCommitments) {
            pk = pk.add(bls.PointG1.fromHex(commitments[0]));
        }
        return pk.toHex(true);
    }
    /**
     * Compute a node's long-term verification key (PK_i = sk_i * G1)
     */
    static computeVerificationKey(skHex) {
        const sk = BigInt('0x' + skHex);
        return bls.PointG1.BASE.multiply(sk).toHex(true);
    }
    /**
     * SIGNING Round 1: Generate ephemeral nonces and commitments.
     */
    static generateSigningNonces() {
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
    static computeLagrangeCoefficient(i, S) {
        const CURVE_ORDER = bls.CURVE.r;
        let numerator = 1n;
        let denominator = 1n;
        for (const j of S) {
            if (j === i)
                continue;
            numerator = (numerator * BigInt(j)) % CURVE_ORDER;
            let diff = (BigInt(j) - BigInt(i)) % CURVE_ORDER;
            if (diff < 0n)
                diff += CURVE_ORDER;
            denominator = (denominator * diff) % CURVE_ORDER;
        }
        // Modular inverse of denominator
        const invDenom = this.modInverse(denominator, CURVE_ORDER);
        return (numerator * invDenom) % CURVE_ORDER;
    }
    /**
     * Helper: Modular inverse using Fermat's Little Theorem
     */
    static modInverse(a, m) {
        return this.expMod(a, m - 2n, m);
    }
    static expMod(base, exp, mod) {
        let res = 1n;
        base = base % mod;
        while (exp > 0n) {
            if (exp % 2n === 1n)
                res = (res * base) % mod;
            base = (base * base) % mod;
            exp = exp / 2n;
        }
        return res;
    }
    /**
     * Compute the binding factor rho_i = H(i, message, commitments)
     */
    static computeBindingFactor(i, messageHash, commitments) {
        const CURVE_ORDER = bls.CURVE.r;
        const data = JSON.stringify({ i, m: messageHash, c: commitments });
        const hash = bls.utils.sha256(Buffer.from(data));
        return BigInt('0x' + Buffer.from(hash).toString('hex')) % CURVE_ORDER;
    }
    /**
     * Compute the group commitment R = sum(D_i + rho_i * E_i)
     */
    static computeGroupCommitment(items) {
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
    static computePartialSignature(skHex, dHex, eHex, rho, lambda, challenge) {
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
    static aggregateSignatures(partials) {
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
    static async computeBlsPartialSignature(skHex, bindingHash, S, i) {
        const sk = BigInt('0x' + skHex);
        const lambda = this.computeLagrangeCoefficient(i, S);
        const derivedSk = (sk * lambda) % bls.CURVE.r;
        // Use noble-bls to sign with the derived secret
        const sig = await bls.sign(bindingHash, derivedSk.toString(16).padStart(64, '0'));
        return Buffer.from(sig).toString('hex');
    }
}
exports.Frost = Frost;

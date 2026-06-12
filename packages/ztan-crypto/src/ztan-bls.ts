import * as bls from '@noble/bls12-381';
import { sha256 } from '@noble/hashes/sha256';
import { Canonical } from './canonical.js';
import { Frost } from './frost.js';
import { VSS } from './vss.js';

const DST = 'BLS_SIG_ZTAN_AUDIT_V1';

/**
 * ZTAN-BLS: Audit-Grade Threshold Signature Implementation (ZTAN-RFC-001 v1.5)
 * Based on BLS12-381 Curve
 */
export class ThresholdBls {
    public static readonly RFC_VERSION = '1.5.0';
    public static readonly DST = DST;

    /**
     * Simulation of a (t, n) Distributed Key Generation (DKG).
     * Uses Shamir's Secret Sharing (via VSS) for mathematical consistency.
     */
    static async dkg(t: number, n: number, nodeIds: string[], customIndices?: number[]): Promise<{
        masterPublicKey: string;
        shares: { nodeId: string; secretShare: string; verificationKey: string; index: number }[];
    }> {
        const CURVE_ORDER = bls.CURVE.r;
        
        // 1. Generate master polynomial f(x) = a0 + a1*x + ...
        // a0 is the master secret
        const coeffs: bigint[] = [];
        for (let i = 0; i < t; i++) {
            let r: Uint8Array;
            try {
                r = bls.utils.randomPrivateKey();
            } catch {
                // Fallback for environments where noble-bls random is broken
                const nodeCrypto = await import('crypto');
                r = new Uint8Array(nodeCrypto.randomBytes(32));
            }
            coeffs.push(BigInt('0x' + Canonical.bytesToHex(r)) % CURVE_ORDER);
        }

        const masterSecret = coeffs[0];
        const masterPublicKey = bls.PointG1.BASE.multiply(masterSecret);

        const shares: { nodeId: string; secretShare: string; verificationKey: string; index: number }[] = [];
        for (let i = 0; i < n; i++) {
            const nodeId = nodeIds[i] || `Node-${(i+1).toString().padStart(3, '0')}`;
            
            // Share for node index (Default 1-based for Lagrange, but supports custom)
            const shareIndex = customIndices ? customIndices[i] : i + 1;
            const secretShare = VSS.evaluatePolynomial(coeffs, shareIndex);
            const verificationKey = bls.PointG1.BASE.multiply(secretShare);

            shares.push({
                nodeId,
                index: shareIndex,
                secretShare: secretShare.toString(16).padStart(64, '0'),
                verificationKey: verificationKey.toHex(true)
            });
        }

        return {
            masterPublicKey: masterPublicKey.toHex(true),
            shares
        };
    }

    /**
     * Sign a payload using a node's secret share, bound to the full ceremony configuration.
     * Binding: SHA256(encodeField(ceremonyId) || encodeUint32BE(threshold) || encodeField(sortedKeys) || encodeField(msg))
     */
    static async signShare(
        messageHash: string, 
        secretShareHex: string, 
        ceremonyId: string, 
        threshold: number, 
        eligiblePublicKeys: string[]
    ): Promise<string> {
        const secretShare = BigInt('0x' + secretShareHex);
        const msg = Canonical.hexToBytes(messageHash);
        
        // Canonical Context Binding (ZTAN-RFC-001 v1.5)
        const ctxBytes = Canonical.safeEncode(ceremonyId);
        const sortedKeys = Canonical.sortPublicKeys(eligiblePublicKeys);
        const keysBytes = Canonical.concat(sortedKeys.map((pk: string) => Canonical.hexToBytes(pk)));

        const bindingPayload = Canonical.concat([
            Canonical.encodeField(ctxBytes),
            Canonical.encodeUint32BE(threshold),
            Canonical.encodeField(keysBytes),
            Canonical.encodeField(msg)
        ]);
        
        const finalMsg = sha256(bindingPayload);
        // noble-bls expects hex string or bytes for secret
        const signature = await bls.sign(finalMsg, secretShare.toString(16).padStart(64, '0'));
        return Canonical.bytesToHex(signature);
    }

    /**
     * Aggregate t signatures using pre-computed Lagrange weights.
     */
    static async aggregateLagrange(signatures: string[], lambdas: bigint[]): Promise<string> {
        let aggregated = bls.PointG2.ZERO;

        for (let idx = 0; idx < signatures.length; idx++) {
            const sig = bls.PointG2.fromHex(signatures[idx]);
            const lambda = lambdas[idx];
            aggregated = aggregated.add(sig.multiply(lambda));
        }

        return aggregated.toHex(true);
    }

    static async aggregate(signatures: string[], S: number[]): Promise<string> {
        if (new Set(S).size !== S.length) {
            throw new Error("[ZTAN] REJECT: Duplicate signer indices detected in subset S.");
        }
        const lambdas = S.map(i => Frost.computeLagrangeCoefficient(i, S));
        return this.aggregateLagrange(signatures, lambdas);
    }

    /**
     * Verify a signature against the MASTER PUBLIC KEY.
     */
    static async verify(
        signature: string, 
        messageHash: string, 
        masterPublicKey: string, 
        ceremonyId: string, 
        threshold: number, 
        eligiblePublicKeys: string[]
    ): Promise<boolean> {
        const sig = Canonical.hexToBytes(signature);
        const msg = Canonical.hexToBytes(messageHash);
        
        // Canonical Context Binding (ZTAN-RFC-001 v1.5)
        const ctxBytes = Canonical.safeEncode(ceremonyId);
        const sortedKeys = Canonical.sortPublicKeys(eligiblePublicKeys);
        const keysBytes = Canonical.concat(sortedKeys.map((pk: string) => Canonical.hexToBytes(pk)));

        const bindingPayload = Canonical.concat([
            Canonical.encodeField(ctxBytes),
            Canonical.encodeUint32BE(threshold),
            Canonical.encodeField(keysBytes),
            Canonical.encodeField(msg)
        ]);
        
        const finalMsg = sha256(bindingPayload);
        const groupPk = bls.PointG1.fromHex(masterPublicKey);

        return await bls.verify(sig, finalMsg, groupPk);
    }
}

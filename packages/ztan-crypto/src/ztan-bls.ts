import * as bls from '@noble/bls12-381';
import { sha256 } from '@noble/hashes/sha256';
import { Canonical } from './canonical';

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
     */
    static async dkg(t: number, n: number, nodeIds: string[]): Promise<{
        masterPublicKey: string;
        shares: { nodeId: string; secretShare: string; verificationKey: string }[];
    }> {
        // 1. Generate master secret
        const masterSecret = bls.utils.randomPrivateKey();
        const masterPublicKey = bls.getPublicKey(masterSecret);

        const shares = [];
        for (let i = 0; i < n; i++) {
            const nodeId = nodeIds[i] || `Node-${(i+1).toString().padStart(3, '0')}`;
            
            // For simulation, we derive a unique share for each node
            // In real TSS, this is a polynomial evaluation
            const secretShare = bls.utils.randomPrivateKey(); 
            const verificationKey = bls.getPublicKey(secretShare);

            shares.push({
                nodeId,
                secretShare: Buffer.from(secretShare).toString('hex'),
                verificationKey: Buffer.from(verificationKey).toString('hex')
            });
        }

        return {
            masterPublicKey: Buffer.from(masterPublicKey).toString('hex'),
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
        const secretShare = Buffer.from(secretShareHex, 'hex');
        const msg = Buffer.from(messageHash, 'hex');
        
        // Canonical Context Binding (ZTAN-RFC-001 v1.5)
        const ctxBytes = Canonical.safeEncode(ceremonyId);
        const sortedKeys = Canonical.sortPublicKeys(eligiblePublicKeys);
        const keysBytes = Canonical.concat(sortedKeys.map(pk => Buffer.from(pk, 'hex')));

        const bindingPayload = Canonical.concat([
            Canonical.encodeField(ctxBytes),
            Canonical.encodeUint32BE(threshold),
            Canonical.encodeField(keysBytes),
            Canonical.encodeField(msg)
        ]);
        
        const finalMsg = sha256(bindingPayload);
        const signature = await bls.sign(finalMsg, secretShare, { dst: DST });
        return Buffer.from(signature).toString('hex');
    }

    /**
     * Aggregate t signatures into a single group signature using Lagrange weighting.
     * S: Array of participant indices (1-indexed)
     */
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
        const { Frost } = require('./frost');
        const lambdas = S.map(i => Frost.computeLagrangeCoefficient(i, S));
        return this.aggregateLagrange(signatures, lambdas);
    }

    /**
     * Verify a signature. If signersPublicKeys.length > 1, it's an aggregated signature.
     */
    static async verify(
        signature: string, 
        messageHash: string, 
        signersPublicKeys: string[], 
        ceremonyId: string, 
        threshold: number, 
        eligiblePublicKeys: string[]
    ): Promise<boolean> {
        const sig = Buffer.from(signature, 'hex');
        const msg = Buffer.from(messageHash, 'hex');
        
        // Canonical Context Binding (ZTAN-RFC-001 v1.5)
        const ctxBytes = Canonical.safeEncode(ceremonyId);
        const sortedKeys = Canonical.sortPublicKeys(eligiblePublicKeys);
        const keysBytes = Canonical.concat(sortedKeys.map(pk => Buffer.from(pk, 'hex')));

        const bindingPayload = Canonical.concat([
            Canonical.encodeField(ctxBytes),
            Canonical.encodeUint32BE(threshold),
            Canonical.encodeField(keysBytes),
            Canonical.encodeField(msg)
        ]);
        
        const finalMsg = sha256(bindingPayload);
        const groupPk = bls.aggregatePublicKeys(signersPublicKeys.map(pk => Buffer.from(pk, 'hex')));

        return await bls.verify(sig, finalMsg, groupPk, { dst: DST });
    }
}

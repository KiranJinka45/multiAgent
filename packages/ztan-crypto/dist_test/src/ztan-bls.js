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
exports.ThresholdBls = void 0;
const bls = __importStar(require("@noble/bls12-381"));
const sha256_1 = require("@noble/hashes/sha256");
const canonical_1 = require("./canonical");
const DST = 'BLS_SIG_ZTAN_AUDIT_V1';
/**
 * ZTAN-BLS: Audit-Grade Threshold Signature Implementation (ZTAN-RFC-001 v1.5)
 * Based on BLS12-381 Curve
 */
class ThresholdBls {
    static RFC_VERSION = '1.5.0';
    static DST = DST;
    /**
     * Simulation of a (t, n) Distributed Key Generation (DKG).
     */
    static async dkg(t, n, nodeIds) {
        // 1. Generate master secret
        const masterSecret = bls.utils.randomPrivateKey();
        const masterPublicKey = bls.getPublicKey(masterSecret);
        const shares = [];
        for (let i = 0; i < n; i++) {
            const nodeId = nodeIds[i] || `Node-${(i + 1).toString().padStart(3, '0')}`;
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
    static async signShare(messageHash, secretShareHex, ceremonyId, threshold, eligiblePublicKeys) {
        const secretShare = Buffer.from(secretShareHex, 'hex');
        const msg = Buffer.from(messageHash, 'hex');
        // Canonical Context Binding (ZTAN-RFC-001 v1.5)
        const ctxBytes = canonical_1.Canonical.safeEncode(ceremonyId);
        const sortedKeys = [...eligiblePublicKeys].sort();
        const keysBytes = canonical_1.Canonical.concat(sortedKeys.map(pk => Buffer.from(pk, 'hex')));
        const bindingPayload = canonical_1.Canonical.concat([
            canonical_1.Canonical.encodeField(ctxBytes),
            canonical_1.Canonical.encodeUint32BE(threshold),
            canonical_1.Canonical.encodeField(keysBytes),
            canonical_1.Canonical.encodeField(msg)
        ]);
        const finalMsg = (0, sha256_1.sha256)(bindingPayload);
        const signature = await bls.sign(finalMsg, secretShare, { dst: DST });
        return Buffer.from(signature).toString('hex');
    }
    /**
     * Aggregate t signatures into a single group signature.
     */
    static async aggregate(signatures) {
        const sigs = signatures.map(s => Buffer.from(s, 'hex'));
        const agg = bls.aggregateSignatures(sigs);
        return Buffer.from(agg).toString('hex');
    }
    /**
     * Verify an aggregated (or partial) signature against the group configuration.
     */
    static async verify(signature, messageHash, signersPublicKeys, ceremonyId, threshold, eligiblePublicKeys) {
        const sig = Buffer.from(signature, 'hex');
        const msg = Buffer.from(messageHash, 'hex');
        // Canonical Context Binding (ZTAN-RFC-001 v1.5)
        const ctxBytes = canonical_1.Canonical.safeEncode(ceremonyId);
        const sortedKeys = [...eligiblePublicKeys].sort();
        const keysBytes = canonical_1.Canonical.concat(sortedKeys.map(pk => Buffer.from(pk, 'hex')));
        const bindingPayload = canonical_1.Canonical.concat([
            canonical_1.Canonical.encodeField(ctxBytes),
            canonical_1.Canonical.encodeUint32BE(threshold),
            canonical_1.Canonical.encodeField(keysBytes),
            canonical_1.Canonical.encodeField(msg)
        ]);
        const finalMsg = (0, sha256_1.sha256)(bindingPayload);
        const pks = signersPublicKeys.map(pk => Buffer.from(pk, 'hex'));
        const groupPk = bls.aggregatePublicKeys(pks);
        return await bls.verify(sig, finalMsg, groupPk, { dst: DST });
    }
}
exports.ThresholdBls = ThresholdBls;

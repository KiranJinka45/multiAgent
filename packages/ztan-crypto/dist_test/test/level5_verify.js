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
const bls = __importStar(require("@noble/bls12-381"));
const sha256_1 = require("@noble/hashes/sha256");
const frost_1 = require("../src/frost");
async function runTest() {
    console.log("--- ZTAN-FROST LEVEL 5 (DECENTRALIZED BLS) VERIFICATION ---");
    const t = 2;
    const n = 3;
    const ceremonyId = "MPC-CEREMONY-001";
    const payloadHash = "7289f43e1d3e4b5a6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b";
    // 1. DKG PHASE (Decentralized)
    console.log("Step 1: DKG Round 1 (Local Commitments)...");
    const p1 = frost_1.Frost.generateRound1(t, n);
    const p2 = frost_1.Frost.generateRound1(t, n);
    const p3 = frost_1.Frost.generateRound1(t, n);
    console.log("Step 2: DKG Round 2 (Share Exchange)...");
    // Node 1 receives shares
    const sk1 = frost_1.Frost.aggregateShares([
        frost_1.Frost.computeShareForNode(p1.coeffs, 1),
        frost_1.Frost.computeShareForNode(p2.coeffs, 1),
        frost_1.Frost.computeShareForNode(p3.coeffs, 1)
    ]);
    // Node 2 receives shares
    const sk2 = frost_1.Frost.aggregateShares([
        frost_1.Frost.computeShareForNode(p1.coeffs, 2),
        frost_1.Frost.computeShareForNode(p2.coeffs, 2),
        frost_1.Frost.computeShareForNode(p3.coeffs, 2)
    ]);
    const masterPk = frost_1.Frost.computeMasterPublicKey([p1.commitments, p2.commitments, p3.commitments]);
    const vk1 = frost_1.Frost.computeVerificationKey(sk1);
    const vk2 = frost_1.Frost.computeVerificationKey(sk2);
    const vk3 = frost_1.Frost.computeVerificationKey(frost_1.Frost.aggregateShares([
        frost_1.Frost.computeShareForNode(p1.coeffs, 3),
        frost_1.Frost.computeShareForNode(p2.coeffs, 3),
        frost_1.Frost.computeShareForNode(p3.coeffs, 3)
    ]));
    const eligiblePks = [vk1, vk2, vk3];
    console.log(`Master PK: ${masterPk}`);
    // 2. BINDING CALCULATION (RFC v1.5)
    const ctxBytes = Buffer.from(ceremonyId);
    const sortedKeys = [...eligiblePks].sort();
    const keysBytes = Buffer.concat(sortedKeys.map(pk => Buffer.from(pk, 'hex')));
    const msgBytes = Buffer.from(payloadHash, 'hex');
    const bindingPayload = Buffer.concat([
        lenPrefix(ctxBytes),
        u32BE(t),
        lenPrefix(keysBytes),
        lenPrefix(msgBytes)
    ]);
    const finalMsg = Buffer.from((0, sha256_1.sha256)(bindingPayload));
    // 3. SIGNING PHASE (Decentralized)
    console.log("Step 3: Decentralized Partial Signatures (using Lagrange)...");
    const S = [1, 2]; // Nodes 1 and 2 will sign
    // Each node signs INDEPENDENTLY with their secret share and Lagrange coeff
    const sig1 = await frost_1.Frost.computeBlsPartialSignature(sk1, finalMsg, S, 1);
    const sig2 = await frost_1.Frost.computeBlsPartialSignature(sk2, finalMsg, S, 2);
    console.log("Step 4: Aggregation...");
    const aggregatedSig = Buffer.from(bls.aggregateSignatures([
        Buffer.from(sig1, 'hex'),
        Buffer.from(sig2, 'hex')
    ])).toString('hex');
    // 4. VERIFICATION (Direct BLS Verification against Master PK)
    console.log("Step 5: Final Audit Verification (against Master PK)...");
    console.log(`Binding Payload Hash: ${finalMsg.toString('hex')}`);
    console.log(`Aggregated Sig: ${aggregatedSig}`);
    console.log(`Master PK: ${masterPk}`);
    const isValid = await bls.verify(Buffer.from(aggregatedSig, 'hex'), finalMsg, Buffer.from(masterPk, 'hex'), { dst: 'BLS_SIG_ZTAN_AUDIT_V1' });
    if (isValid) {
        console.log("✅ LEVEL 5 PASS: Decentralized signature matches Master PK.");
    }
    else {
        console.log("❌ LEVEL 5 FAIL: Signature invalid.");
        process.exit(1);
    }
}
function lenPrefix(b) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(b.length);
    return Buffer.concat([len, b]);
}
function u32BE(n) {
    const b = Buffer.alloc(4);
    b.writeUInt32BE(n);
    return b;
}
runTest().catch(console.error);

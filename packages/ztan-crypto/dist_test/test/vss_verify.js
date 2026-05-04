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
const vss_1 = require("../src/vss");
async function runTest() {
    console.log("--- ZTAN VSS VERIFICATION ---");
    const threshold = 3;
    const secret = bls.utils.randomPrivateKey();
    const coeffs = [BigInt('0x' + Buffer.from(secret).toString('hex'))];
    for (let i = 1; i < threshold; i++) {
        coeffs.push(BigInt('0x' + Buffer.from(bls.utils.randomPrivateKey()).toString('hex')));
    }
    const commitments = vss_1.VSS.createCommitments(coeffs);
    console.log(`Commitments Generated: ${commitments.length}`);
    let successCount = 0;
    for (let i = 1; i <= 5; i++) {
        const share = vss_1.VSS.evaluatePolynomial(coeffs, i);
        const isValid = vss_1.VSS.verifyShare(share.toString(16), i, commitments);
        if (isValid)
            successCount++;
    }
    if (successCount === 5) {
        console.log("✅ VSS PASS: All 5 shares verified against commitments.");
    }
    else {
        console.log(`❌ VSS FAIL: Only ${successCount}/5 shares verified.`);
        process.exit(1);
    }
}
runTest().catch(console.error);

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
const vitest_1 = require("vitest");
const bls = __importStar(require("@noble/bls12-381"));
const vss_1 = require("../src/vss");
(0, vitest_1.describe)('Pedersen VSS (BLS12-381 G1)', () => {
    (0, vitest_1.it)('should correctly evaluate polynomial and verify shares', async () => {
        const threshold = 3;
        const secret = bls.utils.randomPrivateKey();
        const coeffs = [secret];
        for (let i = 1; i < threshold; i++) {
            coeffs.push(bls.utils.randomPrivateKey());
        }
        // 1. Create Commitments
        const commitments = vss_1.VSS.createCommitments(coeffs);
        (0, vitest_1.expect)(commitments.length).toBe(threshold);
        // 2. Generate and Verify Shares for 5 participants
        for (let i = 1; i <= 5; i++) {
            const share = vss_1.VSS.evaluatePolynomial(coeffs, i);
            const isValid = vss_1.VSS.verifyShare(share.toString(16), i, commitments);
            (0, vitest_1.expect)(isValid).toBe(true);
        }
        // 3. ADVERSARIAL: Tamper with share
        const tamperedShare = vss_1.VSS.evaluatePolynomial(coeffs, 1) + 1n;
        const isInvalid = vss_1.VSS.verifyShare(tamperedShare.toString(16), 1, commitments);
        (0, vitest_1.expect)(isInvalid).toBe(false);
        // 4. ADVERSARIAL: Tamper with commitment
        const commitmentsBad = [...commitments];
        commitmentsBad[0] = bls.PointG1.BASE.toHex(true); // Wrong secret commitment
        const isInvalid2 = vss_1.VSS.verifyShare(vss_1.VSS.evaluatePolynomial(coeffs, 1).toString(16), 1, commitmentsBad);
        (0, vitest_1.expect)(isInvalid2).toBe(false);
    });
});

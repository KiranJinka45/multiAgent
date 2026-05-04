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
exports.VSS = void 0;
const bls = __importStar(require("@noble/bls12-381"));
/**
 * Verifiable Secret Sharing (VSS) for ZTAN-FROST
 * Implements Pedersen Commitments over BLS12-381 G1
 */
class VSS {
    /**
     * Evaluate polynomial f(x) = a0 + a1*x + ... + a(t-1)*x^(t-1) mod ScalarField
     */
    static evaluatePolynomial(coeffs, x) {
        const xBig = BigInt(x);
        let result = 0n;
        let xPow = 1n;
        const CURVE_ORDER = bls.CURVE.r;
        for (const coeff of coeffs) {
            result = (result + coeff * xPow) % CURVE_ORDER;
            xPow = (xPow * xBig) % CURVE_ORDER;
        }
        return result;
    }
    /**
     * Create Pedersen Commitments for the polynomial coefficients
     * C_j = a_j * G1
     */
    static createCommitments(coeffs) {
        return coeffs.map(a => bls.PointG1.BASE.multiply(a).toHex(true));
    }
    /**
     * Verify a secret share against public commitments
     * Check: share * G1 == sum(x^j * C_j)
     */
    static verifyShare(shareHex, x, commitmentsHex) {
        try {
            const share = BigInt('0x' + shareHex);
            const lhs = bls.PointG1.BASE.multiply(share);
            const commitments = commitmentsHex.map(hex => bls.PointG1.fromHex(hex));
            let rhs = bls.PointG1.ZERO; // Use built-in ZERO if available
            const xBig = BigInt(x);
            let xPow = 1n;
            const CURVE_ORDER = bls.CURVE.r;
            for (const Cj of commitments) {
                // rhs = rhs + (x^j * C_j)
                rhs = rhs.add(Cj.multiply(xPow));
                xPow = (xPow * xBig) % CURVE_ORDER;
            }
            return lhs.equals(rhs);
        }
        catch (e) {
            return false;
        }
    }
}
exports.VSS = VSS;

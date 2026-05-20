import * as bls from '@noble/bls12-381';

/**
 * Verifiable Secret Sharing (VSS) for ZTAN-FROST
 * Implements Pedersen Commitments over BLS12-381 G1
 */
export class VSS {
    /**
     * Evaluate polynomial f(x) = a0 + a1*x + ... + a(t-1)*x^(t-1) mod ScalarField
     */
    static evaluatePolynomial(coeffs: bigint[], x: number): bigint {
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
    static createCommitments(coeffs: bigint[]): string[] {
        return coeffs.map(a => bls.PointG1.BASE.multiply(a).toHex(true));
    }

    /**
     * Verify a secret share against public commitments
     * Check: share * G1 == sum(x^j * C_j)
     */
    static verifyShare(shareHex: string, x: number, commitmentsHex: string[]): boolean {
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
        } catch (e) {
            return false;
        }
    }
}

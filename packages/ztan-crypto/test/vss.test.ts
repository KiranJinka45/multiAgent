import { describe, it, expect } from 'vitest';
import * as bls from '@noble/bls12-381';
import { VSS } from '../src/vss';

describe('Pedersen VSS (BLS12-381 G1)', () => {
    it('should correctly evaluate polynomial and verify shares', async () => {
        const threshold = 3;
        const secret = bls.utils.randomPrivateKey();
        const coeffs = [secret];
        for (let i = 1; i < threshold; i++) {
            coeffs.push(bls.utils.randomPrivateKey());
        }

        // 1. Create Commitments
        const commitments = VSS.createCommitments(coeffs);
        expect(commitments.length).toBe(threshold);

        // 2. Generate and Verify Shares for 5 participants
        for (let i = 1; i <= 5; i++) {
            const share = VSS.evaluatePolynomial(coeffs, i);
            const isValid = VSS.verifyShare(share.toString(16), i, commitments);
            expect(isValid).toBe(true);
        }

        // 3. ADVERSARIAL: Tamper with share
        const tamperedShare = VSS.evaluatePolynomial(coeffs, 1) + 1n;
        const isInvalid = VSS.verifyShare(tamperedShare.toString(16), 1, commitments);
        expect(isInvalid).toBe(false);

        // 4. ADVERSARIAL: Tamper with commitment
        const commitmentsBad = [...commitments];
        commitmentsBad[0] = bls.PointG1.BASE.toHex(true); // Wrong secret commitment
        const isInvalid2 = VSS.verifyShare(VSS.evaluatePolynomial(coeffs, 1).toString(16), 1, commitmentsBad);
        expect(isInvalid2).toBe(false);
    });
});

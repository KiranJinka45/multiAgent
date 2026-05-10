import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { ThresholdBls } from '../src/ztan-bls';
import { Canonical } from '../src/canonical';

/**
 * ZTAN Property-Based Testing Suite (Threshold Aggregation Logic)
 */
describe('ZTAN Threshold Cryptography Properties', () => {
    
    // Generator for n, t (t <= n)
    const thresholdGen = fc.record({
        n: fc.integer({ min: 2, max: 10 }),
        t: fc.integer({ min: 2, max: 10 })
    }).filter(({ n, t }) => t <= n);

    const messageGen = fc.uint8Array({ minLength: 32, maxLength: 32 }).map(bytes => Canonical.bytesToHex(bytes));

    it('Property: Threshold Correctness (t vs t-1)', async () => {
        await fc.assert(
            fc.asyncProperty(thresholdGen, messageGen, async ({ n, t }, msg) => {
                const nodeIds = Array.from({ length: n }, (_, i) => `node-${i}`);
                const dkg = await ThresholdBls.dkg(t, n, nodeIds);
                const eligiblePks = dkg.shares.map(s => s.verificationKey);
                
                // Case 1: Valid subset of size t
                const fullSubsetIndices = Array.from({ length: n }, (_, i) => i + 1).slice(0, t);
                const fullSubsetShares = fullSubsetIndices.map(idx => dkg.shares[idx - 1]);
                
                const sigSharesFull = await Promise.all(fullSubsetShares.map(s => 
                    ThresholdBls.signShare(msg, s.secretShare, "ceremony-1", t, eligiblePks)
                ));
                
                const aggFull = await ThresholdBls.aggregate(sigSharesFull, fullSubsetIndices);
                const isValidFull = await ThresholdBls.verify(aggFull, msg, dkg.masterPublicKey, "ceremony-1", t, eligiblePks);
                
                if (!isValidFull) return false;

                // Case 2: Invalid subset of size t-1
                const tooFewIndices = fullSubsetIndices.slice(0, t - 1);
                const tooFewShares = fullSubsetShares.slice(0, t - 1);
                
                const sigSharesFew = await Promise.all(tooFewShares.map(s => 
                    ThresholdBls.signShare(msg, s.secretShare, "ceremony-1", t, eligiblePks)
                ));
                
                const aggFew = await ThresholdBls.aggregate(sigSharesFew, tooFewIndices);
                const isValidFew = await ThresholdBls.verify(aggFew, msg, dkg.masterPublicKey, "ceremony-1", t, eligiblePks);
                
                return isValidFew === false;
            }),
            { numRuns: 5 } // Crypto is slow, 5 runs is enough to catch most bugs in this environment
        );
    }, 60000);

    it('Property: Order Independence (Permutation Invariance)', async () => {
        await fc.assert(
            fc.asyncProperty(thresholdGen, messageGen, async ({ n, t }, msg) => {
                const nodeIds = Array.from({ length: n }, (_, i) => `node-${i}`);
                const dkg = await ThresholdBls.dkg(t, n, nodeIds);
                const eligiblePks = dkg.shares.map(s => s.verificationKey);
                
                const subsetIndices = Array.from({ length: n }, (_, i) => i + 1).slice(0, t);
                const subsetShares = subsetIndices.map(idx => dkg.shares[idx - 1]);
                
                const sigShares = await Promise.all(subsetShares.map(s => 
                    ThresholdBls.signShare(msg, s.secretShare, "ceremony-1", t, eligiblePks)
                ));

                // Aggregate in original order
                const agg1 = await ThresholdBls.aggregate(sigShares, subsetIndices);

                // Aggregate in reversed order
                const agg2 = await ThresholdBls.aggregate([...sigShares].reverse(), [...subsetIndices].reverse());

                return agg1 === agg2;
            }),
            { numRuns: 5 }
        );
    }, 60000);

    it('Property: Duplicate Share Rejection', async () => {
        await fc.assert(
            fc.asyncProperty(thresholdGen, messageGen, async ({ n, t }, msg) => {
                const nodeIds = Array.from({ length: n }, (_, i) => `node-${i}`);
                const dkg = await ThresholdBls.dkg(t, n, nodeIds);
                const eligiblePks = dkg.shares.map(s => s.verificationKey);
                
                // Construct a set with duplicates: [1, 1, 2, ..., t-1]
                const dupIndices = [1, 1, ...Array.from({ length: t - 2 }, (_, i) => i + 2)];
                const dupShares = dupIndices.map(idx => dkg.shares[idx - 1]);
                
                const sigShares = await Promise.all(dupShares.map(s => 
                    ThresholdBls.signShare(msg, s.secretShare, "ceremony-1", t, eligiblePks)
                ));

                try {
                    const agg = await ThresholdBls.aggregate(sigShares, dupIndices);
                    const isValid = await ThresholdBls.verify(agg, msg, dkg.masterPublicKey, "ceremony-1", t, eligiblePks);
                    return isValid === false;
                } catch (e) {
                    // Correctly rejected
                    return true;
                }
            }),
            { numRuns: 5 }
        );
    }, 60000);

    it('Property: Ceremony Isolation (Cross-Ceremony Rejection)', async () => {
        await fc.assert(
            fc.asyncProperty(thresholdGen, messageGen, async ({ n, t }, msg) => {
                const nodeIds = Array.from({ length: n }, (_, i) => `node-${i}`);
                const dkg1 = await ThresholdBls.dkg(t, n, nodeIds);
                const dkg2 = await ThresholdBls.dkg(t, n, nodeIds);
                
                const pks1 = dkg1.shares.map(s => s.verificationKey);
                const pks2 = dkg2.shares.map(s => s.verificationKey);
                
                // Mix shares from ceremony 1 and 2
                const mixIndices = Array.from({ length: t }, (_, i) => i + 1);
                const mixShares = mixIndices.map((idx, i) => i === 0 ? dkg1.shares[idx - 1] : dkg2.shares[idx - 1]);
                
                const sigShares = await Promise.all(mixShares.map((s, i) => 
                    ThresholdBls.signShare(msg, s.secretShare, "shared-id", t, i === 0 ? pks1 : pks2)
                ));

                const agg = await ThresholdBls.aggregate(sigShares, mixIndices);
                const isValid1 = await ThresholdBls.verify(agg, msg, dkg1.masterPublicKey, "shared-id", t, pks1);
                const isValid2 = await ThresholdBls.verify(agg, msg, dkg2.masterPublicKey, "shared-id", t, pks2);

                return isValid1 === false && isValid2 === false;
            }),
            { numRuns: 5 }
        );
    }, 60000);
});

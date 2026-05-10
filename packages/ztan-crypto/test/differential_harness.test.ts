import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as bls from '@noble/bls12-381';
import { ThresholdBls } from '../src/ztan-bls';
import { Canonical } from '../src/canonical';
import { Frost } from '../src/frost';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ZTAN Differential Fuzzing Harness
 * Compares ZTAN Threshold Logic against @noble/bls12-381 Primitives
 */
describe('ZTAN Differential Cryptographic Fuzzing', () => {

    const thresholdGen = fc.record({
        n: fc.integer({ min: 3, max: 8 }),
        t: fc.integer({ min: 2, max: 8 })
    }).filter(({ n, t }) => t <= n);

    const messageGen = fc.uint8Array({ minLength: 32, maxLength: 32 }).map(bytes => Canonical.bytesToHex(bytes));

    const sparseIdsGen = fc.uniqueArray(fc.integer({ min: 1, max: 10000 }), { minLength: 3, maxLength: 8 });

    const differentialResults: any[] = [];

    const recordResult = (testName: string, ztan: any, noble: any) => {
        const match = JSON.stringify(ztan) === JSON.stringify(noble);
        differentialResults.push({ testName, ztan, noble, match });
        return match;
    };

    it('Differential: Primitive Verification Equivalence', async () => {
        await fc.assert(
            fc.asyncProperty(messageGen, async (msgHex) => {
                const sk = bls.utils.randomPrivateKey();
                const pk = bls.getPublicKey(sk);
                const pkHex = Canonical.bytesToHex(pk);
                
                // ZTAN uses a binding hash for ceremony safety
                // To compare primitives, we must ensure both use the SAME final hash
                const ceremonyId = "diff-test-1";
                const threshold = 1;
                const pks = [pkHex];
                
                const sigZTANHex = await ThresholdBls.signShare(msgHex, Canonical.bytesToHex(sk), ceremonyId, threshold, pks);
                
                // Manual ZTAN binding logic to get the same msg for noble
                const ctxBytes = Canonical.safeEncode(ceremonyId);
                const keysBytes = Canonical.concat(pks.map(k => Canonical.hexToBytes(k)));
                const bindingPayload = Canonical.concat([
                    Canonical.encodeField(ctxBytes),
                    Canonical.encodeUint32BE(threshold),
                    Canonical.encodeField(keysBytes),
                    Canonical.encodeField(Canonical.hexToBytes(msgHex))
                ]);
                const finalMsg = Canonical.bytesToHex(bls.utils.sha256(bindingPayload));

                // Noble primitive verify
                const isValidNoble = await bls.verify(sigZTANHex, finalMsg, pkHex);
                
                // ZTAN verify
                const isValidZTAN = await ThresholdBls.verify(sigZTANHex, msgHex, pkHex, ceremonyId, threshold, pks);

                return recordResult('Primitive Verify', isValidZTAN, isValidNoble);
            }),
            { numRuns: 5 }
        );
    }, 60000);

    it('Differential: Threshold Reconstruction (Sparse & Non-Sequential IDs)', async () => {
        await fc.assert(
            fc.asyncProperty(thresholdGen, sparseIdsGen, messageGen, async ({ n, t }, sparseIds, msg) => {
                // Ensure n matches sparseIds length for this test
                const actualN = Math.min(n, sparseIds.length);
                const actualT = Math.min(t, actualN);
                const ids = sparseIds.slice(0, actualN).sort((a, b) => a - b);
                
                // Generate Ceremony with Sparse IDs
                const nodeIds = ids.map(id => `node-${id}`);
                const dkg = await ThresholdBls.dkg(actualT, actualN, nodeIds, ids);
                const masterPkHex = dkg.masterPublicKey;
                const eligiblePks = dkg.shares.map(s => s.verificationKey);

                // Pick random subset of size T
                const subsetIndices = ids.slice(0, actualT);
                const subsetShares = subsetIndices.map(id => {
                    const share = dkg.shares.find(s => s.index === id);
                    if (!share) throw new Error("Share not found for index " + id);
                    return share;
                });

                // ZTAN Aggregation
                const sigShares = await Promise.all(subsetShares.map(s => 
                    ThresholdBls.signShare(msg, s.secretShare, "ceremony-sparse", actualT, eligiblePks)
                ));
                
                const aggZTAN = await ThresholdBls.aggregate(sigShares, subsetIndices);

                // NOBLE Differential Verification
                const ctxBytes = Canonical.safeEncode("ceremony-sparse");
                const sortedKeys = Canonical.sortPublicKeys(eligiblePks);
                const keysBytes = Canonical.concat(sortedKeys.map(pk => Canonical.hexToBytes(pk)));
                const bindingPayload = Canonical.concat([
                    Canonical.encodeField(ctxBytes),
                    Canonical.encodeUint32BE(actualT),
                    Canonical.encodeField(keysBytes),
                    Canonical.encodeField(Canonical.hexToBytes(msg))
                ]);
                const finalMsg = bls.utils.sha256(bindingPayload);

                const isValidNoble = await bls.verify(aggZTAN, finalMsg, masterPkHex);

                return recordResult(`Threshold Sparse (t=${actualT}, n=${actualN})`, true, isValidNoble);
            }),
            { numRuns: 5 }
        );
    }, 60000);

    it('Differential: Aggregation Permutation Invariance', async () => {
        await fc.assert(
            fc.asyncProperty(thresholdGen, messageGen, async ({ n, t }, msg) => {
                const nodeIds = Array.from({ length: n }, (_, i) => `node-${i}`);
                const dkg = await ThresholdBls.dkg(t, n, nodeIds);
                const eligiblePks = dkg.shares.map(s => s.verificationKey);
                
                const subsetIndices = Array.from({ length: t }, (_, i) => i + 1);
                const subsetShares = subsetIndices.map(idx => dkg.shares[idx - 1]);
                const sigShares = await Promise.all(subsetShares.map(s => 
                    ThresholdBls.signShare(msg, s.secretShare, "perm-test", t, eligiblePks)
                ));

                // Original Order
                const agg1 = await ThresholdBls.aggregate(sigShares, subsetIndices);

                // Shuffled Order
                const shuffled = subsetIndices.map((idx, i) => ({ idx, sig: sigShares[i] }))
                    .sort(() => Math.random() - 0.5);
                
                const agg2 = await ThresholdBls.aggregate(shuffled.map(s => s.sig), shuffled.map(s => s.idx));

                return recordResult('Aggregation Permutation', agg1, agg2);
            }),
            { numRuns: 5 }
        );
    }, 60000);

    it('Differential: Adversarial Corruption Equivalence', async () => {
        await fc.assert(
            fc.asyncProperty(thresholdGen, messageGen, async ({ n, t }, msg) => {
                const nodeIds = Array.from({ length: n }, (_, i) => `node-${i}`);
                const dkg = await ThresholdBls.dkg(t, n, nodeIds);
                const eligiblePks = dkg.shares.map(s => s.verificationKey);
                const subsetIndices = Array.from({ length: t }, (_, i) => i + 1);
                const subsetShares = subsetIndices.map(idx => dkg.shares[idx - 1]);
                
                const sigShares = await Promise.all(subsetShares.map(s => 
                    ThresholdBls.signShare(msg, s.secretShare, "corrupt-test", t, eligiblePks)
                ));

                const aggZTAN = await ThresholdBls.aggregate(sigShares, subsetIndices);

                // Mutate the aggregate signature (Corrupt one byte)
                const aggBytes = Canonical.hexToBytes(aggZTAN);
                aggBytes[0] ^= 0xFF;
                const corruptedAgg = Canonical.bytesToHex(aggBytes);

                // Both should reject
                const isValidZTAN = await ThresholdBls.verify(corruptedAgg, msg, dkg.masterPublicKey, "corrupt-test", t, eligiblePks);
                
                // Manual noble verify
                const ctxBytes = Canonical.safeEncode("corrupt-test");
                const sortedKeys = Canonical.sortPublicKeys(eligiblePks);
                const keysBytes = Canonical.concat(sortedKeys.map(pk => Canonical.hexToBytes(pk)));
                const bindingPayload = Canonical.concat([
                    Canonical.encodeField(ctxBytes),
                    Canonical.encodeUint32BE(t),
                    Canonical.encodeField(keysBytes),
                    Canonical.encodeField(Canonical.hexToBytes(msg))
                ]);
                const finalMsg = bls.utils.sha256(bindingPayload);
                
                let isValidNoble = false;
                try {
                    isValidNoble = await bls.verify(corruptedAgg, finalMsg, dkg.masterPublicKey);
                } catch (e) {
                    isValidNoble = false; // noble might throw on invalid points
                }

                return recordResult('Adversarial Corruption', isValidZTAN, isValidNoble);
            }),
            { numRuns: 5 }
        );
    }, 60000);

    afterAll(() => {
        // Save results for audit evidence
        const summary = differentialResults.map(r => ({
            test: r.testName,
            match: r.match,
            status: r.match ? "✅ MATCH" : "❌ MISMATCH"
        }));
        
        console.table(summary);
        fs.writeFileSync(path.join(__dirname, '../differential_vectors.json'), JSON.stringify(differentialResults, null, 2));
    });
});

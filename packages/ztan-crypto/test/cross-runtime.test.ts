import { execSync } from 'child_process';
import { resolve } from 'path';
import * as fs from 'fs';
import { ThresholdBls } from '../src/index';

describe('ZTAN Cross-Runtime Parity Suite', () => {
  const pythonScript = resolve(__dirname, '../../../audit/cross_runtime_audit.py');
  const vectorsPath = resolve(__dirname, './vectors.json');

  it('should achieve bit-level parity between Node.js and Python auditor', () => {
    // 1. Ensure Python script exists
    expect(fs.existsSync(pythonScript)).toBe(true);

    // 2. Invoke Python Auditor
    try {
      console.log('Running Python Auditor Suite...');
      const output = execSync(`python "${pythonScript}"`, { encoding: 'utf-8' });
      console.log(output);
      
      // 3. Assert success in output
      expect(output).toContain('OK AUDIT PASSED CLEANLY');
    } catch (error: any) {
      console.error('Python Auditor Failed:', error.stdout);
      throw new Error(`Cross-runtime parity check failed: ${error.message}`);
    }
  });

  it('should verify that Node.js ztan-crypto matches vectors.json locally', async () => {
    const data = JSON.parse(fs.readFileSync(vectorsPath, 'utf-8'));
    
    for (const v of data.vectors) {
      if (v.type === 'SUCCESS') {
        const { canonicalHashHex } = ThresholdBls.buildCanonicalPayload(
          v.input.auditId,
          v.input.timestamp,
          v.input.payloadHash,
          v.input.threshold,
          v.input.nodeIds
        );
        expect(canonicalHashHex).toBe(v.expectedHash);
      }
    }
  });

  it('should prove bi-directional signature parity (Python aggregates, Node verifies)', async () => {
    const messageHash = 'e8bebb06cb303e0d09131a289ec1048a360817cd82d44a92c2c06df51a2f9f69';
    const { shares, masterPublicKey } = await ThresholdBls.dkg(2, 3, ['A', 'B', 'C']);
    
    // 1. Node generates partials
    const sigA = await ThresholdBls.signShare(messageHash, shares[0].secretShare);
    const sigB = await ThresholdBls.signShare(messageHash, shares[1].secretShare);

    // 2. Python aggregates these Node-generated partials
    const pythonAgg = execSync(`python "${pythonScript}" --aggregate ${sigA} ${sigB}`, { encoding: 'utf-8' }).trim();
    console.log('Python Aggregated Signature:', pythonAgg);

    // 3. Node verifies Python's aggregate signature
    const isValid = await ThresholdBls.verify(pythonAgg, messageHash, [masterPublicKey]);
    expect(isValid).toBe(true);
    console.log('Node successfully verified Python aggregate signature.');
  });
});

const { ThresholdCrypto } = require('./packages/ztan-crypto/src/index');
const fs = require('fs');

async function main() {
  const vectorsPath = './packages/ztan-crypto/test/vectors.json';
  const data = JSON.parse(fs.readFileSync(vectorsPath, 'utf-8'));
  
  for (const v of data.vectors) {
    if (v.type === 'SUCCESS') {
      try {
        const { canonicalHashHex } = ThresholdCrypto.buildCanonicalPayload(
          v.input.auditId,
          v.input.timestamp,
          v.input.payloadHash,
          v.input.threshold,
          v.input.nodeIds
        );
        console.log(`Vector: ${v.name}`);
        console.log(`New Hash: ${canonicalHashHex}`);
      } catch (err) {
        console.error(`Error in ${v.name}: ${err.message}`);
      }
    }
  }
}

main();

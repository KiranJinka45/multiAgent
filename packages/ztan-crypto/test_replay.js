const { ThresholdCrypto } = require('./dist/index');

async function test() {
  const audit = JSON.stringify({
    version: 'ZTAN_CANONICAL_V1',
    auditId: 'REPLAY-TEST-123',
    timestamp: Date.now(),
    payloadHash: '8f92b4e28f92b4e28f92b4e28f92b4e28f92b4e28f92b4e28f92b4e28f92b4e2',
    threshold: 2,
    nodeIds: ['nodeA', 'nodeB', 'nodeC']
  });

  console.log('First verification:');
  const res1 = await ThresholdCrypto.verifyAudit(audit);
  console.log('Status:', res1.status);

  console.log('\nSecond verification (same ID):');
  const res2 = await ThresholdCrypto.verifyAudit(audit);
  console.log('Status:', res2.status);
  console.log('Error:', res2.errorType);
}

test();

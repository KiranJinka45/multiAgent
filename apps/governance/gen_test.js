const fs = require('fs');
const audit = {
  version: 'ZTAN_CANONICAL_V1',
  auditId: 'TEST-AUDIT-' + Math.random().toString(36).substring(7).toUpperCase(),
  timestamp: Date.now(),
  payloadHash: '8f92b4e28f92b4e28f92b4e28f92b4e28f92b4e28f92b4e28f92b4e28f92b4e2',
  threshold: 2,
  nodeIds: ['nodeA', 'nodeB', 'nodeC']
};
fs.writeFileSync('sample_audit.json', JSON.stringify(audit, null, 2));
console.log('Generated fresh sample_audit.json');

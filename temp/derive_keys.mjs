import * as bls from '@noble/bls12-381';
import { sha256 } from '@noble/hashes/sha256';

const identities = [
  'SEC-GOV-01',
  'SRE-AUDIT-02',
  'TRUST-NODE-03',
  'LEGAL-04',
  'COMPLIANCE-05'
];

function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

console.log('Deriving correct BLS public keys:');
for (const id of identities) {
  const secretKey = sha256(new TextEncoder().encode(`SECRET_${id}`));
  const publicKey = bls.getPublicKey(secretKey);
  console.log(`  '${id}': '0x${toHex(publicKey)}',`);
}

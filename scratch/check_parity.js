const crypto = require('crypto');
const bls = require('@noble/bls12-381');
const DST = 'BLS_SIG_ZTAN_AUDIT_V1';

async function main() {
  const sk1 = "0000000000000000000000000000000000000000000000000000000000000001";
  const pk1 = bls.getPublicKey(sk1);
  console.log(`Node PK1: ${Buffer.from(pk1).toString('hex')}`);
  
  const h3 = "e8bebb06cb303e0d09131a289ec1048a360817cd82d44a92c2c06df51a2f9f69";
  const sig1 = await bls.sign(Buffer.from(h3, 'hex'), sk1, { dst: DST });
  console.log(`Node Sig1: ${Buffer.from(sig1).toString('hex')}`);
}

main();

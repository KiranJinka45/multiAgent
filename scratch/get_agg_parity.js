const bls = require('@noble/bls12-381');
const { sha256 } = require('@noble/hashes/sha256');

const DST = 'BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_NUL_';
const msg = Buffer.from('e8bebb06cb303e0d09131a289ec1048a360817cd82d44a92c2c06df51a2f9f69', 'hex');

async function run() {
  const sk1 = sha256(Buffer.from('SECRET_SEC-GOV-01'));
  const sk2 = sha256(Buffer.from('SECRET_SRE-AUDIT-02'));
  
  const pk1 = bls.getPublicKey(sk1);
  const pk2 = bls.getPublicKey(sk2);
  
  const groupPk = bls.aggregatePublicKeys([pk1, pk2]);
  
  const sig1 = await bls.sign(msg, sk1, { dst: DST });
  const sig2 = await bls.sign(msg, sk2, { dst: DST });
  
  const groupSig = bls.aggregateSignatures([sig1, sig2]);
  
  console.log("Group PK:", Buffer.from(groupPk).toString('hex'));
  console.log("Group Sig:", Buffer.from(groupSig).toString('hex'));
}

run();

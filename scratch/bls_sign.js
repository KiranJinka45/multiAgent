const bls = require('@noble/bls12-381');
const { sha256 } = require('@noble/hashes/sha256');

const DST = 'BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_NUL_';
const sk = Buffer.from('5d86b95f800f38a49e3fc50e365ee16f21bcfcee2411ba7a6eb1c65c248075ea', 'hex');
const msg = Buffer.from('a2d7ef152e03496365f827cdbb193e355b8e3a8c1288fd274dd54c6d44347a41', 'hex');

bls.sign(msg, sk, { dst: DST }).then(sig => {
  console.log("Sig Hex:", Buffer.from(sig).toString('hex'));
});

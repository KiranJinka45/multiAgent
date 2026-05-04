const bls = require('@noble/bls12-381');
const { sha256 } = require('@noble/hashes/sha256');

const identity = "SEC-GOV-01";
const seed = Buffer.from(`SECRET_${identity}`);
const sk = sha256(seed);
console.log("SK Hex:", Buffer.from(sk).toString('hex'));

const pk = bls.getPublicKey(sk);
console.log("PK Hex:", Buffer.from(pk).toString('hex'));

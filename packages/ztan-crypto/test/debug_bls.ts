import * as bls from '@noble/bls12-381';
console.log("BLS Keys:", Object.keys(bls));
console.log("BLS Utils Keys:", Object.keys(bls.utils));
if (bls.CURVE) console.log("CURVE Keys:", Object.keys(bls.CURVE));

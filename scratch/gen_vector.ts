import { ThresholdBls } from '../packages/ztan-crypto/src/ztan-bls';
import { bls12_381 as bls } from '@noble/curves/bls12-381';

async function generate() {
    const context = "CEREMONY-A";
    const messageHash = "00".repeat(32);
    
    const secretShare = "01".repeat(32);
    const publicKey = Buffer.from(bls.getPublicKey(secretShare)).toString('hex');
    
    const signature = await ThresholdBls.signShare(messageHash, secretShare, context);
    
    console.log("Context:", context);
    console.log("Message Hash:", messageHash);
    console.log("Public Key:", publicKey);
    console.log("Signature:", signature);
}

generate();

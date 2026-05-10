import * as bls from '@noble/bls12-381';
import { Canonical } from './src/canonical';

async function generateProof() {
    const secret = process.env.ZTAN_DETERMINISM_SECRET;
    if (!secret) {
        throw new Error('[Crypto] ZTAN_DETERMINISM_SECRET is not set in environment variables');
    }
    const msg = "5f70a2404edc009c5332f17088b9a282f6412b189a089901413a290823094823"; // sha256("test")
    
    console.log("--- Node.js Determinism Proof ---");
    console.log(`Message: ${msg}`);

    
    const signature = await bls.sign(msg, secret);
    const sigHex = Canonical.bytesToHex(signature);
    
    console.log(`Signature: ${sigHex}`);
}

generateProof();

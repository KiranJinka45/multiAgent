const { ThresholdBls } = require('./packages/ztan-crypto/dist/index');
const { sha256 } = require('@noble/hashes/sha256');

async function gen() {
    const context = "ceremony-context-v1";
    const messageHash = "e8bebb06cb303e0d09131a289ec1048a360817cd82d44a92c2c06df51a2f9f69";
    
    const { masterPublicKey, shares } = await ThresholdBls.dkg(2, 3, ['A', 'B', 'C']);
    
    // Success with context
    const sigA = await ThresholdBls.signShare(messageHash, shares[0].secretShare, context);
    const sigB = await ThresholdBls.signShare(messageHash, shares[1].secretShare, context);
    const agg = await ThresholdBls.aggregate([sigA, sigB]);
    
    console.log("--- SUCCESS VECTOR ---");
    console.log("Context:", context);
    console.log("Master PK:", masterPublicKey);
    console.log("Signature:", agg);
}

gen();

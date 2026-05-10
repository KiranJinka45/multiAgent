import { ThresholdBls } from './src/ztan-bls';
import { Canonical } from './src/canonical';

async function validate() {
  console.log('--- ZTAN Cryptographic Validation Suite ---');
  
  const ceremonyId = 'TEST_CEREMONY_001';
  const threshold = 2;
  const nodeIds = ['Node-1', 'Node-2', 'Node-3'];
  
  // 1. DKG Simulation
  console.log('1. Performing DKG...');
  const { masterPublicKey, shares } = await ThresholdBls.dkg(threshold, 3, nodeIds);
  console.log('   Master PK:', masterPublicKey);
  
  // 2. Signing
  console.log('2. Generating partial signatures...');
  const message = 'Hello ZTAN World';
  const messageHash = Canonical.bytesToHex(new TextEncoder().encode(message));
  
  const eligiblePublicKeys = shares.map(s => s.verificationKey);
  
  const sig1 = await ThresholdBls.signShare(messageHash, shares[0].secretShare, ceremonyId, threshold, eligiblePublicKeys);
  const sig2 = await ThresholdBls.signShare(messageHash, shares[1].secretShare, ceremonyId, threshold, eligiblePublicKeys);
  
  console.log('   Sig 1:', sig1.slice(0, 16) + '...');
  console.log('   Sig 2:', sig2.slice(0, 16) + '...');
  
  // 3. Aggregation & Verification
  console.log('3. Aggregating signatures...');
  // Participants 1 and 2 (1-indexed indices: 1, 2)
  const S = [1, 2];
  const aggregateSig = await ThresholdBls.aggregate([sig1, sig2], S);
  console.log('   Aggregate Sig:', aggregateSig.slice(0, 16) + '...');
  
  console.log('4. Verifying aggregate signature...');
  const isValid = await ThresholdBls.verify(
    aggregateSig, 
    messageHash, 
    masterPublicKey, 
    ceremonyId, 
    threshold, 
    eligiblePublicKeys
  );
  
  if (isValid) {
    console.log('✅ SUCCESS: Cryptographic round-trip verified!');
  } else {
    console.error('❌ FAILURE: Cryptographic verification failed!');
    process.exit(1);
  }
}

validate().catch(console.error);

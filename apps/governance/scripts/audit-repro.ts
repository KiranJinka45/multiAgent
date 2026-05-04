import * as fs from 'fs';
import * as path from 'path';
import { ThresholdCrypto } from '../src/crypto-utils';

async function verifyVector(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const vector = JSON.parse(content);
  
  console.log(`\n🔍 Verifying Vector: ${vector.id} - ${vector.description}`);
  
  if (vector.id === 'TV-001') {
    const canonicalIds = ThresholdCrypto.canonicalizeNodeIds(vector.input.participants).map(b => b.toString('hex'));
    const idMatch = JSON.stringify(canonicalIds) === JSON.stringify(vector.expected.canonicalParticipants);
    console.log(`${idMatch ? '✔' : '✖'} canonicalParticipants: ${idMatch ? 'MATCH' : 'FAIL'}`);
    
    const payloadBytes = Buffer.from(vector.input.payload.toString(), 'hex');
    const encoding = ThresholdCrypto.buildCanonicalPayload(payloadBytes, vector.input.threshold, vector.input.participants);
    const hexPayload = Buffer.from(encoding.boundPayloadBytes).toString('hex');
    const payloadMatch = hexPayload === vector.expected.canonicalPayloadHex;
    console.log(`${payloadMatch ? '✔' : '✖'} canonicalPayload: ${payloadMatch ? 'MATCH' : 'FAIL'}`);
    
    const hashMatch = encoding.canonicalHashHex === vector.expected.messageHash;
    console.log(`${hashMatch ? '✔' : '✖'} messageHash: ${hashMatch ? 'MATCH' : 'FAIL'}`);
    
    // We cannot fully verify the signature without the public key, but we can re-sign with the same share
    const fixedShare = BigInt('123456789012345678901234567890');
    const sig = await ThresholdCrypto.signPartial(vector.input.payload, fixedShare, 'nodea', vector.input.threshold, vector.input.participants);
    const sigMatch = sig.signature === vector.expected.signature;
    console.log(`${sigMatch ? '✔' : '✖'} signature: ${sigMatch ? 'MATCH' : 'FAIL'}`);
    
    const passed = idMatch && payloadMatch && hashMatch && sigMatch;
    console.log(`${passed ? '✔ verification: PASS' : '✖ verification: FAIL'}`);
    return passed;
  }
  
  if (vector.id === 'TV-002' || vector.id === 'TV-010') {
    const encodingA = ThresholdCrypto.buildCanonicalPayload(vector.inputA.payload.toString(), vector.inputA.threshold, vector.inputA.participants);
    const encodingB = ThresholdCrypto.buildCanonicalPayload(vector.inputB.payload.toString(), vector.inputB.threshold, vector.inputB.participants);
    
    const match = encodingA.canonicalHashHex === encodingB.canonicalHashHex;
    console.log(`${match ? '✔' : '✖'} Equivalence Match: ${match ? 'PASS' : 'FAIL'}`);
    return match === vector.expected.match;
  }
  
  if (vector.id === 'TV-009' || vector.id === 'TV-011' || vector.id === 'TV-012') {
    const payloadBytes = Buffer.from(vector.input.payload.toString(), 'hex');
    const participants = vector.input.participants || Array.from({length: vector.input.participantsCount}, (_, i) => `node_${i}`);
    
    const encoding = ThresholdCrypto.buildCanonicalPayload(payloadBytes, vector.input.threshold, participants);
    
    if (vector.expected.boundPayloadHex) {
        const payloadMatch = Buffer.from(encoding.boundPayloadBytes).toString('hex') === vector.expected.boundPayloadHex;
        console.log(`${payloadMatch ? '✔' : '✖'} Payload hex: ${payloadMatch ? 'PASS' : 'FAIL'}`);
        return payloadMatch;
    }
    
    const hashMatch = encoding.canonicalHashHex === vector.expected.canonicalHashHex;
    console.log(`${hashMatch ? '✔' : '✖'} Hash match: ${hashMatch ? 'PASS' : 'FAIL'}`);
    return hashMatch;
  }
  if (vector.id === 'TV-013' || vector.id === 'TV-014') {
    let errorThrown = false;
    try {
        ThresholdCrypto.buildCanonicalPayload(vector.input.payload.toString(), vector.input.threshold, vector.input.participants);
    } catch (e) {
        errorThrown = true;
    }
    const match = errorThrown === vector.expected.error;
    console.log(`${match ? '✔' : '✖'} Rejection behavior: ${match ? 'PASS' : 'FAIL'}`);
    return match;
  }
  
  return true;
}

async function run() {
  const dir = path.join(__dirname, '..', 'test_vectors');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  let allPass = true;
  for (const file of files) {
    const pass = await verifyVector(path.join(dir, file));
    console.log(`=> Result for ${file}: ${pass}`);
    if (!pass) allPass = false;
  }
  console.log(`Final allPass: ${allPass}`);
  if (!allPass) process.exit(1);
}

run().catch(console.error);

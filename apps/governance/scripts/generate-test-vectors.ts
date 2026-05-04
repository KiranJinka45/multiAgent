import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { ThresholdCrypto } from '../src/crypto-utils';

const VECTORS_DIR = path.join(__dirname, '..', 'test_vectors');

function hashPayload(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

if (!fs.existsSync(VECTORS_DIR)) {
  fs.mkdirSync(VECTORS_DIR, { recursive: true });
}

async function generateVectors() {
  console.log('Generating deterministic test vectors...');
  
  // Create deterministic node keys for testing
  const threshold = 3;
  
  // We need a static secret share to make the signatures deterministic for the test vectors.
  const fixedShare = BigInt('123456789012345678901234567890');
  
  // TV-001: Dedup + normalize + sort
  const tv001Payload = hashPayload('payload_123');
  const tv001Nodes = ['NodeB', 'nodea', 'NODEA', 'nodeb '];
  
  const canonical001 = ThresholdCrypto.canonicalizeNodeIds(tv001Nodes).map(b => b.toString('hex'));
  const encoding001 = ThresholdCrypto.buildCanonicalPayload(tv001Payload, 2, tv001Nodes);
  
  const sig001 = await ThresholdCrypto.signPartial(tv001Payload, fixedShare, 'nodea', 2, tv001Nodes);
  
  const tv001 = {
    id: 'TV-001',
    description: 'Canonical signer set normalization',
    input: {
      payload: tv001Payload,
      participants: tv001Nodes,
      threshold: 2
    },
    expected: {
      canonicalParticipants: canonical001,
      canonicalPayloadHex: Buffer.from(encoding001.boundPayloadBytes).toString('hex'),
      messageHash: encoding001.canonicalHashHex,
      signature: sig001.signature,
      valid: true
    }
  };
  fs.writeFileSync(path.join(VECTORS_DIR, 'tv-001.json'), JSON.stringify(tv001, null, 2));

  // TV-002: Ordering invariance
  const tv002NodesA = ['a', 'b', 'c'];
  const tv002NodesB = ['c', 'a', 'b'];
  const sig002A = await ThresholdCrypto.signPartial(tv001Payload, fixedShare, 'a', 2, tv002NodesA);
  const sig002B = await ThresholdCrypto.signPartial(tv001Payload, fixedShare, 'a', 2, tv002NodesB);
  
  const tv002 = {
    id: 'TV-002',
    description: 'Ordering invariance',
    inputA: { payload: tv001Payload, participants: tv002NodesA, threshold: 2 },
    inputB: { payload: tv001Payload, participants: tv002NodesB, threshold: 2 },
    expected: {
      match: true,
      signatureMatch: sig002A.signature === sig002B.signature
    }
  };
  fs.writeFileSync(path.join(VECTORS_DIR, 'tv-002.json'), JSON.stringify(tv002, null, 2));

  // TV-009: Delimiter collision
  const tv009Payload = hashPayload('abc|def,123');
  const encoding009 = ThresholdCrypto.buildCanonicalPayload(tv009Payload, 2, tv001Nodes);
  const tv009 = {
    id: 'TV-009',
    description: 'Delimiter collision safety',
    input: { payload: tv009Payload, participants: tv001Nodes, threshold: 2 },
    expected: {
      canonicalHashHex: encoding009.canonicalHashHex,
      boundPayloadHex: Buffer.from(encoding009.boundPayloadBytes).toString('hex')
    }
  };
  fs.writeFileSync(path.join(VECTORS_DIR, 'tv-009.json'), JSON.stringify(tv009, null, 2));

  // TV-010: Unicode normalization
  const tv010NodesA = ['nóde']; // Precomposed
  const tv010NodesB = ['no\u0301de']; // Decomposed
  const payload010 = hashPayload('payload');
  const encoding010A = ThresholdCrypto.buildCanonicalPayload(payload010, 1, tv010NodesA);
  const encoding010B = ThresholdCrypto.buildCanonicalPayload(payload010, 1, tv010NodesB);
  const tv010 = {
    id: 'TV-010',
    description: 'Unicode normalization equivalence',
    inputA: { payload: payload010, participants: tv010NodesA, threshold: 1 },
    inputB: { payload: payload010, participants: tv010NodesB, threshold: 1 },
    expected: {
      match: encoding010A.canonicalHashHex === encoding010B.canonicalHashHex
    }
  };
  fs.writeFileSync(path.join(VECTORS_DIR, 'tv-010.json'), JSON.stringify(tv010, null, 2));

  // TV-011: Binary payload
  const tv011Payload = crypto.randomBytes(32).toString('hex');
  const encoding011 = ThresholdCrypto.buildCanonicalPayload(tv011Payload, 2, tv001Nodes);
  const tv011 = {
    id: 'TV-011',
    description: 'Binary payload encoding',
    input: { payload: tv011Payload, participants: tv001Nodes, threshold: 2 },
    expected: {
      canonicalHashHex: encoding011.canonicalHashHex,
      boundPayloadHex: Buffer.from(encoding011.boundPayloadBytes).toString('hex')
    }
  };
  fs.writeFileSync(path.join(VECTORS_DIR, 'tv-011.json'), JSON.stringify(tv011, null, 2));

  // TV-012: Large input boundary
  const largePayload = hashPayload('a'.repeat(100000)); // Hashed to 32 bytes
  const largeParticipants = Array.from({ length: 100 }, (_, i) => `node${i}`);
  const encoding012 = ThresholdCrypto.buildCanonicalPayload(largePayload, 50, largeParticipants);
  const tv012 = {
    id: 'TV-012',
    description: 'Large input boundary safety',
    input: { payload: largePayload, participants: largeParticipants, threshold: 50 },
    expected: {
      canonicalHashHex: encoding012.canonicalHashHex,
      boundPayloadHex: Buffer.from(encoding012.boundPayloadBytes).toString('hex')
    }
  };
  fs.writeFileSync(path.join(VECTORS_DIR, 'tv-012.json'), JSON.stringify(tv012, null, 2));

  // TV-013: Empty Participant List Rejection
  let tv013Error = false;
  const errorPayload = hashPayload('error_payload');
  try {
      ThresholdCrypto.buildCanonicalPayload(errorPayload, 2, []);
  } catch (e) {
      tv013Error = true;
  }
  const tv013 = {
    id: 'TV-013',
    description: 'Rejection of empty participant lists',
    input: { payload: errorPayload, participants: [], threshold: 2 },
    expected: { error: true, errorEncountered: tv013Error }
  };
  fs.writeFileSync(path.join(VECTORS_DIR, 'tv-013.json'), JSON.stringify(tv013, null, 2));

  // TV-014: Threshold Exceeds Participants Rejection
  let tv014Error = false;
  try {
      ThresholdCrypto.buildCanonicalPayload(errorPayload, 3, ['nodeA', 'nodeB']);
  } catch (e) {
      tv014Error = true;
  }
  const tv014 = {
    id: 'TV-014',
    description: 'Rejection of threshold exceeding participants',
    input: { payload: errorPayload, participants: ['nodeA', 'nodeB'], threshold: 3 },
    expected: { error: true, errorEncountered: tv014Error }
  };
  fs.writeFileSync(path.join(VECTORS_DIR, 'tv-014.json'), JSON.stringify(tv014, null, 2));

  console.log('Test vectors generated successfully in test_vectors/');
}

generateVectors().catch(console.error);

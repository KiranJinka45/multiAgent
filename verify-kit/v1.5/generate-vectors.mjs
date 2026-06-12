/**
 * ZTAN-RFC-001 v1.5 — Ground-Truth Test Vector Generator
 *
 * Performs a full DKG → sign → aggregate → verify cycle using the production
 * TypeScript codebase and exports deterministic test vectors for cross-validation
 * by the Python auditor (verify-kit/v1.5/verify.py).
 *
 * Usage:
 *   node verify-kit/v1.5/generate-vectors.mjs
 *
 * Output:
 *   verify-kit/v1.5/vectors.json
 *   verify-kit/v1.5/bundle.json  (full proof bundle for --bundle verification)
 */

import { ThresholdBls } from '../../packages/ztan-crypto/dist/index.js';
import { sha256 } from '@noble/hashes/sha256';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return arr;
}

async function main() {
  console.log('=== ZTAN v1.5 Ground-Truth Vector Generator ===\n');

  // ── 1. DKG ──────────────────────────────────────────────
  const threshold = 2;
  const nodeCount = 3;
  const nodeIds = ['Auditor-A', 'Auditor-B', 'Auditor-C'];
  const ceremonyId = 'CER-VECTOR-GEN-2026';

  console.log(`[1/6] Running DKG (${threshold}-of-${nodeCount})...`);
  const dkg = await ThresholdBls.dkg(threshold, nodeCount, nodeIds);
  console.log(`  Master PK: ${dkg.masterPublicKey.substring(0, 32)}...`);

  // ── 2. Message Hash ─────────────────────────────────────
  const messagePayload = 'ZTAN-VECTOR-PAYLOAD-FOR-CROSS-VALIDATION';
  const messageHash = bytesToHex(sha256(new TextEncoder().encode(messagePayload)));
  console.log(`[2/6] Message Hash: ${messageHash.substring(0, 32)}...`);

  // ── 3. Sign Shares ─────────────────────────────────────
  const eligiblePublicKeys = dkg.shares.map(s => s.verificationKey);
  console.log(`[3/6] Signing with ${threshold} shares...`);

  const signerIndices = [0, 1]; // First two nodes
  const signatures = [];
  for (const idx of signerIndices) {
    const share = dkg.shares[idx];
    const sig = await ThresholdBls.signShare(
      messageHash,
      share.secretShare,
      ceremonyId,
      threshold,
      eligiblePublicKeys
    );
    signatures.push(sig);
    console.log(`  Node ${share.nodeId} (idx=${share.index}): ${sig.substring(0, 32)}...`);
  }

  // ── 4. Aggregate ───────────────────────────────────────
  console.log(`[4/6] Aggregating ${signatures.length} partial signatures...`);
  const S = signerIndices.map(i => dkg.shares[i].index);
  const aggregateSig = await ThresholdBls.aggregate(signatures, S);
  console.log(`  Aggregate: ${aggregateSig.substring(0, 32)}...`);

  // ── 5. Verify ──────────────────────────────────────────
  console.log(`[5/6] Verifying against master PK...`);
  const valid = await ThresholdBls.verify(
    aggregateSig,
    messageHash,
    dkg.masterPublicKey,
    ceremonyId,
    threshold,
    eligiblePublicKeys
  );
  console.log(`  Result: ${valid ? '✅ VALID' : '❌ INVALID'}`);

  if (!valid) {
    console.error('FATAL: Signature verification failed. Cannot generate vectors.');
    process.exit(1);
  }

  // ── 6. Compute Binding Payload (for cross-validation) ──
  console.log(`[6/6] Computing canonical binding payload...`);

  // Replicate the binding logic from ThresholdBls.verify
  const ctxBytes = new TextEncoder().encode(ceremonyId);
  // Sort eligible public keys by decoded bytes (same as Canonical.sortPublicKeys)
  const sortedKeys = [...eligiblePublicKeys].sort((a, b) => {
    const ba = hexToBytes(a);
    const bb = hexToBytes(b);
    for (let i = 0; i < Math.min(ba.length, bb.length); i++) {
      if (ba[i] !== bb[i]) return ba[i] - bb[i];
    }
    return ba.length - bb.length;
  });
  const keysBytesArr = sortedKeys.map(pk => hexToBytes(pk));
  const keysBytes = new Uint8Array(keysBytesArr.reduce((acc, b) => acc + b.length, 0));
  let offset = 0;
  for (const b of keysBytesArr) { keysBytes.set(b, offset); offset += b.length; }

  const msgHashBytes = hexToBytes(messageHash);

  // encodeField: uint32BE(len) || data
  function encodeField(data) {
    const len = new Uint8Array(4);
    new DataView(len.buffer).setUint32(0, data.length, false);
    const out = new Uint8Array(4 + data.length);
    out.set(len);
    out.set(data, 4);
    return out;
  }

  const thresholdBytes = new Uint8Array(4);
  new DataView(thresholdBytes.buffer).setUint32(0, threshold, false);

  const parts = [
    encodeField(ctxBytes),
    thresholdBytes,
    encodeField(keysBytes),
    encodeField(msgHashBytes)
  ];

  const totalLen = parts.reduce((acc, p) => acc + p.length, 0);
  const bindingPayload = new Uint8Array(totalLen);
  let off2 = 0;
  for (const p of parts) { bindingPayload.set(p, off2); off2 += p.length; }

  const bindingHash = bytesToHex(sha256(bindingPayload));
  const canonicalLayout = bytesToHex(bindingPayload);

  console.log(`  Canonical Layout: ${canonicalLayout.substring(0, 64)}...`);
  console.log(`  Binding Hash: ${bindingHash}`);

  // ── Output Vectors ─────────────────────────────────────
  const vectors = [
    {
      name: 'v1.5-full-dkg-sign-verify',
      description: 'Full DKG → Sign → Aggregate → Verify cycle (ground truth)',
      input: {
        ceremonyId,
        threshold,
        messageHash,
        eligiblePublicKeys,
        masterPublicKey: dkg.masterPublicKey
      },
      expectedCanonicalLayout: canonicalLayout,
      bindingHash,
      aggregateSignature: aggregateSig,
      signerIndices: S,
      verified: true
    }
  ];

  // ── Output Bundle ──────────────────────────────────────
  const bundle = {
    version: 'ZTAN_V1.5',
    schemaVersion: 1,
    ceremonyId,
    timestamp: Date.now(),
    threshold,
    masterPublicKey: dkg.masterPublicKey,
    signature: aggregateSig,
    messageHash,
    eligiblePublicKeys,
    signers: signerIndices.map(i => dkg.shares[i].nodeId),
    signerIndices: S,
    bindingHash,
    canonicalLayout
  };

  const vectorsPath = join(__dirname, 'vectors.json');
  const bundlePath = join(__dirname, 'bundle.json');

  writeFileSync(vectorsPath, JSON.stringify(vectors, null, 2));
  writeFileSync(bundlePath, JSON.stringify(bundle, null, 2));

  console.log(`\n✅ Vectors written to: ${vectorsPath}`);
  console.log(`✅ Bundle written to:  ${bundlePath}`);
  console.log('\nTo cross-validate with Python:');
  console.log(`  python verify-kit/v1.5/verify.py --test verify-kit/v1.5/vectors.json`);
  console.log(`  python verify-kit/v1.5/verify.py --bundle verify-kit/v1.5/bundle.json`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});

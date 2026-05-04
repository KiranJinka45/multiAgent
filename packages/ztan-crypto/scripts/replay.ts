import { ThresholdCrypto, computeSessionHash } from '../src/index';
import * as fs from 'fs';
import * as path from 'path';

async function replaySession(sessionPath: string) {
  console.log(`--- ZTAN REPLAY VERIFIER ---`);
  console.log(`Loading session: ${sessionPath}`);
  
  const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
  const { input, output, logs } = session;

  console.log('\n1. Reproducing Canonical Hash...');
  const result = ThresholdCrypto.buildCanonicalPayload(
    input.auditId,
    input.timestamp,
    input.payloadHash,
    input.threshold,
    input.nodeIds
  );

  if (result.canonicalHashHex === output.hash) {
    console.log('  ✔ Canonical Hash Reproduced Exactly');
  } else {
    console.error(`  ✖ CANONICAL HASH MISMATCH: Expected ${output.hash}, got ${result.canonicalHashHex}`);
    process.exit(1);
  }

  console.log('\n2. Verifying Session Integrity (Structural Binding)...');
  const sessionHash = computeSessionHash({
    canonicalHash: result.canonicalHashHex,
    logs: logs,
    diagnostics: result.diagnostics
  });

  if (sessionHash === output.sessionHash) {
    console.log('  ✔ Session Integrity Verified (Structural Binding Matched)');
  } else {
    console.error(`  ✖ SESSION INTEGRITY FAILURE: Expected ${output.sessionHash}, got ${sessionHash}`);
    console.error('  WARNING: Session evidence may have been tampered with!');
    process.exit(1);
  }

  console.log('\n✔ REPLAY VERIFIED: Session evidence is correct and reproducible.');
}

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: pnpm replay <path-to-session.json>');
  process.exit(1);
}

replaySession(arg);

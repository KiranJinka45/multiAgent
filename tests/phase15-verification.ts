import './env-setup.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  PersistenceArchaeologist,
  GovernanceLedgerEntry
} from '../packages/runtime-core/src/index';

async function runPhase15Verification() {
  console.log('================================================================================');
  console.log('🧪  ZTAN PHASE 15 - STORAGE PATHOLOGY & PERSISTENCE ARCHAEOLOGY RUNNER');
  console.log('================================================================================\n');

  const arch = new PersistenceArchaeologist();
  const tempDir = path.join(process.cwd(), 'scratch', 'phase15_temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Generate NIST P-256 key pair for signing tests
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1'
  });
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;

  const signPayload = (payload: string): string => {
    const sign = crypto.createSign('SHA256');
    sign.update(payload);
    sign.end();
    return sign.sign(privateKey).toString('base64');
  };

  const computeHash = (entry: Omit<GovernanceLedgerEntry, 'hash'>): string => {
    const canonicalStr = [
      entry.prevHash,
      entry.sequenceId.toString(),
      entry.timestamp,
      entry.type,
      entry.payload,
      entry.operatorId,
      entry.signature,
      entry.epoch,
      entry.verdict
    ].join('|');
    return '0x' + crypto.createHash('sha256').update(canonicalStr).digest('hex');
  };

  // ────────────────────────────────────────────────────────────────────────
  // TEST 1: Block-Level Corruption Diagnostics (Hash, Chain, Signatures)
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 1] Auditing Block-Level Corruption Diagnostics...');

  const block1Data: Omit<GovernanceLedgerEntry, 'hash'> = {
    sequenceId: 1001,
    timestamp: new Date().toISOString(),
    type: 'GOVERNANCE',
    payload: 'Genesis operational boundary configuration approved.',
    operatorId: 'operator-alpha',
    signature: '',
    prevHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    epoch: '100',
    verdict: 'VERIFIED'
  };
  block1Data.signature = signPayload(block1Data.payload);
  const block1: GovernanceLedgerEntry = { ...block1Data, hash: computeHash(block1Data) };

  const block2Data: Omit<GovernanceLedgerEntry, 'hash'> = {
    sequenceId: 1002,
    timestamp: new Date().toISOString(),
    type: 'POLICY',
    payload: 'Rego policy outbox checks deployed.',
    operatorId: 'operator-alpha',
    signature: '',
    prevHash: block1.hash,
    epoch: '100',
    verdict: 'VERIFIED'
  };
  block2Data.signature = signPayload(block2Data.payload);
  const block2: GovernanceLedgerEntry = { ...block2Data, hash: computeHash(block2Data) };

  const ledgerFile = path.join(tempDir, 'healthy_ledger.json');
  fs.writeFileSync(ledgerFile, JSON.stringify([block1, block2], null, 2), 'utf8');

  // Verify healthy file
  const inspect1 = await arch.inspectBlockLevelCorruption(ledgerFile, publicKeyPem);
  console.log(`     - Healthy Ledger check: isParseable=${inspect1.isParseable}, isValid=${inspect1.isValid}, corruptions=${inspect1.corruptions.length}`);
  if (!inspect1.isValid || inspect1.corruptions.length > 0) {
    throw new Error('Healthy ledger flagged as corrupt!');
  }

  // Inject Hash Mismatch corruption
  const corruptHashLedgerFile = path.join(tempDir, 'corrupt_hash.json');
  const badBlock1 = { ...block1, hash: '0xbadhash12345' };
  fs.writeFileSync(corruptHashLedgerFile, JSON.stringify([badBlock1, block2], null, 2), 'utf8');

  const inspect2 = await arch.inspectBlockLevelCorruption(corruptHashLedgerFile, publicKeyPem);
  console.log(`     - Corrupt Hash check: corruptions found=${inspect2.corruptions.length}`);
  const hasHashMismatch = inspect2.corruptions.some(c => c.sequenceId === 1001 && c.types.includes('HASH_MISMATCH'));
  if (!hasHashMismatch) {
    throw new Error('Failed to detect hash mismatch corruption!');
  }

  // Inject Broken Merkle Link corruption
  const brokenChainLedgerFile = path.join(tempDir, 'broken_chain.json');
  const badBlock2 = { ...block2, prevHash: '0xbrokenlink11111' };
  fs.writeFileSync(brokenChainLedgerFile, JSON.stringify([block1, badBlock2], null, 2), 'utf8');

  const inspect3 = await arch.inspectBlockLevelCorruption(brokenChainLedgerFile, publicKeyPem);
  console.log(`     - Broken Merkle Link check: corruptions found=${inspect3.corruptions.length}`);
  const hasMerkleBreak = inspect3.corruptions.some(c => c.sequenceId === 1002 && c.types.includes('MERKLE_LINK_BROKEN'));
  if (!hasMerkleBreak) {
    throw new Error('Failed to detect Merkle link broken chain corruption!');
  }

  // Inject Invalid Operator Signature corruption
  const badSigLedgerFile = path.join(tempDir, 'bad_sig.json');
  const badSigBlock1 = { ...block1, signature: Buffer.from('fakesignaturepayload').toString('base64'), hash: '' };
  // Recompute hash to isolate signature error without triggering hash mismatch
  badSigBlock1.hash = computeHash(badSigBlock1);
  fs.writeFileSync(badSigLedgerFile, JSON.stringify([badSigBlock1, block2], null, 2), 'utf8');

  const inspect4 = await arch.inspectBlockLevelCorruption(badSigLedgerFile, publicKeyPem);
  console.log(`     - Invalid Signature check: corruptions found=${inspect4.corruptions.length}`);
  const hasBadSig = inspect4.corruptions.some(c => c.sequenceId === 1001 && c.types.includes('SIGNATURE_INVALID'));
  if (!hasBadSig) {
    throw new Error('Failed to detect invalid signature corruption!');
  }

  console.log('  ✅ Block-Level Corruption Diagnostics verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 2: Torn-Writes and Null Padding Detection
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 2] Auditing Torn-Writes and Null Padding...');

  // 1. Torn Write (Incomplete JSON)
  const tornWriteFile = path.join(tempDir, 'torn_write.json');
  fs.writeFileSync(tornWriteFile, '[\n  {\n    "sequenceId": 1001,\n    "timestamp": "2026-05-25",\n    "payload": "Partial entry...', 'utf8');

  const inspectTorn = await arch.inspectBlockLevelCorruption(tornWriteFile, publicKeyPem);
  console.log(`     - Torn Write check: isParseable=${inspectTorn.isParseable}, isTornWrite=${inspectTorn.isTornWrite}, error="${inspectTorn.syntaxError}"`);
  if (inspectTorn.isParseable || !inspectTorn.isTornWrite) {
    throw new Error('Failed to identify torn-write signature!');
  }

  // 2. Ext4 Null Padding (Valid JSON ending with null bytes)
  const nullPaddingFile = path.join(tempDir, 'null_padding.json');
  const jsonContent = JSON.stringify([block1], null, 2);
  const jsonBuffer = Buffer.from(jsonContent, 'utf8');
  // Pad with 1024 null bytes
  const paddedBuffer = Buffer.concat([jsonBuffer, Buffer.alloc(1024, 0)]);
  fs.writeFileSync(nullPaddingFile, paddedBuffer);

  const inspectNull = await arch.inspectBlockLevelCorruption(nullPaddingFile, publicKeyPem);
  console.log(`     - Null Padding check: hasTrailingNulls=${inspectNull.hasTrailingNulls}, trailingNullCount=${inspectNull.trailingNullCount}, isParseable=${inspectNull.isParseable}`);
  if (!inspectNull.hasTrailingNulls || inspectNull.trailingNullCount !== 1024 || !inspectNull.isParseable) {
    throw new Error('Failed to detect or parse null-padded block files!');
  }

  console.log('  ✅ Torn-Writes and Null Padding verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 3: Rollback Parity Audits
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 3] Auditing Database vs Disk Rollback Parity...');

  const dbList = [
    { blockId: '1001', hash: '0xhashA' },
    { blockId: '1002', hash: '0xhashB' },
    { blockId: '1003', hash: '0xhashC' }
  ];

  // A. DB_AHEAD Scenario (un-fsynced disk data lost on crash)
  const diskListAhead = [
    { sequenceId: 1001, hash: '0xhashA' },
    { sequenceId: 1002, hash: '0xhashB' }
  ];
  const auditA = arch.auditRollbackParity(dbList, diskListAhead);
  console.log(`     - DB_AHEAD Audit: hasDiscrepancy=${auditA.hasDiscrepancy}, type=${auditA.divergenceType}, mismatches=${auditA.mismatches.length}`);
  if (!auditA.hasDiscrepancy || auditA.divergenceType !== 'DB_AHEAD' || auditA.mismatches[0].sequenceId !== 1003) {
    throw new Error('Failed to audit DB_AHEAD rollback parity discrepancy!');
  }

  // B. DISK_AHEAD Scenario (disk data written but DB transaction rolled back)
  const diskListDiskAhead = [
    { sequenceId: 1001, hash: '0xhashA' },
    { sequenceId: 1002, hash: '0xhashB' },
    { sequenceId: 1003, hash: '0xhashC' },
    { sequenceId: 1004, hash: '0xhashD' }
  ];
  const auditB = arch.auditRollbackParity(dbList, diskListDiskAhead);
  console.log(`     - DISK_AHEAD Audit: hasDiscrepancy=${auditB.hasDiscrepancy}, type=${auditB.divergenceType}, mismatches=${auditB.mismatches.length}`);
  if (!auditB.hasDiscrepancy || auditB.divergenceType !== 'DISK_AHEAD' || auditB.mismatches[0].sequenceId !== 1004) {
    throw new Error('Failed to audit DISK_AHEAD rollback parity discrepancy!');
  }

  // C. STATE_DIVERGENCE Scenario (hash mismatch/divergence between db and disk)
  const diskListDivergent = [
    { sequenceId: 1001, hash: '0xhashA' },
    { sequenceId: 1002, hash: '0xhashB_mutated' },
    { sequenceId: 1003, hash: '0xhashC' }
  ];
  const auditC = arch.auditRollbackParity(dbList, diskListDivergent);
  console.log(`     - STATE_DIVERGENCE Audit: hasDiscrepancy=${auditC.hasDiscrepancy}, type=${auditC.divergenceType}, mismatches=${auditC.mismatches.length}`);
  if (!auditC.hasDiscrepancy || auditC.divergenceType !== 'STATE_DIVERGENCE' || auditC.mismatches[0].sequenceId !== 1002) {
    throw new Error('Failed to audit STATE_DIVERGENCE rollback parity discrepancy!');
  }

  console.log('  ✅ Database vs Disk Rollback Parity verified.\n');

  // ────────────────────────────────────────────────────────────────────────
  // TEST 4: Automated Torn-Write Repair Capabilities
  // ────────────────────────────────────────────────────────────────────────
  console.log('⚡ [TEST 4] Auditing Automated Torn-Write Repair Capabilities...');

  const corruptFile = path.join(tempDir, 'torn_repair_target.json');
  // Write one valid block and one half-written block, followed by null bytes
  const partialContent = `[\n` +
    `  {\n` +
    `    "sequenceId": 1001,\n` +
    `    "timestamp": "${new Date().toISOString()}",\n` +
    `    "type": "GOVERNANCE",\n` +
    `    "payload": "Valid block.",\n` +
    `    "operatorId": "operator-alpha",\n` +
    `    "signature": "${block1.signature}",\n` +
    `    "prevHash": "0x000",\n` +
    `    "epoch": "100",\n` +
    `    "verdict": "VERIFIED",\n` +
    `    "hash": "${block1.hash}"\n` +
    `  },\n` +
    `  {\n` +
    `    "sequenceId": 1002,\n` +
    `    "timestamp": "`; // sudden truncate
  
  const rawPadded = Buffer.concat([Buffer.from(partialContent, 'utf8'), Buffer.alloc(512, 0)]);
  fs.writeFileSync(corruptFile, rawPadded);

  // Perform repair
  const backupFile = path.join(tempDir, 'torn_repair_target.json.bak');
  const repairStats = await arch.attemptRepair(corruptFile, false, false, backupFile);
  console.log(`     - Repair status: success=${repairStats.success}, originalSize=${repairStats.originalSizeBytes}, repairedSize=${repairStats.repairedSizeBytes}, repairedCount=${repairStats.repairedBlockCount}`);
  
  if (!repairStats.success || repairStats.repairedBlockCount !== 1) {
    throw new Error('Torn-write repair failed to run successfully!');
  }

  // Read repaired file to check parse integrity
  const repairedContent = fs.readFileSync(corruptFile, 'utf8');
  const parsed = JSON.parse(repairedContent);
  console.log(`     - Repaired file validation: isArray=${Array.isArray(parsed)}, length=${parsed.length}, blockId=${parsed[0]?.sequenceId}`);
  if (!Array.isArray(parsed) || parsed.length !== 1 || parsed[0].sequenceId !== 1001) {
    throw new Error('Repaired JSON output does not carry intact historical block data!');
  }

  // Clean up
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (err) {}

  console.log('  ✅ Automated Torn-Write Repair Capabilities verified.\n');

  console.log('================================================================================');
  console.log('🎉 PHASE 15 STORAGE PATHOLOGY & PERSISTENCE ARCHAEOLOGY VERIFIED SUCCESSFULLY');
  console.log('================================================================================');
}

runPhase15Verification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});

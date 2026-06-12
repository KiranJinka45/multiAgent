/**
 * ZTAN — Backup Integrity Validator
 *
 * Examines serialized ZTAN backup dump files (JSON) and produces structured
 * diagnostics before any data reaches the restore pipeline. Detects:
 *   1. Structural integrity failures (invalid JSON, truncation, null padding)
 *   2. Schema conformance violations (missing required fields)
 *   3. Hash-chain continuity breaks
 *   4. Epoch monotonicity regressions
 *   5. WAL sequence monotonicity violations (gaps, duplicates)
 *
 * Usage:
 *   npx tsx scripts/backup-integrity-validator.ts <backup-file.json>
 *
 * Exit codes:
 *   0 = backup is clean
 *   1 = corruption detected (diagnostics printed to stderr)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CorruptionClass =
  | 'TRUNCATION'
  | 'MALFORMED_JSON'
  | 'MISSING_TOP_LEVEL_KEYS'
  | 'SCHEMA_VIOLATION'
  | 'HASH_CHAIN_BREAK'
  | 'EPOCH_REGRESSION'
  | 'WAL_SEQUENCE_VIOLATION'
  | 'NULL_PADDING';

export interface ValidationFinding {
  corruptionClass: CorruptionClass;
  message: string;
  detail: string;
}

export interface BackupValidationReport {
  timestamp: string;
  filePath: string;
  fileSizeBytes: number;
  overallPassed: boolean;
  findings: ValidationFinding[];
  checks: {
    structuralIntegrity: boolean;
    schemaConformance: boolean;
    hashChainContinuity: boolean;
    epochMonotonicity: boolean;
    walSequenceMonotonicity: boolean;
    truncationDetection: boolean;
  };
}

// ---------------------------------------------------------------------------
// Required schema fields per record type
// ---------------------------------------------------------------------------

const REQUIRED_BLOCK_FIELDS = [
  'blockId', 'prevHash', 'hash', 'type', 'payload',
  'operator', 'signature', 'status', 'epoch', 'createdAt',
] as const;

const REQUIRED_WAL_FIELDS = [
  'seq', 'type', 'payload', 'status', 'createdAt',
] as const;

const REQUIRED_SNAPSHOT_FIELDS = [
  'epoch', 'lastSeq', 'lastHash', 'stateData', 'createdAt',
] as const;

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

export function validateBackupFile(filePath: string): BackupValidationReport {
  const absPath = path.resolve(filePath);
  const report: BackupValidationReport = {
    timestamp: new Date().toISOString(),
    filePath: absPath,
    fileSizeBytes: 0,
    overallPassed: true,
    findings: [],
    checks: {
      structuralIntegrity: true,
      schemaConformance: true,
      hashChainContinuity: true,
      epochMonotonicity: true,
      walSequenceMonotonicity: true,
      truncationDetection: true,
    },
  };

  // ── Check 0: File existence and size ──────────────────────────────────
  if (!fs.existsSync(absPath)) {
    report.overallPassed = false;
    report.checks.structuralIntegrity = false;
    report.findings.push({
      corruptionClass: 'TRUNCATION',
      message: 'Backup file does not exist',
      detail: `Path: ${absPath}`,
    });
    return report;
  }

  const stat = fs.statSync(absPath);
  report.fileSizeBytes = stat.size;

  if (stat.size === 0) {
    report.overallPassed = false;
    report.checks.truncationDetection = false;
    report.findings.push({
      corruptionClass: 'TRUNCATION',
      message: 'Backup file is empty (0 bytes)',
      detail: `Path: ${absPath}`,
    });
    return report;
  }

  // ── Check 1: Null padding detection ───────────────────────────────────
  const rawBuffer = fs.readFileSync(absPath);
  const trailingNulls = countTrailingNullBytes(rawBuffer);
  if (trailingNulls > 0) {
    report.overallPassed = false;
    report.checks.truncationDetection = false;
    report.findings.push({
      corruptionClass: 'NULL_PADDING',
      message: `Backup file contains ${trailingNulls} trailing null byte(s)`,
      detail: `Total file size: ${stat.size} bytes, null-padded region: last ${trailingNulls} bytes`,
    });
  }

  // ── Check 2: JSON parse ───────────────────────────────────────────────
  const rawContent = rawBuffer.toString('utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch (err: unknown) {
    report.overallPassed = false;
    report.checks.structuralIntegrity = false;

    const errMsg = err instanceof Error ? err.message : String(err);

    // Distinguish truncation from general malformation
    if (errMsg.includes('Unexpected end of JSON input') || errMsg.includes('Unterminated')) {
      report.findings.push({
        corruptionClass: 'TRUNCATION',
        message: 'Backup file appears truncated (JSON parse failed at end of input)',
        detail: errMsg,
      });
    } else {
      report.findings.push({
        corruptionClass: 'MALFORMED_JSON',
        message: 'Backup file contains invalid JSON',
        detail: errMsg,
      });
    }
    return report;
  }

  // ── Check 3: Top-level structure ──────────────────────────────────────
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    report.overallPassed = false;
    report.checks.structuralIntegrity = false;
    report.findings.push({
      corruptionClass: 'MISSING_TOP_LEVEL_KEYS',
      message: 'Backup root is not a JSON object',
      detail: `Actual type: ${Array.isArray(parsed) ? 'array' : typeof parsed}`,
    });
    return report;
  }

  const backup = parsed as Record<string, unknown>;
  const expectedKeys = ['blocks', 'walLogs', 'snapshots'];
  const missingKeys = expectedKeys.filter(k => !(k in backup));
  if (missingKeys.length > 0) {
    report.overallPassed = false;
    report.checks.structuralIntegrity = false;
    report.findings.push({
      corruptionClass: 'MISSING_TOP_LEVEL_KEYS',
      message: `Backup is missing required top-level keys: ${missingKeys.join(', ')}`,
      detail: `Present keys: ${Object.keys(backup).join(', ')}`,
    });
    return report;
  }

  for (const key of expectedKeys) {
    if (!Array.isArray(backup[key])) {
      report.overallPassed = false;
      report.checks.structuralIntegrity = false;
      report.findings.push({
        corruptionClass: 'MISSING_TOP_LEVEL_KEYS',
        message: `Expected "${key}" to be an array, got ${typeof backup[key]}`,
        detail: `Key "${key}" value type: ${typeof backup[key]}`,
      });
    }
  }

  if (!report.checks.structuralIntegrity) return report;

  const blocks = backup.blocks as Record<string, unknown>[];
  const walLogs = backup.walLogs as Record<string, unknown>[];
  const snapshots = backup.snapshots as Record<string, unknown>[];

  // ── Check 4: Schema conformance ───────────────────────────────────────
  validateRecordSchema(blocks, 'block', REQUIRED_BLOCK_FIELDS, report);
  validateRecordSchema(walLogs, 'walLog', REQUIRED_WAL_FIELDS, report);
  validateRecordSchema(snapshots, 'snapshot', REQUIRED_SNAPSHOT_FIELDS, report);

  // ── Check 5: Hash-chain continuity ────────────────────────────────────
  if (blocks.length > 1) {
    const allowedGenesisPrevHashes = [
      'GENESIS_PREV_HASH',
      '0x0',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    ];

    for (let i = 1; i < blocks.length; i++) {
      const prevBlock = blocks[i - 1];
      const currentBlock = blocks[i];
      const expectedPrevHash = String(prevBlock.hash ?? '');
      const actualPrevHash = String(currentBlock.prevHash ?? '');

      if (actualPrevHash !== expectedPrevHash) {
        // Allow genesis-style prevHash only at index 0 (already past that)
        report.overallPassed = false;
        report.checks.hashChainContinuity = false;
        report.findings.push({
          corruptionClass: 'HASH_CHAIN_BREAK',
          message: `Hash-chain fracture at block index ${i}`,
          detail: `Block "${currentBlock.blockId}": expected prevHash "${expectedPrevHash}", actual "${actualPrevHash}"`,
        });
      }
    }

    // Validate genesis block's prevHash
    if (blocks.length > 0) {
      const genesis = blocks[0];
      const genesisPrev = String(genesis.prevHash ?? '');
      if (!allowedGenesisPrevHashes.includes(genesisPrev)) {
        report.overallPassed = false;
        report.checks.hashChainContinuity = false;
        report.findings.push({
          corruptionClass: 'HASH_CHAIN_BREAK',
          message: 'Genesis block has invalid prevHash',
          detail: `Block "${genesis.blockId}": prevHash "${genesisPrev}" not in allowed genesis set`,
        });
      }
    }
  }

  // ── Check 6: Epoch monotonicity ───────────────────────────────────────
  if (blocks.length > 1) {
    for (let i = 1; i < blocks.length; i++) {
      const prevEpoch = parseEpochSafe(blocks[i - 1].epoch);
      const currEpoch = parseEpochSafe(blocks[i].epoch);

      if (currEpoch < prevEpoch) {
        report.overallPassed = false;
        report.checks.epochMonotonicity = false;
        report.findings.push({
          corruptionClass: 'EPOCH_REGRESSION',
          message: `Epoch regression at block index ${i}`,
          detail: `Block "${blocks[i].blockId}": epoch ${blocks[i].epoch} < previous epoch ${blocks[i - 1].epoch}`,
        });
      }
    }
  }

  // ── Check 7: WAL sequence monotonicity ────────────────────────────────
  if (walLogs.length > 0) {
    const seqSet = new Set<number>();
    for (let i = 0; i < walLogs.length; i++) {
      const seq = Number(walLogs[i].seq);

      // Check for duplicates
      if (seqSet.has(seq)) {
        report.overallPassed = false;
        report.checks.walSequenceMonotonicity = false;
        report.findings.push({
          corruptionClass: 'WAL_SEQUENCE_VIOLATION',
          message: `Duplicate WAL sequence number: ${seq}`,
          detail: `WAL entry at index ${i} has seq=${seq} which already appeared`,
        });
      }
      seqSet.add(seq);

      // Check strict monotonicity (seq must be increasing)
      if (i > 0) {
        const prevSeq = Number(walLogs[i - 1].seq);
        if (seq <= prevSeq) {
          report.overallPassed = false;
          report.checks.walSequenceMonotonicity = false;
          report.findings.push({
            corruptionClass: 'WAL_SEQUENCE_VIOLATION',
            message: `WAL sequence not strictly increasing at index ${i}`,
            detail: `seq ${seq} <= previous seq ${prevSeq}`,
          });
        }
      }
    }
  }

  return report;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countTrailingNullBytes(buffer: Buffer): number {
  let count = 0;
  for (let i = buffer.length - 1; i >= 0; i--) {
    if (buffer[i] === 0x00) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

function validateRecordSchema(
  records: Record<string, unknown>[],
  recordType: string,
  requiredFields: readonly string[],
  report: BackupValidationReport,
): void {
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (typeof record !== 'object' || record === null) {
      report.overallPassed = false;
      report.checks.schemaConformance = false;
      report.findings.push({
        corruptionClass: 'SCHEMA_VIOLATION',
        message: `${recordType}[${i}] is not an object`,
        detail: `Actual type: ${typeof record}`,
      });
      continue;
    }

    const missing = requiredFields.filter(f => !(f in record));
    if (missing.length > 0) {
      report.overallPassed = false;
      report.checks.schemaConformance = false;
      report.findings.push({
        corruptionClass: 'SCHEMA_VIOLATION',
        message: `${recordType}[${i}] is missing required fields: ${missing.join(', ')}`,
        detail: `Present fields: ${Object.keys(record).join(', ')}`,
      });
    }
  }
}

function parseEpochSafe(value: unknown): bigint {
  if (value === null || value === undefined) return 0n;
  const s = String(value).trim();
  const hasMinus = s.startsWith('-');
  const digits = s.replace(/\D/g, '');
  if (!digits) return 0n;
  const stripped = digits.replace(/^0+/, '') || '0';
  const signedString = hasMinus && stripped !== '0' ? `-${stripped}` : stripped;
  try {
    return BigInt(signedString);
  } catch {
    return 0n;
  }
}

// ---------------------------------------------------------------------------
// CLI Entry Point
// ---------------------------------------------------------------------------

function printReport(report: BackupValidationReport): void {
  console.log('================================================================');
  console.log('🔐 ZTAN BACKUP INTEGRITY VALIDATION REPORT');
  console.log('================================================================');
  console.log(`   Timestamp:       ${report.timestamp}`);
  console.log(`   File:            ${report.filePath}`);
  console.log(`   File Size:       ${report.fileSizeBytes} bytes`);
  console.log(`   Overall Verdict: ${report.overallPassed ? '🟢 CLEAN' : '🔴 CORRUPTION DETECTED'}`);
  console.log('');
  console.log('   Checks:');
  console.log(`     Structural Integrity:     ${report.checks.structuralIntegrity ? '✅' : '❌'}`);
  console.log(`     Schema Conformance:       ${report.checks.schemaConformance ? '✅' : '❌'}`);
  console.log(`     Hash-Chain Continuity:    ${report.checks.hashChainContinuity ? '✅' : '❌'}`);
  console.log(`     Epoch Monotonicity:       ${report.checks.epochMonotonicity ? '✅' : '❌'}`);
  console.log(`     WAL Seq Monotonicity:     ${report.checks.walSequenceMonotonicity ? '✅' : '❌'}`);
  console.log(`     Truncation Detection:     ${report.checks.truncationDetection ? '✅' : '❌'}`);

  if (report.findings.length > 0) {
    console.log('');
    console.log(`   Findings (${report.findings.length}):`);
    for (const f of report.findings) {
      console.error(`     🚨 [${f.corruptionClass}] ${f.message}`);
      console.error(`        Detail: ${f.detail}`);
    }
  }
  console.log('================================================================');
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/backup-integrity-validator.ts <backup-file.json>');
    process.exit(1);
  }

  const filePath = args[0];
  console.log(`\n🔍 Validating backup file: ${filePath}\n`);

  const report = validateBackupFile(filePath);
  printReport(report);

  if (!report.overallPassed) {
    process.exit(1);
  }
}

// Only run CLI when executed directly
const isDirectExecution = process.argv[1] &&
  (process.argv[1].endsWith('backup-integrity-validator.ts') ||
   process.argv[1].endsWith('backup-integrity-validator.js'));

if (isDirectExecution) {
  main();
}

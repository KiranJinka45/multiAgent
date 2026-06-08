/**
 * ZTAN — Backup Corruption & Recovery Integrity Drill
 *
 * End-to-end drill that:
 *   1. Creates a known-good synthetic baseline backup
 *   2. Serializes it to disk
 *   3. Systematically generates 7 corruption classes
 *   4. Runs the backup-integrity-validator against each
 *   5. Asserts all corruptions are detected and properly classified
 *   6. Produces a structured drill report
 *
 * No live database or Docker required.
 *
 * Usage:
 *   npx tsx scripts/backup-corruption-drill.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { validateBackupFile, type BackupValidationReport, type CorruptionClass } from './backup-integrity-validator.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DrillCase {
  name: string;
  filename: string;
  expectedCorruptionClass: CorruptionClass;
  description: string;
}

interface DrillCaseResult {
  name: string;
  filename: string;
  expectedCorruptionClass: CorruptionClass;
  passed: boolean;
  detectedCorruptionClasses: CorruptionClass[];
  validatorReport: BackupValidationReport;
}

interface DrillReport {
  timestamp: string;
  overallPassed: boolean;
  cleanBaselineValid: boolean;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  results: DrillCaseResult[];
}

// ---------------------------------------------------------------------------
// Synthetic Baseline Generator
// ---------------------------------------------------------------------------

function generateCleanBaseline(): object {
  const blocks = [];
  const walLogs = [];
  const snapshots = [];

  // Generate a valid 5-block chain
  let prevHash = 'GENESIS_PREV_HASH';
  for (let i = 0; i < 5; i++) {
    const hash = `0x${(i + 1).toString(16).padStart(64, 'a')}`;
    blocks.push({
      id: i + 1,
      blockId: `canonical-block-${i}`,
      prevHash,
      hash,
      type: i === 0 ? 'GENESIS' : 'TX_BATCH',
      payload: JSON.stringify({ epoch: 0, sequence: i, txCount: i * 3 }),
      operator: i === 0 ? 'ZTAN_SYSTEM' : `ZTAN_OPERATOR_${String.fromCharCode(65 + (i % 3))}`,
      signature: `sig_block_${i}_${hash.slice(2, 10)}`,
      status: 'VERIFIED',
      epoch: '0',
      createdAt: new Date(Date.now() - (5 - i) * 60000).toISOString(),
    });
    prevHash = hash;
  }

  // Generate 5 valid WAL log entries with strictly increasing seq
  for (let i = 0; i < 5; i++) {
    walLogs.push({
      id: i + 1,
      seq: i + 1,
      type: 'OUTBOX_APPEND',
      payload: JSON.stringify({ ref: `block-${i}`, action: 'commit' }),
      status: 'COMMITTED',
      createdAt: new Date(Date.now() - (5 - i) * 60000).toISOString(),
    });
  }

  // Generate 1 valid snapshot
  snapshots.push({
    id: 1,
    epoch: 0,
    lastSeq: 5,
    lastHash: blocks[blocks.length - 1].hash,
    stateData: JSON.stringify({ totalBlocks: 5, integrity: 'nominal' }),
    createdAt: new Date().toISOString(),
  });

  return { blocks, walLogs, snapshots };
}

// ---------------------------------------------------------------------------
// Corruption Generators
// ---------------------------------------------------------------------------

function generateTruncated(baseline: object): string {
  const full = JSON.stringify(baseline, null, 2);
  // Cut at ~60% of the content
  return full.slice(0, Math.floor(full.length * 0.6));
}

function generateMalformedJson(_baseline: object): string {
  // Produce content that is definitively unparseable as JSON
  // We corrupt the opening structure to guarantee JSON.parse fails
  return '{{{ "blocks": INVALID,,, "walLogs": [}], "snapshots": undefined }}}';
}

function generateMissingFields(baseline: object): string {
  const copy = JSON.parse(JSON.stringify(baseline));
  // Remove required fields from the first two blocks
  if (copy.blocks.length > 0) {
    delete copy.blocks[0].hash;
    delete copy.blocks[0].signature;
  }
  if (copy.blocks.length > 1) {
    delete copy.blocks[1].operator;
    delete copy.blocks[1].epoch;
  }
  return JSON.stringify(copy, null, 2);
}

function generateBrokenHashChain(baseline: object): string {
  const copy = JSON.parse(JSON.stringify(baseline));
  // Scramble prevHash values starting at block 2
  if (copy.blocks.length >= 3) {
    copy.blocks[2].prevHash = '0xSCRAMBLED_CORRUPT_HASH_VALUE';
  }
  if (copy.blocks.length >= 4) {
    copy.blocks[3].prevHash = '0xANOTHER_BROKEN_LINK';
  }
  return JSON.stringify(copy, null, 2);
}

function generateEpochRegression(baseline: object): string {
  const copy = JSON.parse(JSON.stringify(baseline));
  // Set increasing epochs, then regress
  if (copy.blocks.length >= 4) {
    copy.blocks[0].epoch = '0';
    copy.blocks[1].epoch = '1';
    copy.blocks[2].epoch = '5';
    copy.blocks[3].epoch = '2'; // Regression!
    if (copy.blocks.length >= 5) {
      copy.blocks[4].epoch = '1'; // Double regression!
    }
    // Fix hash chain to isolate epoch regression as the only issue
    for (let i = 1; i < copy.blocks.length; i++) {
      copy.blocks[i].prevHash = copy.blocks[i - 1].hash;
    }
  }
  return JSON.stringify(copy, null, 2);
}

function generateDuplicateWalSeq(baseline: object): string {
  const copy = JSON.parse(JSON.stringify(baseline));
  // Duplicate WAL seq values
  if (copy.walLogs.length >= 3) {
    copy.walLogs[2].seq = copy.walLogs[1].seq; // Duplicate!
  }
  if (copy.walLogs.length >= 5) {
    copy.walLogs[4].seq = copy.walLogs[3].seq; // Another duplicate!
  }
  return JSON.stringify(copy, null, 2);
}

function generateNullPadded(baseline: object): string {
  const full = JSON.stringify(baseline, null, 2);
  // Append 256 null bytes
  return full + '\0'.repeat(256);
}

// ---------------------------------------------------------------------------
// Drill Execution
// ---------------------------------------------------------------------------

const DRILL_CASES: DrillCase[] = [
  {
    name: 'Truncated File',
    filename: 'drill-backup-truncated.json',
    expectedCorruptionClass: 'TRUNCATION',
    description: 'File cut mid-stream to simulate incomplete backup write',
  },
  {
    name: 'Malformed JSON',
    filename: 'drill-backup-malformed-json.json',
    expectedCorruptionClass: 'MALFORMED_JSON',
    description: 'Invalid JSON syntax injected mid-file',
  },
  {
    name: 'Missing Schema Fields',
    filename: 'drill-backup-missing-fields.json',
    expectedCorruptionClass: 'SCHEMA_VIOLATION',
    description: 'Required block fields removed',
  },
  {
    name: 'Broken Hash Chain',
    filename: 'drill-backup-broken-hash-chain.json',
    expectedCorruptionClass: 'HASH_CHAIN_BREAK',
    description: 'Block prevHash values scrambled to break chain continuity',
  },
  {
    name: 'Epoch Regression',
    filename: 'drill-backup-epoch-regression.json',
    expectedCorruptionClass: 'EPOCH_REGRESSION',
    description: 'Block epochs go backwards violating monotonicity',
  },
  {
    name: 'Duplicate WAL Sequence',
    filename: 'drill-backup-duplicate-wal-seq.json',
    expectedCorruptionClass: 'WAL_SEQUENCE_VIOLATION',
    description: 'WAL logs with duplicate sequence numbers',
  },
  {
    name: 'Null-Padded File',
    filename: 'drill-backup-null-padded.json',
    expectedCorruptionClass: 'NULL_PADDING',
    description: 'Trailing null bytes appended to simulate disk sector corruption',
  },
];

async function main(): Promise<void> {
  console.log('================================================================');
  console.log('🧪 ZTAN BACKUP CORRUPTION & RECOVERY INTEGRITY DRILL');
  console.log('================================================================');
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  console.log(`   Corruption classes under test: ${DRILL_CASES.length}`);
  console.log('');

  const evidenceDir = path.join(process.cwd(), 'evidence');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  // ── Step 1: Generate clean baseline ───────────────────────────────────
  console.log('📦 STEP 1: Generating clean synthetic baseline backup...');
  const baseline = generateCleanBaseline();
  const cleanPath = path.join(evidenceDir, 'drill-backup-clean.json');
  fs.writeFileSync(cleanPath, JSON.stringify(baseline, null, 2), 'utf8');
  console.log(`   ✅ Clean baseline written to: ${cleanPath}`);

  // ── Step 2: Validate clean baseline ───────────────────────────────────
  console.log('\n🔍 STEP 2: Validating clean baseline (should PASS)...');
  const cleanReport = validateBackupFile(cleanPath);
  const cleanBaselineValid = cleanReport.overallPassed;
  if (cleanBaselineValid) {
    console.log('   ✅ Clean baseline passed all validation checks.');
  } else {
    console.error('   ❌ CRITICAL: Clean baseline FAILED validation. Aborting drill.');
    console.error('   Findings:', JSON.stringify(cleanReport.findings, null, 2));
    process.exit(1);
  }

  // ── Step 3: Generate and test corrupted copies ────────────────────────
  console.log('\n🔬 STEP 3: Generating and testing corruption variants...\n');

  const generators: Record<string, (b: object) => string> = {
    'drill-backup-truncated.json': generateTruncated,
    'drill-backup-malformed-json.json': generateMalformedJson,
    'drill-backup-missing-fields.json': generateMissingFields,
    'drill-backup-broken-hash-chain.json': generateBrokenHashChain,
    'drill-backup-epoch-regression.json': generateEpochRegression,
    'drill-backup-duplicate-wal-seq.json': generateDuplicateWalSeq,
    'drill-backup-null-padded.json': generateNullPadded,
  };

  const results: DrillCaseResult[] = [];

  for (const drillCase of DRILL_CASES) {
    console.log(`   ── Case: ${drillCase.name} ──`);
    console.log(`      Description: ${drillCase.description}`);
    console.log(`      Expected class: ${drillCase.expectedCorruptionClass}`);

    const generator = generators[drillCase.filename];
    const corruptContent = generator(baseline);
    const corruptPath = path.join(evidenceDir, drillCase.filename);
    fs.writeFileSync(corruptPath, corruptContent, 'utf8');

    const report = validateBackupFile(corruptPath);
    const detectedClasses = report.findings.map(f => f.corruptionClass);
    const classDetected = detectedClasses.includes(drillCase.expectedCorruptionClass);
    const validatorRejected = !report.overallPassed;

    const passed = classDetected && validatorRejected;

    if (passed) {
      console.log(`      ✅ PASS: Corruption detected [${detectedClasses.join(', ')}]`);
    } else {
      console.error(`      ❌ FAIL: Expected ${drillCase.expectedCorruptionClass}, got [${detectedClasses.join(', ')}]`);
      console.error(`         Validator passed: ${report.overallPassed} (expected: false)`);
    }

    results.push({
      name: drillCase.name,
      filename: drillCase.filename,
      expectedCorruptionClass: drillCase.expectedCorruptionClass,
      passed,
      detectedCorruptionClasses: detectedClasses,
      validatorReport: report,
    });
    console.log('');
  }

  // ── Step 4: Produce drill report ──────────────────────────────────────
  const passedCases = results.filter(r => r.passed).length;
  const failedCases = results.filter(r => !r.passed).length;
  const overallPassed = failedCases === 0 && cleanBaselineValid;

  const drillReport: DrillReport = {
    timestamp: new Date().toISOString(),
    overallPassed,
    cleanBaselineValid,
    totalCases: results.length,
    passedCases,
    failedCases,
    results,
  };

  const reportPath = path.join(evidenceDir, 'backup-corruption-drill-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(drillReport, null, 2), 'utf8');

  // ── Step 5: Clean up corruption artifacts (keep report & clean backup) ─
  console.log('🧹 STEP 4: Cleaning up corruption test files...');
  for (const drillCase of DRILL_CASES) {
    const corruptPath = path.join(evidenceDir, drillCase.filename);
    if (fs.existsSync(corruptPath)) {
      fs.unlinkSync(corruptPath);
    }
  }
  console.log('   ✅ Corruption test files removed. Clean baseline and report retained.');

  // ── Final Verdict ─────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log('🏁 BACKUP CORRUPTION & RECOVERY INTEGRITY DRILL — VERDICT');
  console.log('----------------------------------------------------------------');
  console.log(`   Clean Baseline Valid:      ${cleanBaselineValid ? '✅' : '❌'}`);
  console.log(`   Corruption Cases Tested:   ${results.length}`);
  console.log(`   Corruption Cases Detected: ${passedCases}/${results.length}`);
  console.log(`   Failed Cases:              ${failedCases}`);
  console.log(`   Overall Verdict:           ${overallPassed ? '🟢 ALL CORRUPTION CLASSES DETECTED' : '🔴 DETECTION GAPS FOUND'}`);
  console.log(`   Report Written:            ${reportPath}`);
  console.log('================================================================');

  if (!overallPassed) {
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error('❌ Unhandled fatal error in backup corruption drill:', err);
  process.exit(1);
});

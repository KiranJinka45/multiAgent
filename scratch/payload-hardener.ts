import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { sanitizeAndAttest, GovernanceLedger } from '../packages/utils/src/governance-ledger.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

async function main() {
  console.log('================================================================');
  console.log('🧪 ZTAN PAYLOAD ENCODING HARDENING & PROVENANCE SUITE');
  console.log('================================================================\n');

  const prisma = new PrismaClient();
  const testResults: any[] = [];

  const clearTable = async () => {
    try {
      await prisma.$executeRawUnsafe('TRUNCATE TABLE "ZtanLedgerBlock" RESTART IDENTITY CASCADE;');
      await prisma.$executeRawUnsafe('TRUNCATE TABLE "ZtanPayloadAttestation" RESTART IDENTITY CASCADE;');
      await prisma.$executeRawUnsafe('TRUNCATE TABLE "ZtanQuarantineBlob" RESTART IDENTITY CASCADE;');
    } catch {}
  };

  await clearTable();

  const runTest = async (name: string, rawPayload: string) => {
    const { sanitized, attestation, wasSanitized } = sanitizeAndAttest(rawPayload, "1");
    console.log(`\n⏳ Running Test: [${name}] (Raw Size: ${rawPayload.length} chars, Sanitized: ${sanitized.length} chars)`);
    await clearTable();
    
    let writeSuccess = false;
    let readSuccess = false;
    let attestationOk = false;
    let quarantineOk = false;
    let writeError: any = null;
    let readError: any = null;
    const blockId = 'test-block-boundary';

    try {
      await prisma.$transaction(async (tx) => {
        await tx.ztanLedgerBlock.create({
          data: {
            blockId,
            prevHash: '0x00',
            hash: '0x01',
            type: 'TEST',
            payload: sanitized,
            operator: 'ZTAN-HARDENER',
            signature: 'sig',
            status: 'VERIFIED',
            epoch: '100'
          }
        });

        if (wasSanitized && attestation) {
          await tx.ztanPayloadAttestation.create({
            data: {
              blockId,
              payloadSanitized: true,
              transformations: JSON.stringify(attestation.transformations),
              originalByteLength: attestation.originalByteLength,
              sanitizedByteLength: attestation.sanitizedByteLength,
              sanitizationEpochId: attestation.sanitizationEpochId
            }
          });
          await tx.ztanQuarantineBlob.create({
            data: {
              blockId,
              rawBlob: Buffer.from(rawPayload, 'utf16le').toString('base64')
            }
          });

        }
      });
      writeSuccess = true;
      console.log('   ✔ Transactional Prisma write succeeded.');
    } catch (err: any) {
      writeError = err.message || err;
      console.error('   ❌ Transactional Prisma write FAILED:', writeError);
    }

    if (writeSuccess) {
      try {
        const blocks = await prisma.ztanLedgerBlock.findMany({
          where: { blockId },
          select: { payload: true }
        });
        if (blocks.length > 0) {
          readSuccess = blocks[0].payload === sanitized;
          console.log(`   ✔ Prisma Client read succeeded. Parity match: ${readSuccess}`);
        } else {
          throw new Error('No record found on findMany');
        }

        // Verify Attestation matching
        if (wasSanitized && attestation) {
          const dbAtt = await prisma.ztanPayloadAttestation.findUnique({
            where: { blockId }
          });
          if (dbAtt) {
            const dbTransformations = JSON.parse(dbAtt.transformations);
            attestationOk = dbAtt.payloadSanitized === true &&
                            dbTransformations.length === attestation.transformations.length &&
                            dbAtt.originalByteLength === attestation.originalByteLength &&
                            dbAtt.sanitizedByteLength === attestation.sanitizedByteLength &&
                            dbAtt.sanitizationEpochId === attestation.sanitizationEpochId;
            console.log(`   ✔ Attestation persisted & verified in DB: ${attestationOk} (Transformations: ${dbAtt.transformations})`);
          } else {
            console.error('   ❌ Attestation NOT found in database!');
          }

          const dbQ = await prisma.ztanQuarantineBlob.findUnique({
            where: { blockId }
          });
          if (dbQ) {
            const decodedRaw = Buffer.from(dbQ.rawBlob, 'base64').toString('utf16le');
            quarantineOk = decodedRaw === rawPayload;
            console.log(`   ✔ Raw quarantine blob verified in DB: ${quarantineOk} (Size match: ${decodedRaw.length === rawPayload.length})`);
          } else {
            console.error('   ❌ Quarantine blob NOT found in database!');
          }

        } else {
          attestationOk = true;
          quarantineOk = true;
          console.log('   ✔ No sanitization needed. Attestation and quarantine bypassed as expected.');
        }
      } catch (err: any) {
        readError = err.message || err;
        console.error('   ❌ Verification queries FAILED:', readError);
      }
    }

    testResults.push({
      name,
      wasSanitized,
      writeSuccess,
      readSuccess,
      attestationOk,
      quarantineOk,
      writeError,
      readError
    });
  };

  try {
    // 1. Oversized payloads
    const payload1K = 'A'.repeat(1024);
    await runTest('Oversized 1KB Bound', payload1K);

    const payload100K = 'B'.repeat(100 * 1024);
    await runTest('Oversized 100KB Bound', payload100K);

    // 2. Pathological encoding cases
    const payloadNull = 'ZTAN_PREFIX\u0000ZTAN_SUFFIX_WITH_NULL_BYTES';
    await runTest('Null-byte Ingestion (\\u0000)', payloadNull);

    const payloadSurrogate = 'Invalid Surrogate Pair: \uD800 \uDFFF \uD83D (Isolated)';
    await runTest('Malformed UTF-8 (Isolated Surrogate)', payloadSurrogate);

    const rawBinary = crypto.randomBytes(1024).toString('binary');
    await runTest('Raw Binary Blob Simulated', rawBinary);

    // 3. Unicode normalization drift
    const decomposedUnicode = 'de\u0301ja\u0300 vu'; // "déjà vu" in decomposed NFD form
    await runTest('Unicode Decomposed (NFD) to Canonical (NFC)', decomposedUnicode);

    // 3.5. Quarantine Storage Budget Cap (500 records per partition)
    console.log('\n⏳ Running Test: [Quarantine Storage Budget Cap (500 Limit)]');
    
    // Clear both local files and database
    const LEDGER_DIR = path.join(process.cwd(), '.ztan-transparency');
    if (fs.existsSync(LEDGER_DIR)) {
      fs.rmSync(LEDGER_DIR, { recursive: true, force: true });
    }
    await clearTable();

    // Find correlationId routing to partition 0
    let correlationId = "";
    for (let i = 0; i < 100; i++) {
      const cid = `partition-${i}`;
      if (GovernanceLedger.getPartition("", cid) === 0) {
        correlationId = cid;
        break;
      }
    }

    console.log(`   - Selected correlationId: "${correlationId}" routing to Partition 0`);

    // Let's initialize partition 0 state
    GovernanceLedger.states.set(0, 'ACTIVE');

    // We will append 505 entries containing null-byte sanitization triggers
    console.log('   - Appending 505 sanitized entries...');
    const startAppend = performance.now();
    for (let j = 1; j <= 505; j++) {
      const payload = `payload-data-${j}-\u0000`;
      const correlationMetadata = {
        requestUuid: `req-uuid-${j}`,
        auditUuid: `audit-uuid-${j}`,
        outboxUuid: `outbox-uuid-${j}`,
        ledgerBlockUuid: `ledger-uuid-${j}`
      };
      await GovernanceLedger.appendEntry(
        'TELEMETRY',
        payload,
        'ZTAN-TEST-HARDENER',
        'VERIFIED',
        '100',
        correlationId,
        correlationMetadata
      );
      if (j % 100 === 0) {
        console.log(`     - Appended ${j} entries...`);
      }
    }
    console.log(`   - Append completed in ${((performance.now() - startAppend) / 1000).toFixed(2)}s.`);

    // Verify local ledger partition 0
    const localLedger = GovernanceLedger.loadLedger(0);
    const localQuarantined = localLedger.filter(e => e.quarantineBlob);
    console.log(`   - Local ledger partition 0 total entries: ${localLedger.length}`);
    console.log(`   - Local ledger partition 0 quarantined entries count: ${localQuarantined.length}`);

    // Verify database quarantine blobs for partition 0
    const dbQuarantined = await prisma.ztanQuarantineBlob.findMany({
      select: { blockId: true }
    });
    const minSeq = 1000;
    const maxSeq = 1000000 - 1;
    const partitionDbQuarantined = dbQuarantined.filter((b: any) => {
      const seq = parseInt(b.blockId, 10);
      return !isNaN(seq) && seq >= minSeq && seq <= maxSeq;
    });

    console.log(`   - Database quarantined entries count for partition 0: ${partitionDbQuarantined.length}`);

    const localCapOk = localQuarantined.length === 500;
    const dbCapOk = partitionDbQuarantined.length === 500;
    console.log(`   - Local Budget Cap verified (exactly 500): ${localCapOk ? '🟢 YES' : '🔴 NO'}`);
    console.log(`   - Database Budget Cap verified (exactly 500): ${dbCapOk ? '🟢 YES' : '🔴 NO'}`);

    if (!localCapOk || !dbCapOk) {
      throw new Error(`Quarantine budget cap validation failed. Local: ${localQuarantined.length}, DB: ${partitionDbQuarantined.length}`);
    }

    // 4. Final Verdict Summary
    console.log('\n================================================================');
    console.log('📊 HARDENING & PROVENANCE DRILL COMPARATIVE MATRIX');
    console.log('================================================================');
    console.table(testResults.map(r => ({
      'Test Scenario': r.name,
      'Sanitized?': r.wasSanitized ? '🟢 YES' : '⚪ NO',
      'Write Ok': r.writeSuccess ? '🟢 YES' : '🔴 NO',
      'Read Ok': r.readSuccess ? '🟢 YES' : '🔴 NO',
      'Attestation Ok': r.attestationOk ? '🟢 YES' : '🔴 NO',
      'Quarantine Ok': r.quarantineOk ? '🟢 YES' : '🔴 NO'
    })));

  } catch (err: any) {
    console.error('Fatal crash in testing main:', err);
  } finally {
    GovernanceLedger.stopBackgroundTasks();
    await clearTable();
    await prisma.$disconnect();
  }
}

main();

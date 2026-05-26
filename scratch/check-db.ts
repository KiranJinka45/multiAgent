import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
const prisma = new PrismaClient();

async function main() {
  const blocks = await prisma.ztanLedgerBlock.findMany();
  const walLogs = await prisma.ztanWalLog.findMany();
  const snapshots = await prisma.ztanSnapshot.findMany();
  const attestations = await prisma.ztanPayloadAttestation.findMany();
  const quarantine = await prisma.ztanQuarantineBlob.findMany();

  console.log('BLOCKS COUNT:', blocks.length);
  console.log('WAL LOGS COUNT:', walLogs.length);
  console.log('SNAPSHOTS COUNT:', snapshots.length);
  console.log('ATTESTATIONS COUNT:', attestations.length);
  console.log('QUARANTINE COUNT:', quarantine.length);

  if (blocks.length > 0) {
    console.log('First block:', blocks[0]);
  }
}

main().catch(console.error);

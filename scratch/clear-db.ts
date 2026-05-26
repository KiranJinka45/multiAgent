import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Truncating tables...');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "ZtanLedgerBlock" RESTART IDENTITY CASCADE;');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "ZtanWalLog" RESTART IDENTITY CASCADE;');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "ZtanSnapshot" RESTART IDENTITY CASCADE;');
    console.log('Successfully truncated all tables!');
  } catch (err: any) {
    console.error('Truncation failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const blocks = await prisma.ztanLedgerBlock.findMany({
    orderBy: { id: 'asc' }
  });
  console.log('Total blocks:', blocks.length);
  for (const block of blocks) {
    const num = parseInt(block.blockId, 10);
    if (!block.blockId.startsWith('canonical') && (isNaN(num) || num <= 1010)) {
      console.log(`BlockId: ${block.blockId}, id: ${block.id}, prevHash: ${block.prevHash}, hash: ${block.hash}`);
    }
  }
  await prisma.$disconnect();
}

main().catch(console.error);

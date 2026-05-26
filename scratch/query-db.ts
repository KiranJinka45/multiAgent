import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const total = await prisma.ztanLedgerBlock.count();
    console.log(`Total blocks in DB: ${total}`);
    
    const batchSize = 100;
    for (let offset = 0; offset < total; offset += batchSize) {
      try {
        console.log(`Checking batch: offset=${offset}, limit=${batchSize}...`);
        const res = await prisma.ztanLedgerBlock.findMany({
          skip: offset,
          take: batchSize,
          orderBy: { id: 'asc' },
          select: { id: true, blockId: true, payload: true }
        });
        console.log(`Batch [${offset} - ${offset + res.length}] read successfully.`);
      } catch (err: any) {
        console.error(`🔴 BATCH [${offset} - ${offset + batchSize}] FAILED! Error:`, err.message);
        
        // Pinpoint individual row in this batch
        for (let i = 0; i < batchSize; i++) {
          const rowOffset = offset + i;
          if (rowOffset >= total) break;
          try {
            const single = await prisma.ztanLedgerBlock.findMany({
              skip: rowOffset,
              take: 1,
              orderBy: { id: 'asc' },
              select: { id: true, blockId: true, payload: true }
            });
            if (single.length > 0) {
              console.log(`  ✔ Row offset=${rowOffset} (ID: ${single[0].id}, BlockId: ${single[0].blockId}) ok.`);
            }
          } catch (rowErr: any) {
            console.error(`  ❌ ROW offset=${rowOffset} FAILED! Error:`, rowErr.message);
            // Let's get the raw record info without selecting payload
            try {
              const rawInfo = await prisma.ztanLedgerBlock.findMany({
                skip: rowOffset,
                take: 1,
                orderBy: { id: 'asc' },
                select: { id: true, blockId: true, type: true, status: true }
              });
              console.error(`    Corrupt Row Info:`, rawInfo[0]);
            } catch {}
          }
        }
        break;
      }
    }
  } catch (err: any) {
    console.error('Diagnostic query failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

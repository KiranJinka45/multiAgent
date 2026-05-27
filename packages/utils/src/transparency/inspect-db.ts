import { db } from '@packages/db';

async function main() {
  try {
    const blocks = await db.ztanLedgerBlock.findMany({
      orderBy: { blockId: 'asc' }
    });
    console.log(`Total DB Blocks: ${blocks.length}`);
    for (const b of blocks) {
      const hasTrace = b.payload.includes('CorrelationTrace');
      console.log(` - BlockId: ${b.blockId}, Type: ${b.type}, Status: ${b.status}, HasTrace: ${hasTrace}, Length: ${b.payload.length}`);
    }

    const auditLogs = await db.auditLog.findMany({
      orderBy: { createdAt: 'asc' }
    });
    console.log(`Total Audit Logs: ${auditLogs.length}`);
    for (const a of auditLogs) {
      console.log(` - AuditLog Id: ${a.id}, Action: ${a.action}, Resource: ${a.resource}`);
    }
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await db.$disconnect();
  }
}

main();

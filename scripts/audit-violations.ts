import { db } from '../packages/db/src';

async function auditViolations() {
    console.log('🛡️ AUDITING ENFORCEMENT VIOLATIONS & DISRUPTIONS (DAY 3)...');

    const logs = await db.auditLog.findMany({
        where: {
            OR: [
                { action: { contains: 'ENFORCEMENT' } },
                { action: { contains: 'QUOTA' } },
                { status: 'failure' }
            ]
        },
        orderBy: { createdAt: 'desc' },
        take: 20
    });

    if (logs.length === 0) {
        console.log('✅ No violations or failures detected in the last 20 audit logs.');
    } else {
        console.log(`\n🚨 FOUND ${logs.length} RELEVANT LOG ENTRIES:`);
        logs.forEach(l => {
            console.log(`  [${l.createdAt.toISOString()}] [${l.status.toUpperCase()}] ${l.action.padEnd(25)} | User: ${l.userId || 'N/A'}`);
            if (l.metadata) {
                console.log(`     Data: ${JSON.stringify(l.metadata)}`);
            }
        });
    }

    await db.$disconnect();
}

auditViolations();

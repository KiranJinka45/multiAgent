import { db } from '../packages/db/src';

async function auditQuotas() {
    console.log('📉 AUDITING QUOTAS & ENFORCEMENT (DAY 3)...');

    const tenants = await db.tenant.findMany({
        where: { metadata: { path: ['betaStatus'], equals: 'tester' } },
        include: {
            _count: {
                select: { missions: true }
            }
        }
    });

    console.log('\n📊 QUOTA UTILIZATION:');
    
    let totalViolations = 0;

    for (const tenant of tenants) {
        const usage = tenant._count.missions;
        const quota = tenant.dailyQuota || 0;
        const utilPct = quota > 0 ? (usage / quota) * 100 : 0;
        
        let status = '🟢 OK';
        if (utilPct >= 100) {
            status = '🔴 BLOCKED';
            totalViolations++;
        } else if (utilPct > 80) {
            status = '🟡 WARNING';
        }

        console.log(`  ${status} ${tenant.name.padEnd(30)} | Usage: ${usage}/${quota} (${utilPct.toFixed(1)}%)`);
    }

    console.log('\n' + '═'.repeat(40));
    console.log('🏁 DAY 3 QUOTA REPORT');
    console.log('═'.repeat(40));
    console.log(`📈 Active Tenants:    ${tenants.length}`);
    console.log(`🚫 Quota Hits:       ${totalViolations}`);
    console.log('═'.repeat(40));

    await db.$disconnect();
}

auditQuotas();

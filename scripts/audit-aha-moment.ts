import { db } from '../packages/db/src';

async function auditAhaMoment() {
    console.log('✨ AUDITING THE "AHA!" MOMENT (DAY 2)...');

    const users = await db.user.findMany({
        where: { role: { not: 'admin' } },
        include: {
            sessions: { orderBy: { createdAt: 'asc' }, take: 1 },
            tenant: {
                include: {
                    missions: { orderBy: { createdAt: 'asc' }, take: 1 }
                }
            }
        }
    });

    const results = {
        totalTesters: users.length,
        activated: 0,
        dropOffs: [] as string[],
        ttfsSumMs: 0,
        ttfsCount: 0
    };

    console.log('\n👤 USER BEHAVIOR BREAKDOWN:');

    for (const user of users) {
        const firstSession = user.sessions[0];
        const firstMission = user.tenant?.missions[0];

        if (!firstSession) {
            console.log(`  ⚪ ${user.email}: Never logged in.`);
            continue;
        }

        if (!firstMission) {
            console.log(`  🔴 ${user.email}: Logged in at ${firstSession.createdAt.toISOString()} but NO MISSIONS.`);
            results.dropOffs.push(user.email);
            continue;
        }

        results.activated++;
        const ttfsMs = firstMission.createdAt.getTime() - firstSession.createdAt.getTime();
        results.ttfsSumMs += ttfsMs;
        results.ttfsCount++;

        const ttfsStatus = ttfsMs < 300000 ? '🟢 FAST' : '🟡 SLOW';
        console.log(`  ${ttfsStatus} ${user.email}: TTFS = ${(ttfsMs / 60000).toFixed(1)}m`);
    }

    const avgTTFS = results.ttfsCount > 0 ? (results.ttfsSumMs / results.ttfsCount / 60000).toFixed(1) : 'N/A';
    const activationRate = ((results.activated / results.totalTesters) * 100).toFixed(1);

    console.log('\n' + '═'.repeat(40));
    console.log('🏁 DAY 2 INSIGHTS REPORT');
    console.log('═'.repeat(40));
    console.log(`🚀 Activation Rate: ${activationRate}%`);
    console.log(`⏱️  Average TTFS:    ${avgTTFS} minutes (Target < 5.0m)`);
    console.log(`📉 Drop-offs:       ${results.dropOffs.length} users`);
    if (results.dropOffs.length > 0) {
        console.log(`   → Outreach needed for: ${results.dropOffs.join(', ')}`);
    }
    console.log('═'.repeat(40));

    await db.$disconnect();
}

auditAhaMoment();

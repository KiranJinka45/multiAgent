import { db } from '@packages/db';
import { ProvisioningService } from '../apps/api/src/services/ProvisioningService';

async function bulkProvision() {
    const cohortA = [
        { email: 'alice@example.com', name: 'Alice Builder' },
        { email: 'bob@example.com', name: 'Bob Engineer' },
        { email: 'charlie@example.com', name: 'Charlie Dev' },
        { email: 'dana@example.com', name: 'Dana Architect' },
        { email: 'eve@example.com', name: 'Eve Researcher' }
    ];

    console.log(`🚀 PROVISIONING BETA COHORT A (${cohortA.length} users)`);

    for (const p of cohortA) {
        console.log(`\n🔹 Processing ${p.email}...`);
        try {
            let user = await db.user.findUnique({ where: { email: p.email } });
            if (!user) {
                user = await db.user.create({
                    data: { email: p.email, name: p.name, role: 'viewer' }
                });
            }

            const { tenant, org } = await ProvisioningService.provisionTenant(`${p.name}'s Beta Org`, user.id);
            
            await db.tenant.update({
                where: { id: tenant.id },
                data: { 
                    dailyQuota: 50,
                    metadata: { tier: 'pro', betaStatus: 'tester', cohort: 'A' }
                }
            });
            console.log(`   ✅ SUCCESS: Tenant ${tenant.id}`);
        } catch (err: any) {
            console.error(`   ❌ FAILED: ${err.message}`);
        }
    }

    await db.$disconnect();
    console.log('\n🏁 Cohort A Provisioning Complete.');
}

bulkProvision();

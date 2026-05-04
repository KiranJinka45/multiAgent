import { db } from '../packages/db/src';
import { ProvisioningService } from '../apps/api/src/services/ProvisioningService';

async function bulkProvision() {
    const cohortB = [
        { email: 'frank@dev.com', name: 'Frank Dev' },
        { email: 'grace@code.com', name: 'Grace Architect' },
        { email: 'heidi@git.com', name: 'Heidi Engineer' },
        { email: 'ivan@cloud.com', name: 'Ivan Ops' },
        { email: 'judy@test.com', name: 'Judy QA' }
    ];

    console.log(`🚀 PROVISIONING BETA COHORT B (${cohortB.length} users)`);

    for (const p of cohortB) {
        console.log(`\n🔹 Processing ${p.email}...`);
        try {
            let user = await db.user.findUnique({ where: { email: p.email } });
            if (!user) {
                user = await db.user.create({
                    data: { email: p.email, name: p.name, role: 'viewer' }
                });
            }

            const { tenant, org } = await ProvisioningService.provisionTenant(`${p.name}'s Dev Org`, user.id);
            
            await db.tenant.update({
                where: { id: tenant.id },
                data: { 
                    dailyQuota: 50,
                    metadata: { tier: 'pro', betaStatus: 'tester', cohort: 'B' }
                }
            });
            console.log(`   ✅ SUCCESS: Tenant ${tenant.id}`);
        } catch (err: any) {
            console.error(`   ❌ FAILED: ${err.message}`);
        }
    }

    await db.$disconnect();
    console.log('\n🏁 Cohort B Provisioning Complete.');
}

bulkProvision();

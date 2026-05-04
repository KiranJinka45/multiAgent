import { db } from '@packages/db';
import { ProvisioningService } from '../apps/api/src/services/ProvisioningService';
import { logger } from '@packages/observability';

async function provisionBetaUser(email: string, name: string) {
    console.log(`🚀 PROVISIONING BETA USER: ${email} (${name})`);
    
    try {
        // 1. Find or create user
        let user = await db.user.findUnique({ where: { email } });
        
        if (!user) {
            console.log(`Creating new user account...`);
            user = await db.user.create({
                data: {
                    email,
                    name,
                    role: 'viewer'
                }
            });
        }

        // 2. Provision "Pro" tier environment for Beta
        console.log(`Provisioning 'Pro' tier environment (50 missions/day)...`);
        const { tenant, org } = await ProvisioningService.provisionTenant(`${name}'s Beta Org`, user.id);
        
        // Upgrade quota to Pro (Beta Gift)
        await db.tenant.update({
            where: { id: tenant.id },
            data: { 
                dailyQuota: 50,
                metadata: {
                    ...(tenant.metadata as any),
                    tier: 'pro',
                    betaStatus: 'tester',
                    provisionedBy: 'admin-cli'
                }
            }
        });

        console.log(`✅ SUCCESS!`);
        console.log(`   User ID:   ${user.id}`);
        console.log(`   Tenant ID: ${tenant.id}`);
        console.log(`   Org ID:    ${org.id}`);
        console.log(`   Quota:     50 Missions / Day`);
        
    } catch (err) {
        console.error(`❌ FAILED:`, err);
    } finally {
        await db.$disconnect();
    }
}

// CLI Entrypoint
const email = process.argv[2];
const name = process.argv[3];

if (!email || !name) {
    console.log('Usage: npx tsx scripts/provision-beta-user.ts <email> <name>');
    process.exit(1);
}

provisionBetaUser(email, name);

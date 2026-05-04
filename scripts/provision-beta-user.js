"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("@packages/db");
const ProvisioningService_1 = require("../apps/api/src/services/ProvisioningService");
async function provisionBetaUser(email, name) {
    console.log(`🚀 PROVISIONING BETA USER: ${email} (${name})`);
    try {
        // 1. Find or create user
        let user = await db_1.db.user.findUnique({ where: { email } });
        if (!user) {
            console.log(`Creating new user account...`);
            user = await db_1.db.user.create({
                data: {
                    email,
                    name,
                    role: 'viewer'
                }
            });
        }
        // 2. Provision "Pro" tier environment for Beta
        console.log(`Provisioning 'Pro' tier environment (50 missions/day)...`);
        const { tenant, org } = await ProvisioningService_1.ProvisioningService.provisionTenant(`${name}'s Beta Org`, user.id);
        // Upgrade quota to Pro (Beta Gift)
        await db_1.db.tenant.update({
            where: { id: tenant.id },
            data: {
                dailyQuota: 50,
                metadata: {
                    ...tenant.metadata,
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
    }
    catch (err) {
        console.error(`❌ FAILED:`, err);
    }
    finally {
        await db_1.db.$disconnect();
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
//# sourceMappingURL=provision-beta-user.js.map
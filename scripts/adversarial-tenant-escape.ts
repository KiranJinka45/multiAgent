import { PrismaClient } from '@prisma/client';
import { createTenantClient } from '../packages/db/src/rls-client.js';

/**
 * ZTAN PHASE 14 TIER P0: ADVERSARIAL TENANT ESCAPE DRILL
 * 
 * Simulates a catastrophic application logic failure where a developer
 * forgets to add `where: { tenantId }` to a database query.
 * Proves that PostgreSQL RLS natively blocks the data leak.
 */

const basePrisma = new PrismaClient();

async function runAdversarialDrill() {
    console.log('================================================================');
    console.log('👿 ADVERSARIAL DRILL: CROSS-TENANT MEMORY ESCAPE');
    console.log('================================================================\n');

    const tenantA = 'tenant-alice-escape-' + Date.now();
    const tenantB = 'tenant-bob-escape-' + Date.now();

    // 1. Seed global state (Bypassing RLS as a superuser/system-admin)
    const systemPrisma = createTenantClient(basePrisma, 'system-admin');
    
    console.log(`   [Setup] Seeding data for ${tenantA} and ${tenantB}...`);
    await systemPrisma.tenant.createMany({
        data: [
            { id: tenantA, name: 'Alice Corp' },
            { id: tenantB, name: 'Bob Inc' }
        ]
    });

    await systemPrisma.project.create({
        data: { name: 'Alice Top Secret Code', tenantId: tenantA }
    });
    
    await systemPrisma.project.create({
        data: { name: 'Bob Financial Records', tenantId: tenantB }
    });

    // 2. The Adversarial Test
    console.log(`\n   [Attack] Simulating vulnerable API route for Alice...`);
    console.log(`   [Attack] Executing: prisma.project.findMany() // MISSING 'where: { tenantId }'`);

    // Connect using the restricted application user to ensure Postgres enforces RLS
    // (Superusers bypass RLS by design in Postgres)
    const dbUrl = new URL(process.env.DATABASE_URL!);
    dbUrl.username = 'ztan_app_user';
    dbUrl.password = 'app_password';
    const appPrisma = new PrismaClient({
        datasources: {
            db: {
                url: dbUrl.toString()
            }
        }
    });

    // Alice's authenticated database client
    const alicePrisma = createTenantClient(appPrisma, tenantA);

    // Alice queries ALL projects (vulnerability)
    const leakedProjects = await alicePrisma.project.findMany();

    console.log(`\n   [Result] Projects returned to Alice: ${leakedProjects.length}`);
    leakedProjects.forEach(p => console.log(`      - ${p.name} (Tenant: ${p.tenantId})`));

    // 3. Verification
    const hasBobData = leakedProjects.some(p => p.tenantId === tenantB);

    if (hasBobData) {
        console.error(`\n❌ CATASTROPHIC FAILURE: Tenant escape succeeded! Alice stole Bob's data.`);
        process.exit(1);
    } else if (leakedProjects.length === 1 && leakedProjects[0].tenantId === tenantA) {
        console.log(`\n✅ MECHANICAL TRUST VERIFIED: PostgreSQL RLS silently filtered out Bob's data.`);
        console.log(`✅ Tenant Escape Blocked. The platform is secure despite the application vulnerability.`);
    } else {
        console.error(`\n❌ UNEXPECTED STATE: Returned ${leakedProjects.length} rows.`);
        process.exit(1);
    }
}

runAdversarialDrill().catch(err => {
    console.error(`❌ Drill crashed: ${err.message}`);
    process.exit(1);
}).finally(() => {
    basePrisma.$disconnect();
});

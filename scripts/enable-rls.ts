import { PrismaClient } from '@prisma/client';

/**
 * ZTAN PHASE 14 TIER P0: MECHANICAL DATABASE ISOLATION
 * 
 * Enforces strict Row-Level Security (RLS) on all tenant-scoped tables.
 * This guarantees that even if the application layer has a bug (e.g. missing WHERE clause),
 * the database itself will physically block cross-tenant memory bleeds.
 */

const prisma = new PrismaClient();

const tenantTables = [
    'User',
    'Project',
    'Mission',
    'Agent',
    'AuditLog',
    'ExecutionLog',
    'Event',
    'Subscription',
    'IntelligencePolicy',
    'IntelligenceROI'
];

async function enableRLS() {
    console.log('================================================================');
    console.log('🛡️  MECHANICAL TRUST: ENABLING POSTGRESQL ROW-LEVEL SECURITY');
    console.log('================================================================\n');

    // Create a non-superuser role for the application to enforce RLS
    // (Postgres superusers bypass RLS entirely)
    try {
        await prisma.$executeRawUnsafe(`DROP ROLE IF EXISTS ztan_app_user;`);
        await prisma.$executeRawUnsafe(`CREATE ROLE ztan_app_user WITH LOGIN PASSWORD 'app_password';`);
        await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO ztan_app_user;`);
        console.log('   [Setup] Created restricted application role: ztan_app_user');
    } catch (e: any) {
        console.log(`   [Setup] Role creation notice: ${e.message}`);
    }

    for (const table of tenantTables) {
        console.log(`   [RLS] Securing table: "${table}"`);
        
        // 1. Enable Row-Level Security
        await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
        
        // 2. Drop existing policies to ensure idempotency
        await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "tenant_isolation_policy" ON "${table}";`);

        // 3. Create strict Tenant Boundary Policy
        // Allow access IF:
        //   a) The row's tenantId matches the session's app.current_tenant_id
        //   b) The session is acting as 'system-admin'
        //   c) The row is globally scoped (tenantId IS NULL)
        await prisma.$executeRawUnsafe(`
            CREATE POLICY "tenant_isolation_policy" ON "${table}"
            FOR ALL
            USING (
                "tenantId" = current_setting('app.current_tenant_id', true)
                OR current_setting('app.current_tenant_id', true) = 'system-admin'
                OR "tenantId" IS NULL
            );
        `);

        await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`);

        // Grant permissions to the restricted user
        await prisma.$executeRawUnsafe(`GRANT ALL PRIVILEGES ON TABLE "${table}" TO ztan_app_user;`);
    }

    // Grant usage on sequences if there are auto-incrementing IDs
    try {
        await prisma.$executeRawUnsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ztan_app_user;`);
    } catch(e) {}

    console.log('\n✅ PostgreSQL RLS successfully enabled on all tenant boundaries.');
}

enableRLS().catch(err => {
    console.error(`❌ Failed to enable RLS: ${err.message}`);
    process.exit(1);
}).finally(() => {
    prisma.$disconnect();
});

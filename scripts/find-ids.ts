import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function run() {
    try {
        let tenant = await db.tenant.findFirst();
        if (!tenant) {
            tenant = await db.tenant.create({
                data: {
                    id: 'tenant-1',
                    name: 'Default Tenant'
                }
            });
        }
        console.log('Sample Tenant ID:', tenant?.id);

        let user = await db.user.findFirst();
        if (!user) {
            user = await db.user.create({
                data: {
                    email: 'sre@test.com',
                    name: 'SRE Bot',
                    tenantId: tenant.id
                }
            });
        }
        console.log('Sample User ID:', user?.id);

        let project = await db.project.findFirst();
        if (!project) {
            project = await db.project.create({
                data: {
                    name: 'chaos-project',
                    description: 'Automated resilience testing',
                    tenantId: tenant.id
                }
            });
        }
        console.log('Sample Project ID:', project?.id);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await db.$disconnect();
    }
}
run();

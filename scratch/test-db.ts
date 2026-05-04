import { PrismaClient } from '@prisma/client';

async function test() {
    const passwords = ['', 'postgres', 'password', 'admin', 'root'];
    for (const pw of passwords) {
        const url = pw ? `postgresql://postgres:${pw}@localhost:54399/multiagent` : `postgresql://postgres@localhost:54399/multiagent`;
        console.log(`Testing: ${url}`);
        const prisma = new PrismaClient({
            datasources: { db: { url } }
        });
        try {
            await prisma.$queryRaw`SELECT 1`;
            console.log(`✅ SUCCESS with password: ${pw}`);
            process.exit(0);
        } catch (err: any) {
            console.log(`❌ FAILED:`);
            console.dir(err, { depth: null });
        } finally {
            await prisma.$disconnect();
        }
    }
}

test();

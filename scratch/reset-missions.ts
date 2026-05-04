import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function reset() {
    const result = await db.mission.updateMany({
        where: {
            id: { startsWith: 'mission-integrity-' }
        },
        data: {
            status: 'queued',
            updatedAt: new Date(Date.now() - 70000) // Force it to be stale
        }
    });
    console.log(`Reset ${result.count} missions to queued.`);
}

reset().catch(console.error).finally(() => process.exit(0));

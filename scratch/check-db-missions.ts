import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function check() {
    const missions = await db.mission.findMany({
        where: {
            id: { startsWith: 'mission-integrity-' }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
    });
    
    console.log('Missions:');
    missions.forEach(m => {
        console.log(`- ${m.id}: ${m.status}`);
    });
}

check().catch(console.error).finally(() => process.exit(0));

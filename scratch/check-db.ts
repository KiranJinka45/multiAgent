import { db } from '@packages/utils';

async function check() {
    const counts = await db.mission.groupBy({
        by: ['status'],
        _count: true
    });
    console.log('Mission Status Counts:', JSON.stringify(counts, null, 2));
    
    const latest = await db.mission.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' }
    });
    console.log('Latest Missions:', JSON.stringify(latest, null, 2));
}

check().catch(console.error).finally(() => process.exit(0));

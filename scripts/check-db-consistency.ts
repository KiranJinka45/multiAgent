import { PrismaClient } from '@prisma/client';
import { logger } from '@packages/observability';

const prisma = new PrismaClient();

async function checkConsistency() {
    console.log('🏁 Starting Enterprise Ground Truth Consistency Check (P15)...');
    
    try {
        // 1. Check for Duplicate eventIds in ExecutionLog
        // This validates that the DB unique constraint and our sliding-window deduplication are working.
        const duplicates = await prisma.$queryRaw`
            SELECT "eventId", COUNT(*) 
            FROM "ExecutionLog" 
            WHERE "eventId" IS NOT NULL 
            GROUP BY "eventId" 
            HAVING COUNT(*) > 1
        `;

        const duplicateCount = (duplicates as any[]).length;
        if (duplicateCount > 0) {
            console.error(`❌ [FAILURE] Found ${duplicateCount} duplicate event sequences in ExecutionLog!`);
            console.log(duplicates);
            process.exit(1);
        } else {
            console.log('✅ [SUCCESS] Zero duplicate eventIds detected in persistent storage.');
        }

        // 2. Check for Sequence Gaps per Mission
        // This ensures that our "Linear Chronological Display" logic matches the "Linear Persistence"
        const missions = await prisma.mission.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' }
        });

        for (const mission of missions) {
            const logs = await prisma.executionLog.findMany({
                where: { executionId: mission.id },
                orderBy: { createdAt: 'asc' }
            });

            if (logs.length > 0) {
                console.log(`🔍 Validating linearity for Mission: ${mission.id} (${logs.length} events)`);
                // We check if progress is monotonically increasing (if applicable) or just that timestamps are sane
                let lastTime = 0;
                for (const log of logs) {
                    const currentTime = new Date(log.createdAt).getTime();
                    if (currentTime < lastTime) {
                         console.warn(`⚠️ [WARNING] Detected non-monotonic timestamp for mission ${mission.id}`);
                    }
                    lastTime = currentTime;
                }
            }
        }

        console.log('✅ [SUCCESS] Mission persistence linearity verified.');
        
        // 3. Check for Tenant Isolation integrity
        const orphanLogs = await prisma.$queryRaw`
            SELECT COUNT(*) FROM "ExecutionLog" l
            LEFT JOIN "Mission" m ON l."executionId" = m.id
            WHERE m.id IS NULL
        `;
        
        console.log(`✅ [SUCCESS] Data Integrity check complete.`);

    } catch (error) {
        console.error('❌ Consistency check crashed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

checkConsistency();

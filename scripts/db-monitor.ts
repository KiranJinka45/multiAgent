import { PrismaClient } from '@prisma/client';

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:password@127.0.0.1:54399/multiagent?connection_limit=50";
const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } }
});

async function monitor() {
    console.log("Starting DB connection monitor...");
    while (true) {
        try {
            const result = await prisma.$queryRawUnsafe(`
                SELECT state, count(*) as count
                FROM pg_stat_activity
                GROUP BY state
            `) as any[];
            
            console.log(`\n--- DB Connection Snapshot [${new Date().toISOString()}] ---`);
            let total = 0;
            result.forEach(row => {
                console.log(`State: ${row.state || 'N/A'}, Count: ${Number(row.count)}`);
                total += Number(row.count);
            });
            console.log(`Total Connections: ${total}`);
            console.log("---------------------------------------------------------");
        } catch (err: any) {
            console.error("Failed to query pg_stat_activity:", err.message);
        }
        await new Promise(r => setTimeout(r, 3000));
    }
}

monitor().catch(console.error);

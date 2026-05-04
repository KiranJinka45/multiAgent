import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function run() {
    try {
        const count = await db.mission.count();
        console.log('Mission Count:', count);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await db.$disconnect();
    }
}
run();

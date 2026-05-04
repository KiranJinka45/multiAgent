"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("@packages/db");
async function simulateBetaMission(email) {
    console.log(`🧪 SIMULATING SUCCESSFUL MISSION FOR: ${email}`);
    try {
        const user = await db_1.db.user.findUnique({
            where: { email },
            include: { tenant: true }
        });
        if (!user || !user.tenant) {
            console.error('User or Tenant not found');
            return;
        }
        // Simulate a mission 4 minutes after tenant creation (TTFS test)
        const tenantCreatedAt = user.tenant.createdAt;
        const missionCreatedAt = new Date(tenantCreatedAt.getTime() + 4 * 60 * 1000); // 4m later
        const mission = await db_1.db.mission.create({
            data: {
                title: 'Beta Simulation Mission #1',
                status: 'complete',
                progress: 100,
                type: 'optimization',
                tenantId: user.tenant.id,
                createdAt: missionCreatedAt,
                updatedAt: missionCreatedAt,
                computeDurationMs: 12000,
                totalCostUsd: 0.50, // Revenue
                internalOptimizationCost: 0.10, // System Cost
                margin: 0.40, // Profit
            }
        });
        console.log(`✅ MISSION SIMULATED!`);
        console.log(`   Mission ID: ${mission.id}`);
        console.log(`   TTFS:       4.0 minutes (Simulated)`);
        console.log(`   Profit:     $0.40`);
    }
    catch (err) {
        console.error('❌ SIMULATION FAILED:', err);
    }
    finally {
        await db_1.db.$disconnect();
    }
}
const email = process.argv[2];
if (!email) {
    console.log('Usage: npx tsx scripts/simulate-beta-mission.ts <email>');
    process.exit(1);
}
simulateBetaMission(email);
//# sourceMappingURL=simulate-beta-mission.js.map
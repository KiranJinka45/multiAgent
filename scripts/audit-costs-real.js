"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const src_1 = require("../packages/db/src");
async function main() {
    console.log('\n--- MultiAgent REAL FinOps Audit (Postgres Data) ---');
    try {
        const usageLogs = await src_1.db.aiUsageLog.findMany();
        if (usageLogs.length === 0) {
            console.log('⚠️ No AI usage logs found. System has not processed real builds yet.');
            return;
        }
        const totalCost = usageLogs.reduce((acc, log) => acc + log.cost, 0);
        const totalTokens = usageLogs.reduce((acc, log) => acc + log.totalTokens, 0);
        const avgCostPerCall = totalCost / usageLogs.length;
        console.log(`Total LLM Calls: ${usageLogs.length}`);
        console.log(`Total Tokens: ${totalTokens.toLocaleString()}`);
        console.log(`Total Aggregated Cost: $${totalCost.toFixed(4)}`);
        console.log(`Average Cost per Agent Invocation: $${avgCostPerCall.toFixed(6)}`);
        console.log('\n--- Breakdown by Model ---');
        const modelStats = await src_1.db.aiUsageLog.groupBy({
            by: ['model'],
            _count: { _all: true },
            _sum: { cost: true, totalTokens: true }
        });
        modelStats.forEach(stat => {
            console.log(`- ${stat.model}: ${stat._count._all} calls | Cost: $${(stat._sum.cost || 0).toFixed(4)} | Tokens: ${stat._sum.totalTokens}`);
        });
        console.log('\n--- Realistic Margin Analysis ---');
        const PRICING_TIERS = [2000, 4000, 8000]; // INR
        const INFRA_FIXED_COST_MONTHLY = 50; // USD (DB + Redis + Gateway)
        PRICING_TIERS.forEach(tier => {
            const revenueUSD = tier / 84;
            // Assuming 10 runs per user/month and 100 users for infra amortization
            const infraPerUser = INFRA_FIXED_COST_MONTHLY / 100;
            const variableCost = avgCostPerCall * 15; // Assuming 15 agent calls per full build
            const totalMonthlyCostPerUser = (variableCost * 10) + infraPerUser;
            const margin = ((revenueUSD - totalMonthlyCostPerUser) / revenueUSD) * 100;
            console.log(`Tier ₹${tier} | Real Margin: ${margin.toFixed(2)}% (includes infra + real tokens)`);
        });
    }
    catch (err) {
        console.error('Audit failed:', err);
    }
    finally {
        await src_1.db.$disconnect();
    }
}
main();
//# sourceMappingURL=audit-costs-real.js.map
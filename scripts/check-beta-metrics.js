"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const roi_1 = require("../packages/self-evolution/src/roi");
const db_1 = require("@packages/db");
async function checkBetaMetrics() {
    console.log('📊 FETCHING GLOBAL BETA METRICS...');
    try {
        const metrics = await roi_1.ROITracker.getMetrics('platform-admin');
        console.log('--- DASHBOARD STATE ---');
        console.log(`Activation Rate: ${metrics?.activationRate.toFixed(1)}%`);
        console.log(`Avg TTFS:        ${metrics?.avgTimeToFirstSuccess.toFixed(1)} minutes`);
        console.log(`Churn Risk:      ${metrics?.churnRisk.toFixed(1)}%`);
        console.log(`Profitability:   $${metrics?.profitability.toFixed(2)}`);
    }
    catch (err) {
        console.error('Failed to fetch metrics:', err);
    }
    finally {
        await db_1.db.$disconnect();
    }
}
checkBetaMetrics();
//# sourceMappingURL=check-beta-metrics.js.map
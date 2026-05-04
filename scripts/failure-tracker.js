"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const src_1 = require("../packages/db/src");
async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║   PRINCIPAL AUDITOR: FAILURE TRACKER & ROADMAP         ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    try {
        const failures = await src_1.db.executionLog.findMany({
            where: { success: false },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        if (failures.length === 0) {
            console.log('✨ No recent failures detected. (0% Failure Rate in the last 24h?)');
            console.log('   Warning: Check if telemetry is properly connected.');
            return;
        }
        console.log('RECENT SYSTEM FAILURES (TRUE ROADMAP):');
        console.log('------------------------------------------------------------');
        failures.forEach((f, i) => {
            const error = f.output?.error || 'Unknown Error';
            console.log(`${i + 1}. [${f.createdAt.toISOString()}]`);
            console.log(`   Task:   ${f.taskType}`);
            console.log(`   Cause:  ${error}`);
            console.log(`   Latency: ${f.latency}ms`);
            console.log('------------------------------------------------------------');
        });
        // Failure Frequency Analysis
        const frequency = await src_1.db.executionLog.groupBy({
            by: ['taskType'],
            where: { success: false },
            _count: { _all: true }
        });
        console.log('\n--- Failure Frequency ---');
        frequency.forEach(stat => {
            console.log(`- ${stat.taskType}: ${stat._count._all} failures`);
        });
    }
    catch (err) {
        console.error('Failure tracking failed:', err);
    }
    finally {
        await src_1.db.$disconnect();
    }
}
main();
//# sourceMappingURL=failure-tracker.js.map
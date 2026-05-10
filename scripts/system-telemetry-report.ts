import 'dotenv/config';
import { db } from '@packages/db';
import { ReliabilityMonitor } from '../apps/api/src/services/reliability-monitor';
import { redis } from '@packages/shared-services';

/**
 * 🛡️ SYSTEM TELEMETRY AUDIT REPORT
 * 
 * Aggregates RI (Reliability Index) from Redis and ASS (Agent Success Score)
 * from Postgres to determine overall platform readiness.
 */
async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║   PRINCIPAL AUDITOR: TRUE READINESS SCORECARD           ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    try {
        // 1. Reliability Index (RI) - From Redis Stats
        console.log("[DEBUG] Fetching Reliability Stats...");
        const stats = await ReliabilityMonitor.getStats();
        console.log("[DEBUG] Reliability Stats fetched:", stats);
        
        const buildsStarted = stats.totalBuilds;
        const buildsSuccess = stats.successfulBuilds;
        const buildsFailure = stats.failedBuilds;

        const ri = buildsStarted > 0 ? (buildsSuccess / buildsStarted) * 100 : 0;

        console.log(`--- Reliability Index (RI) ---`);
        console.log(`Total Builds Attempted: ${buildsStarted}`);
        console.log(`Total Builds Success:   ${buildsSuccess}`);
        console.log(`Total Builds Failure:   ${buildsFailure}`);
        console.log(`TRUE RI:                ${ri.toFixed(2)}%`);

        // 2. Agent Success Score (ASS) - From Postgres ExecutionLog
        console.log("[DEBUG] Fetching Execution Logs from DB...");
        const executionLogs = await db.executionLog.groupBy({
            by: ['status'],
            _count: { status: true }
        });
        console.log("[DEBUG] Execution Logs fetched:", executionLogs);

        let successTasks = 0;
        let totalTasks = 0;

        executionLogs.forEach(group => {
            totalTasks += group._count.status;
            if (group.status === 'completed' || group.status === 'success') {
                successTasks += group._count.status;
            }
        });

        const ass = totalTasks > 0 ? (successTasks / totalTasks) * 100 : 0;

        console.log(`\n--- Agent Success Score (ASS) ---`);
        console.log(`Total Agent Tasks:      ${totalTasks}`);
        console.log(`Successful Agent Tasks: ${successTasks}`);
        console.log(`TRUE ASS:               ${ass.toFixed(2)}%`);

        // 3. System Health Matrix
        console.log("[DEBUG] Fetching Proposed Changes from DB...");
        const proposedChanges = await db.proposedChange.count();
        console.log("[DEBUG] Proposed Changes fetched:", proposedChanges);

        console.log("[DEBUG] Fetching Audit Logs from DB...");
        const auditLogs = await db.auditLog.count();
        console.log("[DEBUG] Audit Logs fetched:", auditLogs);

        // 4. Latency Audit
        console.log("[DEBUG] Fetching Latency data from DB...");
        const avgLatency = await db.executionLog.aggregate({
            _avg: { latency: true }
        });
        console.log("[DEBUG] Latency data fetched:", avgLatency);

        console.log(`\n--- Performance Audit ---`);
        console.log(`Average Latency per Task: ${(avgLatency._avg.latency || 0).toFixed(2)}ms`);

        // 5. Overall Readiness %
        // Weighted: 40% Architecture/Env (Assume 95% based on previous audit), 30% RI, 30% ASS
        const archScore = 95; 
        const trueReadiness = (archScore * 0.4) + (ri * 0.3) + (ass * 0.3);

        console.log(`\n╔══════════════════════════════════════════════════════════╗`);
        console.log(`║   COMBINED PRODUCTION READINESS: ${trueReadiness.toFixed(2)}%`.padEnd(58) + '║');
        console.log('╚══════════════════════════════════════════════════════════╝\n');

        if (trueReadiness < 90) {
            console.log('❌ STATUS: AT RISK. DO NOT DEPLOY TO PRODUCTION.');
            console.log('   Reason: True telemetry shows performance below production-grade thresholds.');
        } else {
            console.log('✅ STATUS: OPERATIONAL. Ready for limited Alpha rollout.');
        }

    } catch (err) {
        console.error('Telemetry report failed:', err);
    } finally {
        await db.$disconnect();
        await redis.quit();
    }
}

main();

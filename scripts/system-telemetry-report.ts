import 'dotenv/config';
import { db } from '../packages/db/src';
import { ReliabilityMonitor } from '../packages/utils/src/services/reliability-monitor';
import { redis } from '../packages/utils/src/services/redis';

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║   PRINCIPAL AUDITOR: TRUE READINESS SCORECARD           ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    try {
        // 1. Reliability Index (RI) - From Redis Stats
        const stats = await ReliabilityMonitor.getStats();
        const buildsStarted = parseInt(stats.builds_started || '0');
        const buildsSuccess = parseInt(stats.builds_success || '0');
        const buildsFailure = parseInt(stats.builds_failure || '0');

        const ri = buildsStarted > 0 ? (buildsSuccess / buildsStarted) * 100 : 0;

        console.log(`--- Reliability Index (RI) ---`);
        console.log(`Total Builds Attempted: ${buildsStarted}`);
        console.log(`Total Builds Success:   ${buildsSuccess}`);
        console.log(`Total Builds Failure:   ${buildsFailure}`);
        console.log(`TRUE RI:                ${ri.toFixed(2)}%`);

        // 2. Agent Success Score (ASS) - From Postgres ExecutionLog
        const executionLogs = await db.executionLog.groupBy({
            by: ['success'],
            _count: { success: true }
        });

        let successTasks = 0;
        let totalTasks = 0;

        executionLogs.forEach(group => {
            totalTasks += group._count.success;
            if (group.success) successTasks += group._count.success;
        });

        const ass = totalTasks > 0 ? (successTasks / totalTasks) * 100 : 0;

        console.log(`\n--- Agent Success Score (ASS) ---`);
        console.log(`Total Agent Tasks:      ${totalTasks}`);
        console.log(`Successful Agent Tasks: ${successTasks}`);
        console.log(`TRUE ASS:               ${ass.toFixed(2)}%`);

        // 3. Latency Audit
        const avgLatency = await db.executionLog.aggregate({
            _avg: { latency: true }
        });

        console.log(`\n--- Performance Audit ---`);
        console.log(`Average Latency per Task: ${(avgLatency._avg.latency || 0).toFixed(2)}ms`);

        // 4. Overall Readiness %
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


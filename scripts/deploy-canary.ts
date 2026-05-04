

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8080';
const STAGES = [10, 50, 100];
const WAIT_TIME_MS = 5000; // Simulated wait time between stages (5s instead of 5m for testing)

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkDeploymentHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${GATEWAY_URL}/health/deploy`);
        if (response.status === 200) {
            const data = await response.json();
            if (data.deployable === true) return true;
        }
        if (response.status === 503) {
            const data = await response.json();
            console.error(`❌ Health Check Failed: ${data.error}`);
            return false;
        }
        return false;
    } catch (err: any) {
        console.warn(`⚠️ Warning: Gateway unreachable (${err.message})`);
        return false;
    }
}

async function runCanaryRollout() {
    console.log('🚀 Starting Canary Deployment Pipeline...');
    
    // Pre-flight check
    console.log('⏳ Running pre-flight health check...');
    const isHealthy = await checkDeploymentHealth();
    if (!isHealthy) {
        console.error('🛑 Pre-flight check failed. Error Budget is exhausted or system is degraded. Blocking deployment.');
        process.exit(1);
    }
    console.log('✅ Pre-flight check passed. Error Budget is healthy.');

    for (const percent of STAGES) {
        console.log(`\n🔄 Shifting traffic to new version: ${percent}%...`);
        // Simulate deployment platform API call (e.g., Kubernetes Ingress / AWS Route53)
        await sleep(1000);
        console.log(`✅ Traffic shift to ${percent}% complete.`);

        console.log(`⏳ Monitoring system health for ${WAIT_TIME_MS / 1000} seconds...`);
        await sleep(WAIT_TIME_MS);

        const health = await checkDeploymentHealth();
        if (!health) {
            console.error(`\n🚨 ALERT: Error Budget burn rate exceeded thresholds during ${percent}% rollout!`);
            await triggerRollback();
            process.exit(1);
        }
        console.log(`✅ Health check passed. System is stable at ${percent}% rollout.`);
    }

    console.log('\n🎉 Deployment Successful! 100% traffic shifted to new version.');
}

async function triggerRollback() {
    console.error('🧨 TRIGGERING AUTOMATIC ROLLBACK');
    console.log('🔄 Shifting traffic back to previous stable version (100%)...');
    await sleep(2000); // Simulate rollback
    console.log('✅ Rollback complete. Traffic restored to original version.');
}

runCanaryRollout().catch(err => {
    console.error('Fatal deployment error:', err);
    process.exit(1);
});

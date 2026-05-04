/**
 * MultiAgent Load Simulator
 * Simulate concurrent build pressure and monitor system latency.
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const CONCURRENCY_LEVELS = [5, 10, 20];
const RESULTS_FILE = path.join(__dirname, '..', 'load_test_results.json');

async function runBuild() {
    return new Promise((resolve) => {
        const start = Date.now();
        // Simulate a build by running tsc or similar on a package
        const child = spawn('pnpm', ['--filter', '@libs/utils', 'build'], { shell: true });
        
        child.on('close', (code) => {
            resolve({
                duration: Date.now() - start,
                success: code === 0
            });
        });
    });
}

async function simulateLoad(concurrency) {
    console.log(`\n[LoadTest] Simulating ${concurrency} concurrent builds...`);
    const start = Date.now();
    
    const tasks = [];
    for (let i = 0; i < concurrency; i++) {
        tasks.push(runBuild());
    }
    
    const results = await Promise.all(tasks);
    const totalDuration = Date.now() - start;
    const failures = results.filter(r => !r.success).length;
    const avgDuration = results.reduce((acc, r) => acc + r.duration, 0) / concurrency;

    return {
        concurrency,
        totalDuration,
        avgDuration,
        failureRate: (failures / concurrency) * 100,
        timestamp: new Date().toISOString()
    };
}

async function run() {
    const finalResults = [];
    for (const level of CONCURRENCY_LEVELS) {
        const res = await simulateLoad(level);
        finalResults.push(res);
        console.log(`[Results] Concurrency: ${level} | Avg Duration: ${res.avgDuration.toFixed(2)}ms | Failures: ${res.failureRate}%`);
    }
    
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(finalResults, null, 2));
    console.log(`\n[LoadTest] Audit complete. Results saved to ${RESULTS_FILE}`);
}

run().catch(console.error);

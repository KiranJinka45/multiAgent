import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const NAMESPACE = 'ztan-validation';
const METRICS_FILE = 'METRICS.json';
const REPLAY_DIR = path.join('archive', 'recovery_replays');

interface Metrics {
    totalTests: number;
    successfulRecoveries: number;
    failedRecoveries: number;
    lastTestTimestamp: string | null;
    trustScore: number;
    history: any[];
}

function getMetrics(): Metrics {
    return JSON.parse(fs.readFileSync(METRICS_FILE, 'utf-8'));
}

function saveMetrics(metrics: Metrics) {
    fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));
}

function logReplay(name: string, success: boolean, details: any) {
    const timestamp = new Date().toISOString();
    const replayId = `replay-stress-${Date.now()}`;
    const dir = path.join(REPLAY_DIR, replayId);
    fs.mkdirSync(dir, { recursive: true });

    const metadata = {
        replayId,
        name,
        timestamp,
        success,
        details,
        envFingerprint: { os: process.platform, node: process.version }
    };

    fs.writeFileSync(path.join(dir, 'run_metadata.json'), JSON.stringify(metadata, null, 2));
    console.log(`[CONTINUOUS] Recorded ${name} (${success ? 'SUCCESS' : 'FAILED'}): ${replayId}`);
}

async function injectPodCrash() {
    console.log('--- [CHAOS] Injecting Pod Crash ---');
    const pods = execSync(`kubectl get pods -n ${NAMESPACE} -o json`).toString();
    const podNames = JSON.parse(pods).items.map((p: any) => p.metadata.name);
    const target = podNames[Math.floor(Math.random() * podNames.length)];
    
    console.log(`Killing pod: ${target}`);
    execSync(`kubectl delete pod ${target} -n ${NAMESPACE} --now`);
    
    // Wait for recovery
    console.log('Waiting for K8s to restore pod...');
    await new Promise(resolve => setTimeout(resolve, 20000));
    
    const newPods = execSync(`kubectl get pods -n ${NAMESPACE}`).toString();
    const success = newPods.includes('Running');
    logReplay('pod_crash_recovery', success, { target });
    return success;
}

async function injectRolloutFailure() {
    console.log('--- [CHAOS] Injecting Rollout Failure ---');
    try {
        execSync(`kubectl set image deployment/api api=broken-image:failed -n ${NAMESPACE}`);
        console.log('Rollout triggered with broken image. Waiting for failure detection...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        console.log('Executing Rollback...');
        execSync(`kubectl rollout undo deployment/api -n ${NAMESPACE}`);
        execSync(`kubectl rollout status deployment/api -n ${NAMESPACE} --timeout=30s`);
        
        logReplay('rollout_failure_recovery', true, { status: 'rolled_back' });
        return true;
    } catch (e) {
        logReplay('rollout_failure_recovery', false, { error: e.message });
        return false;
    }
}

async function runValidationCycle() {
    console.log(`\n🚀 STARTING CONTINUOUS VALIDATION CYCLE: ${new Date().toISOString()}`);
    const metrics = getMetrics();
    metrics.totalTests++;

    let cycleSuccess = true;
    
    // Randomly choose a failure to inject
    const rand = Math.random();
    if (rand < 0.5) {
        cycleSuccess = await injectPodCrash();
    } else {
        cycleSuccess = await injectRolloutFailure();
    }

    if (cycleSuccess) {
        metrics.successfulRecoveries++;
    } else {
        metrics.failedRecoveries++;
    }

    metrics.lastTestTimestamp = new Date().toISOString();
    metrics.trustScore = (metrics.successfulRecoveries / metrics.totalTests);
    
    metrics.history.push({
        timestamp: metrics.lastTestTimestamp,
        success: cycleSuccess,
        type: rand < 0.5 ? 'pod_crash' : 'rollout_failure'
    });

    saveMetrics(metrics);
    console.log(`✅ CYCLE COMPLETE. Current Trust Score: ${(metrics.trustScore * 100).toFixed(1)}%`);
}

// If run directly
if (require.main === module) {
    runValidationCycle();
}

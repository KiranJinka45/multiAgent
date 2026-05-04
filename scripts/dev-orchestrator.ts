import { spawn } from 'child_process';
import axios from 'axios';

async function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkHealth(url: string, serviceName: string): Promise<boolean> {
    try {
        const response = await axios.get(url, { timeout: 2000 });
        if (response.status === 200) {
            console.log(`✅ [Orchestrator] ${serviceName} is healthy at ${url}`);
            return true;
        }
    } catch (e) {
        // console.log(`⏳ [Orchestrator] Waiting for ${serviceName}...`);
    }
    return false;
}

async function startService(command: string, args: string[], cwd: string, serviceName: string) {
    console.log(`🚀 [Orchestrator] Starting ${serviceName}...`);
    const proc = spawn(command, args, {
        cwd,
        shell: true,
        stdio: 'inherit',
        env: { ...process.env, NO_CLUSTER: 'true' }
    });

    proc.on('exit', (code) => {
        if (code !== 0 && code !== null) {
            console.error(`❌ [Orchestrator] ${serviceName} exited with code ${code}`);
        }
    });

    return proc;
}

async function main() {
    console.log('🏗️ [Orchestrator] Starting MultiAgent SRE Control Plane...');

    // 1. Core API (3010)
    await startService('pnpm', ['--filter', '@apps/core-api', 'dev'], '.', 'Core API');
    
    let coreHealthy = false;
    for (let i = 0; i < 60; i++) {
        coreHealthy = await checkHealth('http://localhost:3010/health', 'Core API');
        if (coreHealthy) break;
        await wait(2000);
    }

    if (!coreHealthy) {
        console.error('❌ [Orchestrator] Core API failed to start in time.');
        process.exit(1);
    }

    // 2. Auth Service (4005)
    await startService('pnpm', ['--filter', '@apps/auth-service', 'dev'], '.', 'Auth Service');
    
    let authHealthy = false;
    for (let i = 0; i < 30; i++) {
        authHealthy = await checkHealth('http://localhost:4005/health', 'Auth Service');
        if (authHealthy) break;
        await wait(2000);
    }

    // 3. Worker (8082)
    await startService('pnpm', ['--filter', '@apps/worker', 'dev'], '.', 'Worker');
    
    let workerHealthy = false;
    for (let i = 0; i < 30; i++) {
        workerHealthy = await checkHealth('http://localhost:8082/health', 'Worker');
        if (workerHealthy) break;
        await wait(2000);
    }

    // 4. Gateway (3500)
    await startService('pnpm', ['--filter', '@apps/gateway', 'dev'], '.', 'Gateway');

    let gatewayHealthy = false;
    for (let i = 0; i < 60; i++) {
        gatewayHealthy = await checkHealth('http://localhost:3500/health', 'Gateway');
        if (gatewayHealthy) break;
        await wait(2000);
    }

    if (!gatewayHealthy) {
        console.error('❌ [Orchestrator] Gateway failed to start in time.');
        process.exit(1);
    }

    // 5. Frontend (4200)
    console.log('🚀 [Orchestrator] Starting Frontend...');
    await startService('pnpm', ['--filter', 'frontend', 'start'], '.', 'Frontend');

    console.log('\n🌟 [Orchestrator] ALL SERVICES ORCHESTRATED 🌟');
    console.log('👉 Dashboard: http://localhost:4200');
    console.log('👉 Gateway:   http://localhost:3500');
    console.log('👉 Core API:  http://localhost:3010');
    console.log('👉 Auth API:  http://localhost:4005\n');
}

main().catch(console.error);

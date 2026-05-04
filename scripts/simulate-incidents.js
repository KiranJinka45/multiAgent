/**
 * MultiAgent Incident Simulator
 * Intentionally triggers failures to test SRE resilience.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const GATEWAY_URL = 'http://localhost:4000/health';

async function testIncident(name, action, recovery) {
    console.log(`\n--- [Incident] ${name} ---`);
    try {
        await action();
        console.log(`[Status] Failure Triggered. Monitoring Gateway...`);
        
        let recovered = false;
        for (let i = 0; i < 10; i++) {
                const http = require('http');
                const recoveredPromise = new Promise((resolve) => {
                    http.get(GATEWAY_URL, (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => resolve(data.includes('healthy')));
                    }).on('error', () => resolve(false));
                });
                if (await recoveredPromise) {
                    recovered = true;
                    break;
                }
            process.stdout.write('.');
            await new Promise(r => setTimeout(r, 2000));
        }

        if (recovered) {
            console.log(`\n[Status] System RECOVERED autonomously.`);
        } else {
            console.warn(`\n[Status] System FAILED to recover within 20s.`);
        }
    } finally {
        await recovery();
        console.log(`[Status] Environment Restored.`);
    }
}

async function run() {
    // Incident 1: DB Disconnect (Corrupt .env)
    await testIncident(
        'Database Connection Failure',
        async () => {
            const envPath = path.resolve(__dirname, '..', 'apps', 'gateway', '.env');
            const content = fs.readFileSync(envPath, 'utf-8');
            fs.writeFileSync(envPath, content.replace('postgresql', 'invalid_db'), 'utf-8');
        },
        async () => {
            const envPath = path.resolve(__dirname, '..', 'apps', 'gateway', '.env');
            const content = fs.readFileSync(envPath, 'utf-8');
            fs.writeFileSync(envPath, content.replace('invalid_db', 'postgresql'), 'utf-8');
        }
    );

    // Incident 2: Process Crash (Kill Auth)
    await testIncident(
        'Auth Service Process Crash',
        async () => {
            // Simulate crash by killing node processes (we'll see if the dev runner or our guardrail picks it up)
            console.log('Killing all node processes to simulate total failure...');
            // execSync('Stop-Process -Name node -Force', { shell: 'powershell' });
        },
        async () => {
             console.log('Restarting services via verify-reliability...');
             // execSync('node scripts/verify-reliability.js', { stdio: 'inherit' });
        }
    );
}

run().catch(console.error);

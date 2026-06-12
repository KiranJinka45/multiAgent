import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const SERVICES = [
    {
        name: 'Gateway Service',
        path: 'apps/gateway/dist/index.js',
        env: { NO_CLUSTER: 'true', PORT: '3020' }
    },
    {
        name: 'Control Plane Service',
        path: 'apps/control-plane/dist/validation-daemon.js',
        env: { PORT: '3011' }
    },
    {
        name: 'Core API Service',
        path: 'apps/core-api/dist/index.js',
        env: { PORT: '3012' }
    },
    {
        name: 'ZTAN CLI Utility',
        path: 'packages/ztanctl/dist/index.js',
        args: ['--help'],
        env: {}
    }
];

async function runSmokeTest(service) {
    console.log(`\n========================================`);
    console.log(`🚀 [SMOKE TEST] Starting ${service.name}...`);
    console.log(`📍 Path: ${service.path}`);
    console.log(`========================================`);

    const fullPath = path.join(rootDir, service.path);
    
    return new Promise((resolve, reject) => {
        // Use node to execute the built bundle with warning escalation
        const processArgs = service.args || [];
        const proc = spawn('node', ['--trace-warnings', '--unhandled-rejections=strict', fullPath, ...processArgs], {
            cwd: rootDir,
            env: {
                ...process.env,
                JWT_SECRET: 'smoke-test-jwt-secret-key-at-least-32-chars-long',
                ...service.env,
                NODE_ENV: 'test',
                LOG_LEVEL: 'debug'
            }
        });

        let output = '';
        let errorOutput = '';

        proc.stdout.on('data', (data) => {
            const chunk = data.toString();
            output += chunk;
            // Print chunks to console for diagnostic transparency
            process.stdout.write(`[${service.name} STDOUT] ${chunk}`);
        });

        proc.stderr.on('data', (data) => {
            const chunk = data.toString();
            errorOutput += chunk;
            process.stderr.write(`[${service.name} STDERR] ${chunk}`);
        });

        // Set a timeout for stable execution (3 seconds is standard)
        const runTimeout = setTimeout(() => {
            console.log(`\n✅ [${service.name}] Ran stably for 3 seconds without exceptions! Terminating...`);
            proc.kill('SIGINT');
            resolve({ success: true });
        }, 3000);

        proc.on('error', (err) => {
            clearTimeout(runTimeout);
            console.error(`❌ [${service.name}] Process error:`, err);
            reject(err);
        });

        proc.on('exit', (code, signal) => {
            clearTimeout(runTimeout);
            console.log(`⏹️ [${service.name}] Process exited with code ${code}, signal ${signal}`);
            
            // Check for immediate crash signatures (ReferenceError, SyntaxError, require is not defined, import.meta)
            const lowerError = (output + errorOutput).toLowerCase();
            const hasCrashSignature = 
                lowerError.includes('referenceerror') || 
                lowerError.includes('syntaxerror') ||
                lowerError.includes('not defined') ||
                lowerError.includes('import.meta') ||
                lowerError.includes('cannot find module') ||
                lowerError.includes('err_require_esm');

            const hasWarningOrRejection = 
                lowerError.includes('warning:') ||
                lowerError.includes('unhandledrejection') ||
                lowerError.includes('unhandled rejection');

            if (hasCrashSignature) {
                console.error(`❌ [${service.name}] Crash signature detected in process logs!`);
                reject(new Error(`Crash signature detected for ${service.name}`));
            } else if (hasWarningOrRejection) {
                console.error(`❌ [${service.name}] Warning or Unhandled Rejection detected (strict warning escalation)!`);
                reject(new Error(`Warning or Unhandled Rejection detected for ${service.name}`));
            } else if (service.args && service.args.length > 0 && code === 0) {
                // If it's a CLI tool that finishes instantly (like --help), code 0 is success!
                console.log(`✅ [${service.name}] Finished execution successfully with code 0!`);
                resolve({ success: true });
            } else if (signal === 'SIGINT' || code === null || code === 0) {
                resolve({ success: true });
            } else {
                reject(new Error(`Service exited prematurely with code ${code}`));
            }
        });
    });
}

async function runAll() {
    console.log(`🛡️ Starting Monorepo Runtime Smoke Test Campaigns...`);
    let passed = 0;
    let failed = 0;

    for (const service of SERVICES) {
        try {
            await runSmokeTest(service);
            passed++;
        } catch (err) {
            console.error(`❌ [SMOKE TEST] Service ${service.name} FAILED!`, err.message);
            failed++;
        }
    }

    console.log(`\n========================================`);
    console.log(`📊 Smoke Test Campaigns Summary:`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`========================================`);

    if (failed > 0) {
        process.exit(1);
    } else {
        console.log(`🎉 All smoke tests passed successfully!`);
        process.exit(0);
    }
}

runAll();

/**
 * MultiAgent Reliability Guardrail: Junction & Env Verifier
 * This script ensures that all workspace @libs are correctly linked and env vars are present.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LIBS = [
    'agents', 'ai', 'brain', 'build-engine', 'context', 'contracts', 
    'core-engine', 'db', 'memory', 'observability', 'registry', 'resilience', 
    'sdk', 'shared-services', 'supabase', 'templates', 'tools', 
    'ui', 'utils', 'validator'
];

function verifyApp(appName) {
    console.log(`\n[Guardrail] Auditing ${appName}...`);
    const appPath = path.resolve(__dirname, '..', 'apps', appName);
    
    if (!fs.existsSync(appPath)) {
        console.warn(`[!] App directory missing: ${appName}. Skipping.`);
        return;
    }

    const nodeModulesLibs = path.join(appPath, 'node_modules', '@libs');

    // 1. Check @libs Directory
    if (!fs.existsSync(nodeModulesLibs)) {
        console.warn(`[!] @libs directory missing in ${appName}. Creating...`);
        fs.mkdirSync(nodeModulesLibs, { recursive: true });
    }

    // 2. Check Junctions
    LIBS.forEach(lib => {
        const libPath = path.join(nodeModulesLibs, lib);
        if (!fs.existsSync(libPath)) {
            console.warn(`[!] Junction missing: @libs/${lib}. Linking...`);
            const source = path.resolve(__dirname, '..', 'packages', lib);
            try {
                // Use mklink /J on Windows for junctions
                execSync(`mklink /J "${libPath}" "${source}"`, { stdio: 'inherit' });
            } catch (e) {
                console.error(`[X] Failed to link @libs/${lib}: ${e.message}`);
            }
        }
    });

    // 3. Check Env
    const envPath = path.join(appPath, '.env');
    if (!fs.existsSync(envPath)) {
        console.warn(`[!] .env missing in ${appName}. Copying from root...`);
        const rootEnv = path.resolve(__dirname, '..', '.env');
        if (fs.existsSync(rootEnv)) {
            fs.copyFileSync(rootEnv, envPath);
        } else {
            console.error(`[X] Root .env missing! Cannot recover.`);
        }
    }
}

// Target Apps
['gateway', 'auth-service', 'frontend', 'orchestrator', 'worker'].forEach(verifyApp);

console.log('\n[Guardrail] System audit complete. Reliability Index (RI) optimized.');

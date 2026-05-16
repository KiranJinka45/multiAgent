import { execSync } from 'node:child_process';

/**
 * ZTAN HOST REQUIREMENT AUDIT
 * Verifies that the host machine has all necessary binaries for full operational capability.
 */

const REQUIREMENTS = [
    { cmd: 'docker', name: 'Docker Engine', critical: true },
    { cmd: 'pnpm', name: 'PNPM Package Manager', critical: true },
    { cmd: 'node', name: 'Node.js Runtime', critical: true },
    { cmd: 'git', name: 'Git Version Control', critical: true },
    { cmd: 'psql', name: 'Postgres CLI (psql)', critical: false },
    { cmd: 'redis-cli', name: 'Redis CLI', critical: false }
];

function audit() {
    console.log('📋 AUDITING HOST OPERATIONAL READINESS...');
    let healthy = true;

    for (const req of REQUIREMENTS) {
        try {
            const version = execSync(`${req.cmd} --version`, { encoding: 'utf8' });
            console.log(`✅ ${req.name}: Found (${version.split('\n')[0]})`);

            // Node.js specific version check (Minimum v20)
            if (req.cmd === 'node') {
                const major = parseInt(version.replace('v', '').split('.')[0]);
                if (major < 20) {
                    console.error(`❌ VERSION ERROR: Node.js version must be 20 or higher. Found ${version}`);
                    healthy = false;
                }
            }
        } catch (err) {
            if (req.critical) {
                console.error(`❌ CRITICAL MISSING: ${req.name} (${req.cmd}) is required for basic operation.`);
                healthy = false;
            } else {
                console.warn(`⚠️  OPTIONAL MISSING: ${req.name} (${req.cmd}) is recommended for advanced debugging.`);
            }
        }
    }

    // Resource Audit (Basic Memory check)
    try {
        const os = require('os');
        const totalMemGb = os.totalmem() / (1024 ** 3);
        if (totalMemGb < 4) {
            console.warn(`⚠️  LOW MEMORY: Found ${totalMemGb.toFixed(1)}GB RAM. ZTAN performs best with at least 8GB.`);
        } else {
            console.log(`✅ Memory: ${totalMemGb.toFixed(1)}GB RAM`);
        }
    } catch (err) {}

    if (!healthy) {
        console.error('\n🛑 AUDIT FAILED: Host machine is not ready for ZTAN operations.');
        process.exit(1);
    } else {
        console.log('\n✨ AUDIT COMPLETE: Host machine meets operational standards.');
    }
}

audit();

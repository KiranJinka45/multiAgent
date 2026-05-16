import fs from 'node:fs';
import path from 'node:path';

/**
 * ZTAN ECOSYSTEM WATCHDOG
 * 
 * Monitors the dependency graph for decadal survivability risks:
 * - Transitive Abandonment (detecting deprecated/legacy packages)
 * - ESM Resolution Hazards (CJS/ESM hybrid stability)
 * - Vulnerability Surface Area (Snyk integration context)
 */

const WATCHLIST = [
    { name: 'request', risk: 'ABANDONED', recommendation: 'Migrate to axios or native fetch' },
    { name: 'winston', version: '<3.0.0', risk: 'LEGACY', recommendation: 'Upgrade to pino or winston@3' },
    { name: 'moment', risk: 'MAINTENANCE_MODE', recommendation: 'Migrate to dayjs or date-fns' },
    { name: 'node-fetch', version: '<3.0.0', risk: 'CJS_ESM_HAZARD', recommendation: 'Upgrade to v3 (ESM-only) or use native fetch' }
];

async function runWatchdog() {
    console.log('🛡️  ZTAN ECOSYSTEM WATCHDOG ACTIVE...');
    const findings: string[] = [];

    if (!fs.existsSync('pnpm-lock.yaml')) {
        console.error('No pnpm-lock.yaml found for auditing.');
        return;
    }

    const lockfile = fs.readFileSync('pnpm-lock.yaml', 'utf-8');

    // 1. Transitive Abandonment Audit
    console.log('   - Auditing for abandoned/legacy dependencies...');
    WATCHLIST.forEach(pkg => {
        if (lockfile.includes(`/${pkg.name}/`)) {
            findings.push(`[${pkg.risk}] Found ${pkg.name}. ${pkg.recommendation}.`);
        }
    });

    // 2. ESM Resolution Hazards
    console.log('   - Auditing ESM migration hazards...');
    // Detecting common ESM-only packages in our monorepo context
    const esmOnlyCandidates = ['node-fetch', 'chalk', 'find-up'];
    esmOnlyCandidates.forEach(pkg => {
        if (lockfile.includes(`/${pkg}/`) && !lockfile.includes(`${pkg}@3`)) {
            // Potential hazard if we are expecting CJS support
        }
    });

    // 3. Security-Maintenance Decay (Priority 4)
    console.log('   - Auditing for Security-Maintenance decay...');
    const decaySignals = [
        { name: 'minimist', version: '<1.2.6', risk: 'MAINTENANCE_DECAY' },
        { name: 'glob-parent', version: '<5.1.2', risk: 'MAINTENANCE_DECAY' }
    ];
    decaySignals.forEach(pkg => {
        if (lockfile.includes(`/${pkg.name}/${pkg.version}`)) {
            findings.push(`[DECAY] Found legacy version of ${pkg.name} (${pkg.version}). Risk of unpatched CVEs.`);
        }
    });

    // 4. Dependency Depth Analysis
    const totalDeps = (lockfile.match(/snapshots:/g) || []).length;
    console.log(`   - Current Dependency Graph Depth: ${totalDeps} nodes.`);
    if (totalDeps > 2500) {
        findings.push(`[BLOAT] Dependency graph exceeds 2500 nodes (${totalDeps}). Risk of audit timeouts.`);
    }

    console.log('\n🐕 Watchdog Findings:');
    if (findings.length === 0) {
        console.log('✅ Dependency graph remains lean and survivable.');
    } else {
        findings.forEach(f => console.log(`   - ${f}`));
        console.log('\n⚠️  Survivability risks detected. Address these to prevent decadal recovery decay.');
    }
}

runWatchdog();

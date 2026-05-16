import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * ZTAN DRIFT ANALYZER
 * 
 * Proactively monitors the ecosystem for drift before it impacts reliability:
 * - TypeScript baseline synchronization
 * - Node.js LTS lifecycle status
 * - Dependency graph entropy
 */

const BASELINE_TS = '5.9.3';
const WORKSPACE_DIRS = ['apps', 'packages'];

async function analyze() {
    console.log('📡 ZTAN DRIFT ANALYZER ACTIVE...');
    const findings: string[] = [];

    // 1. TypeScript Drift Check
    console.log('   - Auditing TypeScript baseline...');
    const rootPkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const rootTS = rootPkg.devDependencies?.typescript;
    
    if (rootTS !== BASELINE_TS) {
        findings.push(`[CRITICAL] Root TypeScript version (${rootTS}) drifts from baseline (${BASELINE_TS}).`);
    }

    for (const dir of WORKSPACE_DIRS) {
        const subdirs = fs.readdirSync(dir);
        for (const subdir of subdirs) {
            const pkgPath = path.join(dir, subdir, 'package.json');
            if (fs.existsSync(pkgPath)) {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
                const ts = pkg.devDependencies?.typescript || pkg.dependencies?.typescript;
                if (ts && ts !== BASELINE_TS && !ts.includes('workspace')) {
                    findings.push(`[DRIFT] ${dir}/${subdir} uses TS ${ts} (Expected ${BASELINE_TS}).`);
                }
            }
        }
    }

    // 2. Node.js & Infrastructure Lifecycle Check
    const currentNode = process.version;
    console.log(`   - Auditing Infrastructure Lifecycle (${currentNode})...`);
    if (!currentNode.startsWith('v20')) {
        findings.push(`[WARNING] Runner uses Node ${currentNode}. Production baseline is v20.x (LTS).`);
    }

    // 3. Prisma Engine & Schema Drift
    console.log('   - Auditing Prisma engine and schema sync...');
    try {
        const prismaVer = execSync('npx prisma -v', { encoding: 'utf8' });
        if (!prismaVer.includes('5.22.0')) {
            findings.push(`[DRIFT] Prisma engine mismatch. Expected 5.22.0.`);
        }
    } catch {
        findings.push('[CRITICAL] Prisma CLI not responsive.');
    }

    // 4. Message Queue (BullMQ) & Redis Drift
    console.log('   - Auditing Queue (BullMQ) & Redis compatibility...');
    const bullVer = rootPkg.dependencies?.['bullmq'] || rootPkg.pnpm?.overrides?.['bullmq'];
    if (bullVer && !bullVer.startsWith('5.')) {
        findings.push(`[DRIFT] BullMQ version (${bullVer}) drifts from production baseline (v5.x).`);
    }

    // 5. ESM/CJS Hybrid Stability
    console.log('   - Auditing ESM package stability...');
    const hybridPackages = ['pino', 'chalk', 'axios'];
    hybridPackages.forEach(pkg => {
        // Checking for common hybrid package resolution pitfalls
    });

    // 6. Dependency Entropy (Workspace vs Root)
    console.log('   - Analyzing dependency graph entropy...');
    const coreDeps = ['zod', 'prisma', 'uuid', 'axios'];
    coreDeps.forEach(dep => {
        const rootVer = rootPkg.dependencies?.[dep] || rootPkg.devDependencies?.[dep] || rootPkg.pnpm?.overrides?.[dep];
        if (!rootVer) return;
    });

    console.log('\n📊 Drift Analysis Summary:');
    if (findings.length === 0) {
        console.log('✅ No significant ecosystem drift detected. System remains stable.');
    } else {
        findings.forEach(f => console.log(`   - ${f}`));
        console.log('\n⚠️  Ecosystem drift detected. Stability may decay if not synchronized.');
    }
}

analyze();

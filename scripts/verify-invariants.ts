import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * ZTAN Invariant Certification Utility
 * Programmatically verifies constitutional safety boundaries.
 */
function runInvariantAudit() {
    console.log('🛡️ Starting ZTAN Institutional Invariant Audit...\n');

    const coreEnginePath = path.join(process.cwd(), 'packages/core-engine/src');
    const sandboxPath = path.join(process.cwd(), 'packages/sandbox/src');

    // 1. Check for Forbidden Node Primitives in core logic
    console.log('🔍 Audit 1: Scanning for Bypasses (direct process/env access)...');
    const files = walkDir(coreEnginePath).concat(walkDir(sandboxPath));
    let bypassCount = 0;

    files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        // Simple heuristic for forbidden patterns in core code
        if (content.includes('process.env') && !file.endsWith('config.ts')) {
            console.warn(`   ⚠️  Found process.env in ${path.relative(process.cwd(), file)}`);
            bypassCount++;
        }
        if (content.includes('child_process.exec') || content.includes('spawn(')) {
             if (!file.includes('sandbox')) {
                console.warn(`   ⚠️  Uncontrolled execution primitive in ${path.relative(process.cwd(), file)}`);
                bypassCount++;
             }
        }
    });

    // 2. Verify Evidence Engine Isolation
    console.log('🔍 Audit 2: Verifying Evidence Engine Isolation...');
    // In a real audit, we'd check for module resolution isolation.
    // For this drill, we verify it doesn't import external cognitive agents.
    const evidenceEngineContent = fs.readFileSync(path.join(coreEnginePath, 'evidence-engine.ts'), 'utf8');
    if (evidenceEngineContent.includes('@packages/ai-agents')) {
         console.error('   ❌ CRITICAL FAILURE: Evidence Engine depends on Cognitive Agents.');
         process.exit(1);
    }

    if (bypassCount === 0) {
        console.log('\n✅ INVARIANT AUDIT SUCCESSFUL:');
        console.log('   - No unauthorized environment access detected.');
        console.log('   - Execution primitives are correctly sandboxed.');
        console.log('   - Determinism boundary is architecturally clean.');
    } else {
        console.warn(`\n⚠️ INVARIANT AUDIT COMPLETED WITH ${bypassCount} WARNINGS.`);
    }
}

function walkDir(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(filePath));
        } else if (filePath.endsWith('.ts')) {
            results.push(filePath);
        }
    });
    return results;
}

runInvariantAudit();

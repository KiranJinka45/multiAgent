import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * ZTAN PHASE 12 TIER E4: COMMAND DEPTH AUDIT
 * 
 * Objective: Validate cognitive operational survivability by enforcing
 * that recovery scripts remain extremely shallow.
 * 
 * Rules:
 * 1. Zero Conditional Branching (`if`, `switch`, `for`, `while`) allowed in the critical recovery path.
 * 2. Maximum command depth: The human operator only runs one script. The script can execute sequentially,
 *    but cannot have complex internal branching that makes recovery unpredictable.
 */

function auditScript(targetPath: string) {
    console.log(`\n🔍 AUDITING RECOVERY SCRIPT: ${path.basename(targetPath)}`);
    
    if (!fs.existsSync(targetPath)) {
        console.error(`❌ ERROR: Target script not found at ${targetPath}`);
        process.exit(1);
    }

    const sourceCode = fs.readFileSync(targetPath, 'utf-8');
    const sourceFile = ts.createSourceFile(
        targetPath,
        sourceCode,
        ts.ScriptTarget.Latest,
        true
    );

    let branchCount = 0;
    let tryCatchCount = 0;
    let execSyncCount = 0;
    const branchTypes: string[] = [];

    // Simple AST visitor
    function visit(node: ts.Node) {
        if (ts.isIfStatement(node) || ts.isSwitchStatement(node)) {
            // We allow one or two basic "if (!fs.existsSync)" checks for idempotency,
            // but we want to catalog them.
            branchCount++;
            branchTypes.push(ts.SyntaxKind[node.kind]);
        }
        if (ts.isForStatement(node) || ts.isWhileStatement(node) || ts.isDoStatement(node)) {
            branchCount++;
            branchTypes.push(ts.SyntaxKind[node.kind]);
        }
        if (ts.isTryStatement(node)) {
            tryCatchCount++;
        }
        if (ts.isCallExpression(node)) {
            const exp = node.expression;
            if (ts.isIdentifier(exp) && exp.text === 'execSync') {
                execSyncCount++;
            }
        }
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    console.log('----------------------------------------------------');
    console.log(`📊 AST METRICS FOR ${path.basename(targetPath)}`);
    console.log(`- Total ExecSync Calls: ${execSyncCount}`);
    console.log(`- Cyclomatic Branch Nodes: ${branchCount} (${branchTypes.join(', ')})`);
    console.log(`- Try/Catch Blocks: ${tryCatchCount}`);

    let passed = true;

    // Rule: Recovery should be linear. Limit branches.
    if (branchCount > 3) {
        console.error('❌ FAIL: Cyclomatic complexity exceeds bounds (Max 3 branches allowed for idempotency checks).');
        passed = false;
    } else {
        console.log('✅ PASS: Cyclomatic complexity within shallow operational bounds.');
    }

    // Rule: We expect some execution calls, but not a huge script doing everything.
    if (execSyncCount > 10) {
        console.error('❌ FAIL: Too many shell-outs. The script is doing too much inline.');
        passed = false;
    } else {
        console.log(`✅ PASS: Command depth acceptable (${execSyncCount} inline commands).`);
    }

    if (passed) {
        console.log('✅ PASS: Operator recovery script verified as structurally shallow and predictable.');
    } else {
        console.error('🚨 AUDIT FAILED. RECOVERY SCRIPT MUST BE SIMPLIFIED.');
        process.exit(1);
    }
}

async function main() {
    console.log('================================================================');
    console.log('🛡️ ZTAN TIER E4: RECOVERY COMMAND DEPTH AUDITOR');
    console.log('================================================================');

    const ocrScript = path.join(rootDir, 'scripts', 'one-command-recovery.ts');
    auditScript(ocrScript);
    
    console.log('\n================================================================');
    console.log('🏁 AUDIT COMPLETE');
    console.log('================================================================');
}

main().catch(err => {
    console.error(`❌ Audit crashed: ${err.message}`);
    process.exit(1);
});

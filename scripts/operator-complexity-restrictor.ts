import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '../');

const SCRIPTS_TO_AUDIT = [
    'scripts/one-command-recovery.ts'
];

interface AuditMetrics {
    fileName: string;
    maxNestingDepth: number;
    cyclomaticComplexity: number;
    passed: boolean;
    anomalies: string[];
}

function calculateNestingAndComplexity(filePath: string): AuditMetrics {
    const absolutePath = path.resolve(workspaceRoot, filePath);
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`File not found: ${absolutePath}`);
    }

    const code = fs.readFileSync(absolutePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);

    let maxNestingDepth = 0;
    let cyclomaticComplexity = 1; // Base complexity
    const anomalies: string[] = [];

    function visit(node: ts.Node, depth: number) {
        let nextDepth = depth;

        // Identify branching and control structures that increase depth and complexity
        switch (node.kind) {
            case ts.SyntaxKind.IfStatement:
            case ts.SyntaxKind.ForStatement:
            case ts.SyntaxKind.ForInStatement:
            case ts.SyntaxKind.ForOfStatement:
            case ts.SyntaxKind.WhileStatement:
            case ts.SyntaxKind.DoStatement:
            case ts.SyntaxKind.CatchClause:
            case ts.SyntaxKind.SwitchStatement:
                nextDepth = depth + 1;
                cyclomaticComplexity++;
                if (nextDepth > maxNestingDepth) {
                    maxNestingDepth = nextDepth;
                }
                break;
            case ts.SyntaxKind.BinaryExpression:
                const binExpr = node as ts.BinaryExpression;
                if (
                    binExpr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
                    binExpr.operatorToken.kind === ts.SyntaxKind.BarBarToken
                ) {
                    cyclomaticComplexity++;
                }
                break;
        }

        ts.forEachChild(node, (child) => visit(child, nextDepth));
    }

    visit(sourceFile, 0);

    const maxAllowedDepth = 2;
    const maxAllowedComplexity = 10;
    const passed = maxNestingDepth <= maxAllowedDepth && cyclomaticComplexity <= maxAllowedComplexity;

    if (maxNestingDepth > maxAllowedDepth) {
        anomalies.push(`Control nesting depth of ${maxNestingDepth} exceeds SRE cognitive budget limit of ${maxAllowedDepth}!`);
    }
    if (cyclomaticComplexity > maxAllowedComplexity) {
        anomalies.push(`Cyclomatic complexity of ${cyclomaticComplexity} exceeds SRE limit of ${maxAllowedComplexity}!`);
    }

    return {
        fileName: filePath,
        maxNestingDepth,
        cyclomaticComplexity,
        passed,
        anomalies
    };
}

function main() {
    console.log('================================================================');
    console.log('🛡️  ZTAN RECOVERY SCRIPT COMPLEXITY RESTRICTOR (TIER E9)');
    console.log('    [AST Control-Nesting & Cyclomatic Complexity Audit]');
    console.log('================================================================\n');

    let globalPassed = true;
    const results: AuditMetrics[] = [];

    for (const scriptPath of SCRIPTS_TO_AUDIT) {
        console.log(`🔍 Auditing recoverability complexity for script: ${scriptPath}...`);
        try {
            const metrics = calculateNestingAndComplexity(scriptPath);
            results.push(metrics);

            console.log(`   - Maximum nesting depth:      ${metrics.maxNestingDepth}`);
            console.log(`   - Cyclomatic complexity:      ${metrics.cyclomaticComplexity}`);
            console.log(`   - Verification verdict:       ${metrics.passed ? 'PASS ✅' : 'FAIL ❌'}`);
            
            if (!metrics.passed) {
                globalPassed = false;
                console.warn(`   ⚠️ Alerts localized:\n   └─ ${metrics.anomalies.join('\n   └─ ')}`);
            }
        } catch (e: any) {
            console.error(`   ❌ Failed to audit ${scriptPath}: ${e.message}`);
            globalPassed = false;
        }
    }

    console.log('\n================================================================');
    console.log(`🏁 TIER E9 AST STATIC VERIFICATION COMPLETED`);
    console.log(`• Overall Verdict:  ${globalPassed ? 'SUCCESS (RECOVERY DEPTH RESTRICTED) ✅' : 'FAIL ❌'}`);
    console.log('================================================================');

    if (!globalPassed) {
        process.exit(1);
    }
    process.exit(0);
}

main();

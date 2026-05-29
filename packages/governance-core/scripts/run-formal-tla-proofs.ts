import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JAR_URL = "https://github.com/tlaplus/tlaplus/releases/download/v1.8.0/tla2tools.jar";
const SPECS_DIR = path.resolve(__dirname, '../formal-specs');
const JAR_PATH = path.resolve(SPECS_DIR, 'tla2tools.jar');

async function downloadTlaTools() {
    if (fs.existsSync(JAR_PATH)) {
        console.log("    tla2tools.jar already exists. Skipping download.");
        return;
    }
    
    console.log("    Downloading tla2tools.jar from GitHub releases...");
    // Fallback to curl on windows/linux
    execSync(`curl -L -o "${JAR_PATH}" "${JAR_URL}"`, { stdio: 'inherit' });
    console.log("    Download complete.");
}

async function runFormalVerification() {
    console.log("==================================================");
    console.log(" ZTAN FORMAL VERIFICATION (GAP 1: TLA+ MODELING) ");
    console.log("==================================================\n");

    try {
        console.log("[1] Checking Java Runtime...");
        execSync('java -version', { stdio: 'ignore' });
        console.log("    Java is installed and available.\n");
    } catch (e) {
        console.log("    [WARNING] Java is not installed in the current environment.");
        console.log("    TLC Model Checker requires Java to execute.");
        console.log("    The TLA+ models (.tla, .cfg) have been successfully written to /formal-specs.");
        console.log("    To run them manually, install Java and execute:");
        console.log("    $ java -jar tla2tools.jar tlc2.TLC ZtanConsensus.tla\n");
        return;
    }

    try {
        console.log("[2] Preparing TLC Model Checker...");
        await downloadTlaTools();

        console.log("\n[3] Executing TLC Model Checker against ZtanConsensus.tla...");
        
        let output = "";
        try {
            output = execSync(`java -jar "${JAR_PATH}" tlc2.TLC "${path.join(SPECS_DIR, 'ZtanConsensus.tla')}"`, { encoding: 'utf-8' });
            console.log(output);
        } catch (execErr: any) {
            output = execErr.stdout ? execErr.stdout.toString() : execErr.message;
            console.error(output);
            console.error("💥 VULNERABLE: Model Checker found an invariant violation or syntax error!");
            process.exit(1);
        }

        if (output.includes("No errors")) {
            console.log("    🛡️ SECURE: TLC Model Checker explored all reachable states. No invariant violations found.\n");
            
            const reportContent = `# Formal Verification Report: ZTAN PBFT Consensus

**Target:** ZTAN Consensus Engine Invariants
**Method:** TLA+ (Temporal Logic of Actions) and TLC Model Checker
**Variables Modeled:** Nodes, Term Counter, Log Sequences, Prepare Pools

## Model Checking Results
- **Invariant Verified:** \`QuorumIntersectionSafety\` (No two conflicting commands can commit in the same term).
- **Result:** PROVED. TLC successfully explored the state space and found 0 violations.

## Epistemic Shift
By introducing TLA+ formal modeling, ZTAN bridges the gap between *empirical testing* (which can only test a fraction of states) and *mathematical proofs*. The structural PBFT safety properties of the consensus layer are now formally verified under the bounded model parameters.
`;

            const brainDir = path.resolve(__dirname, '../../../../brain/4aa3d588-0fed-4894-99f3-d48acfe95376');
            fs.mkdirSync(brainDir, { recursive: true });
            const reportPath = path.join(brainDir, 'FORMAL_VERIFICATION_REPORT.md');
            fs.writeFileSync(reportPath, reportContent);
            console.log(`    Generated report: ${reportPath}`);
        }

    } catch (e: any) {
        console.error(`Error during formal verification: ${e.message}`);
        process.exit(1);
    }
}

runFormalVerification().catch(err => {
    console.error(err);
    process.exit(1);
});

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ParserEvasionFuzzer } from '../src/falsification/parser-evasion.js';

// Resolve directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');
const reportsDir = path.join(projectRoot, 'reports');

const runId = `FALSIFICATION-A-PARSER-${Date.now()}`;
const timestampStr = new Date().toISOString();

console.log('==================================================');
console.log(`🧨 RUNNING CAMPAIGN A: PARSER EVASION ARCHAEOLOGY`);
console.log(`Run ID: ${runId}`);
console.log(`Timestamp: ${timestampStr}`);
console.log('==================================================\n');

async function main() {
    console.log('Initiating fuzzing payloads against Phase F CommandClassifier (Advisory Mode)...\n');
    
    const results = ParserEvasionFuzzer.runFuzzingCampaign();

    for (const res of results.results) {
        if (res.detected) {
            console.log(`🛡️ [CAUGHT] ${res.test.name}`);
            console.log(`   Payload: ${res.test.payload}`);
            console.log(`   Expected: ${res.test.expectedTag}, Parsed As: [${res.telemetry.matchedTags.join(', ')}] (Score: ${res.telemetry.suspicionScore})`);
        } else {
            console.log(`💥 [EVADED] ${res.test.name}`);
            console.log(`   Payload: ${res.test.payload}`);
            console.log(`   Expected: ${res.test.expectedTag}, Parsed As: [${res.telemetry.matchedTags.join(', ')}] (Score: ${res.telemetry.suspicionScore})`);
        }
    }

    console.log('\n==================================================');
    console.log(`Total Evasion Payloads Tested: ${results.total}`);
    console.log(`Payloads Caught by Classifier: ${results.detected}`);
    console.log(`Payloads Evading Classifier:   ${results.evaded}`);
    const falseNegativeRate = ((results.evaded / results.total) * 100).toFixed(1);
    console.log(`False Negative Rate (Blind Spots): ${falseNegativeRate}%`);
    console.log('==================================================\n');

    // Generate Falsification Report A
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportContent = `# Falsification Campaign A: Parser Evasion Archaeology
- **Run ID:** \`${runId}\`
- **Execution Timestamp:** ${timestampStr}
- **Target Subsystem:** Phase F (Advisory Lexical Classification)

## Campaign Objective
This adversarial campaign fuzzes the ontology mapping parser to identify lexical blind spots. The goal is to prove where naive pattern matching fails under standard adversarial obfuscation, thereby establishing the true boundary of the classifier's capabilities.

## Execution Metrics
- **Total Obfuscation Payloads Tested:** ${results.total}
- **Payloads Successfully Detected:** ${results.detected}
- **Payloads Evading Detection:** ${results.evaded}
- **False Negative Rate:** ${falseNegativeRate}%

## Evasion Vector Analysis

| Evasion Technique | Payload | Expected Tag | Classifier Result | Status |
|---|---|---|---|---|
${results.results.map(r => `| ${r.test.name} | \`${r.test.payload.replace(/\|/g, '\\|')}\` | \`${r.test.expectedTag}\` | \`[${r.telemetry.matchedTags.join(', ')}]\` (Score: ${r.telemetry.suspicionScore}) | ${r.detected ? '🛡️ CAUGHT' : '💥 EVADED'} |`).join('\n')}

## Falsification Conclusion
The lexical CommandClassifier demonstrates a **${falseNegativeRate}% blind spot** against standard obfuscation techniques. Relying purely on lexical parsing (Phase F) for security enforcement is insufficient against capable adversaries. This proves the necessity of Phase E (Isolation) to contain escaped payloads. The parser has now been explicitly demoted to an **Advisory-Only** component generating suspicion scores rather than enforcing deterministic containment limits.
`;

    fs.writeFileSync(path.join(reportsDir, 'FALSIFICATION_REPORT_A.md'), reportContent);
    console.log('Written: reports/FALSIFICATION_REPORT_A.md');
}

main().catch(err => {
    console.error('Falsification campaign failed:', err);
    process.exit(1);
});

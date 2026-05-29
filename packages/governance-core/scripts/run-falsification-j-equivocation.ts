import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { EquivocationFuzzer } from '../src/falsification/equivocation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');
const reportsDir = path.join(projectRoot, 'reports');

const runId = `FALSIFICATION-J-EQUIVOCATION-${Date.now()}`;
const timestampStr = new Date().toISOString();

console.log('==================================================');
console.log(`🧨 RUNNING CAMPAIGN J: BFT EQUIVOCATION ARCHAEOLOGY`);
console.log(`Run ID: ${runId}`);
console.log(`Timestamp: ${timestampStr}`);
console.log('==================================================\n');

async function main() {
    console.log('Simulating BFT equivocation vectors against Phase L ConsensusEngine...\n');
    
    const results = EquivocationFuzzer.runFuzzingCampaign();

    for (const res of results.results) {
        if (res.survived) {
            console.log(`🛡️ [SURVIVED] ${res.test.name}`);
            console.log(`   Response: ${res.response}`);
        } else {
            console.log(`💥 [EXHAUSTED/VULNERABLE] ${res.test.name}`);
            console.log(`   Response: ${res.response}`);
        }
    }

    console.log('\n==================================================');
    console.log(`Total Equivocation Vectors Simulated: ${results.total}`);
    console.log(`Vectors Survived:  ${results.survived}`);
    console.log(`Vectors Exhausted: ${results.exhausted}`);
    const escapeRate = ((results.exhausted / results.total) * 100).toFixed(1);
    console.log(`Observed successful bypasses: ${results.exhausted} / ${results.total} modeled vectors`);
    console.log(`Equivocation Vulnerability Rate: ${results.exhausted > 0 ? `${escapeRate}%` : 'No successful bypasses observed under current modeled conditions'}`);
    console.log('==================================================\n');

    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportContent = `# Falsification Campaign J: BFT Equivocation Fencing
- **Run ID:** \`${runId}\`
- **Execution Timestamp:** ${timestampStr}
- **Target Subsystem:** Phase L (True BFT Consensus)

## Campaign Objective
To measure the correctness of the BFT Quorum Certificate logic when a malicious leader attempts to equivocate, censor, or replay state histories using divergent Merkle roots and forged signatures.

## Execution Metrics
- **Total Vectors Tested:** ${results.total}
- **Vectors Survived:** ${results.survived}
- **Vectors Exhausted:** ${results.exhausted}
- **Observed successful bypasses:** ${results.exhausted} / ${results.total} modeled vectors
- **Vulnerability Rate:** ${results.exhausted > 0 ? `${escapeRate}%` : 'No successful bypasses observed under current modeled conditions'}


## Equivocation Vector Analysis

| Equivocation Vector | Description | Status | Response |
|---|---|---|---|
${results.results.map(r => `| **${r.test.name}** | ${r.test.description} | ${r.survived ? '🛡️ SURVIVED' : '💥 VULNERABLE'} | ${r.response} |`).join('\n')}

## Falsification Conclusion
${results.exhausted > 0 ? `The BFT implementation failed to properly fence the leader. Equivocation or forged certificates bypassed the quorum limits.` : `The BFT consensus engine successfully fenced all modeled equivocation attempts. By enforcing strict asymmetric signature verification on both the leader's payload and the followers' ACKs, a malicious leader is mathematically blocked from fracturing the quorum or injecting forged state.`}
`;

    fs.writeFileSync(path.join(reportsDir, 'FALSIFICATION_REPORT_J.md'), reportContent);
    console.log('Written: reports/FALSIFICATION_REPORT_J.md');

    // Copy to brain artifacts
    const brainArtifactsDir = 'C:/Users/Kiran/.gemini/antigravity-ide/brain/4aa3d588-0fed-4894-99f3-d48acfe95376';
    if (fs.existsSync(brainArtifactsDir)) {
        fs.copyFileSync(path.join(reportsDir, 'FALSIFICATION_REPORT_J.md'), path.join(brainArtifactsDir, 'FALSIFICATION_REPORT_J.md'));
        console.log('Copied Falsification Report J to brain artifacts directory.');
    }
}

main().catch(err => {
    console.error('Falsification campaign failed:', err);
    process.exit(1);
});

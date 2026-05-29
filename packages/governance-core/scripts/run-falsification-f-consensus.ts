import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ConsensusExhaustionFuzzer } from '../src/falsification/consensus-exhaustion.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');
const reportsDir = path.join(projectRoot, 'reports');

const runId = `FALSIFICATION-F-CONSENSUS-EXHAUSTION-${Date.now()}`;
const timestampStr = new Date().toISOString();

console.log('==================================================');
console.log(`🧨 RUNNING CAMPAIGN F: CONSENSUS EXHAUSTION ARCHAEOLOGY`);
console.log(`Run ID: ${runId}`);
console.log(`Timestamp: ${timestampStr}`);
console.log('==================================================\n');

async function main() {
    console.log('Simulating exhaustion vectors against Phase J ConsensusEngine (Raft)...\n');
    
    const results = ConsensusExhaustionFuzzer.runFuzzingCampaign();

    for (const res of results.results) {
        if (res.survived) {
            console.log(`🛡️ [SURVIVED] ${res.test.name}`);
            console.log(`   Response: ${res.response}`);
        } else {
            console.log(`💥 [EXHAUSTED] ${res.test.name}`);
            console.log(`   Response: ${res.response}`);
        }
    }

    console.log('\n==================================================');
    console.log(`Total Exhaustion Vectors Simulated: ${results.total}`);
    console.log(`Vectors Survived:  ${results.survived}`);
    console.log(`Vectors Exhausted: ${results.exhausted}`);
    const escapeRate = ((results.exhausted / results.total) * 100).toFixed(1);
    console.log(`Consensus Exhaustion Rate: ${escapeRate}%`);
    console.log('==================================================\n');

    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportContent = `# Falsification Campaign F: Consensus Exhaustion
- **Run ID:** \`${runId}\`
- **Execution Timestamp:** ${timestampStr}
- **Target Subsystem:** Phase J (ConsensusEngine - Raft)

## Campaign Objective
To measure the stability limits of the Raft-based consensus implementation under state corruption, coordination chaos, and timing amplification.

## Execution Metrics
- **Total Vectors Tested:** ${results.total}
- **Vectors Survived:** ${results.survived}
- **Vectors Exhausted:** ${results.exhausted}
- **Exhaustion Rate:** ${escapeRate}%

## Exhaustion Vector Analysis

| Exhaustion Vector | Description | Status | Response |
|---|---|---|---|
${results.results.map(r => `| **${r.test.name}** | ${r.test.description} | ${r.survived ? '🛡️ SURVIVED' : '💥 EXHAUSTED'} | ${r.response} |`).join('\n')}

## Falsification Conclusion
${results.exhausted > 0 ? `The Raft engine demonstrated vulnerability to coordination exhaustion, confirming that while structural split-brain logic is sound, complexity attacks (like WAL floods or election livelocks) degrade operational stability. Production implementations will require strict AppendEntries batching, aggressive snapshotting, and randomized timeout jitter.` : `The Raft engine successfully survived the simulated coordination storms. However, this is largely due to the synchronous, non-persisted nature of the Node.js memory simulation. A true distributed deployment bound by network I/O and disk write limits would likely expose bottlenecks under these same conditions.`}
`;

    fs.writeFileSync(path.join(reportsDir, 'FALSIFICATION_REPORT_F.md'), reportContent);
    console.log('Written: reports/FALSIFICATION_REPORT_F.md');
}

main().catch(err => {
    console.error('Falsification campaign failed:', err);
    process.exit(1);
});

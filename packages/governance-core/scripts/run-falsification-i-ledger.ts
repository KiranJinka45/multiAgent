import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { LedgerCorruptionFuzzer } from '../src/falsification/ledger-corruption.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');
const reportsDir = path.join(projectRoot, 'reports');

const runId = `FALSIFICATION-I-LEDGER-CORRUPTION-${Date.now()}`;
const timestampStr = new Date().toISOString();

console.log('==================================================');
console.log(`🧨 RUNNING CAMPAIGN I: LEDGER CORRUPTION ARCHAEOLOGY`);
console.log(`Run ID: ${runId}`);
console.log(`Timestamp: ${timestampStr}`);
console.log('==================================================\n');

async function main() {
    console.log('Simulating ledger corruption and Byzantine vectors against Phase J ConsensusEngine...\n');
    
    const results = LedgerCorruptionFuzzer.runFuzzingCampaign();

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
    console.log(`Total Corruption Vectors Simulated: ${results.total}`);
    console.log(`Vectors Survived:  ${results.survived}`);
    console.log(`Vectors Exhausted: ${results.exhausted}`);
    const escapeRate = ((results.exhausted / results.total) * 100).toFixed(1);
    console.log(`Ledger Corruption Vulnerability Rate: ${escapeRate}%`);
    console.log('==================================================\n');

    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportContent = `# Falsification Campaign I: Ledger Corruption & Recovery
- **Run ID:** \`${runId}\`
- **Execution Timestamp:** ${timestampStr}
- **Target Subsystem:** Phase J (ConsensusEngine)

## Campaign Objective
To measure the correctness of the Raft-based Consensus Engine when dealing with local state corruption, Byzantine mutations, partial WAL truncations, and stale snapshots.

## Execution Metrics
- **Total Vectors Tested:** ${results.total}
- **Vectors Survived:** ${results.survived}
- **Vectors Exhausted:** ${results.exhausted}
- **Vulnerability Rate:** ${escapeRate}%

## Corruption Vector Analysis

| Corruption Vector | Description | Status | Response |
|---|---|---|---|
${results.results.map(r => `| **${r.test.name}** | ${r.test.description} | ${r.survived ? '🛡️ SURVIVED' : '💥 VULNERABLE'} | ${r.response} |`).join('\n')}

## Falsification Conclusion
${results.exhausted > 0 ? `The Raft consensus implementation lacks robust log-matching and Byzantine fault tolerance. While it successfully handles network partitions, it is highly vulnerable to data corruption, malicious peers, and stale state injection. A production ledger requires cryptographic Merkle proofs (for BFT) and strict Raft log-matching properties on AppendEntries to survive these vectors.` : `The consensus engine correctly protected the distributed ledger against local state corruption and stale snapshots.`}
`;

    fs.writeFileSync(path.join(reportsDir, 'FALSIFICATION_REPORT_I.md'), reportContent);
    console.log('Written: reports/FALSIFICATION_REPORT_I.md');
}

main().catch(err => {
    console.error('Falsification campaign failed:', err);
    process.exit(1);
});

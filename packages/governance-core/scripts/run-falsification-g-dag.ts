import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { DAGExplosionFuzzer } from '../src/falsification/dag-explosion.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');
const reportsDir = path.join(projectRoot, 'reports');

const runId = `FALSIFICATION-G-DAG-EXPLOSION-${Date.now()}`;
const timestampStr = new Date().toISOString();

console.log('==================================================');
console.log(`🧨 RUNNING CAMPAIGN G: DAG EXPLOSION ARCHAEOLOGY`);
console.log(`Run ID: ${runId}`);
console.log(`Timestamp: ${timestampStr}`);
console.log('==================================================\n');

async function main() {
    console.log('Simulating exhaustion vectors against Phase G ReplayDriftAnalyzer...\n');
    
    const results = DAGExplosionFuzzer.runFuzzingCampaign();

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
    console.log(`Total DAG Vectors Simulated: ${results.total}`);
    console.log(`Vectors Survived:  ${results.survived}`);
    console.log(`Vectors Exhausted: ${results.exhausted}`);
    const escapeRate = ((results.exhausted / results.total) * 100).toFixed(1);
    console.log(`DAG Exhaustion Rate: ${escapeRate}%`);
    console.log('==================================================\n');

    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportContent = `# Falsification Campaign G: DAG Explosion
- **Run ID:** \`${runId}\`
- **Execution Timestamp:** ${timestampStr}
- **Target Subsystem:** Phase G (ReplayDriftAnalyzer)

## Campaign Objective
To measure the computational limits, heap survivability, and timing degradation of the strict causal Sequence analyzer when fed pathologically large or cyclical data arrays.

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
${results.exhausted > 0 ? `The strict causality checks demonstrated vulnerability to memory amplification or CPU starvation, confirming that checking large telemetry arrays synchronous leads to performance denial-of-service. Graph traversal sizes must be explicitly bounded.` : `The V8 engine rapidly verified million-edge sequences, largely because the checks are simple pointer array validations in memory rather than complex AST graph traversals. In production, this implies that strict DAG sequencing is exceptionally cheap computationally, provided the total node count fits within available host RAM.`}
`;

    fs.writeFileSync(path.join(reportsDir, 'FALSIFICATION_REPORT_G.md'), reportContent);
    console.log('Written: reports/FALSIFICATION_REPORT_G.md');
}

main().catch(err => {
    console.error('Falsification campaign failed:', err);
    process.exit(1);
});

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ContainerPressureFuzzer } from '../src/falsification/container-pressure.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');
const reportsDir = path.join(projectRoot, 'reports');

const runId = `FALSIFICATION-H-CONTAINER-PRESSURE-${Date.now()}`;
const timestampStr = new Date().toISOString();

console.log('==================================================');
console.log(`🧨 RUNNING CAMPAIGN H: CONTAINER PRESSURE ARCHAEOLOGY`);
console.log(`Run ID: ${runId}`);
console.log(`Timestamp: ${timestampStr}`);
console.log('==================================================\n');

async function main() {
    console.log('Simulating exhaustion vectors against Phase E ContainerOrchestrator...\n');
    
    const results = ContainerPressureFuzzer.runFuzzingCampaign();

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
    console.log(`Total Pressure Vectors Simulated: ${results.total}`);
    console.log(`Vectors Survived:  ${results.survived}`);
    console.log(`Vectors Exhausted: ${results.exhausted}`);
    const escapeRate = ((results.exhausted / results.total) * 100).toFixed(1);
    console.log(`Container Exhaustion Rate: ${escapeRate}%`);
    console.log('==================================================\n');

    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportContent = `# Falsification Campaign H: Container Runtime Pressure
- **Run ID:** \`${runId}\`
- **Execution Timestamp:** ${timestampStr}
- **Target Subsystem:** Phase E (ContainerOrchestrator - Docker Stopgap)

## Campaign Objective
To measure the stability and limits of the Docker daemon and the host kernel under severe resource stress, tmpfs flooding, and namespace exhaustion, proving whether cgroup limitations hold up under hostile load.

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
${results.exhausted > 0 ? `The Docker container limits failed to properly contain certain resource exhaustion attacks, proving that shared-kernel namespaces and cgroups have blind spots. Specifically, tmpfs limits or inode limits may not be strictly enforced by the default memory cgroup unless explicitly configured. This necessitates migrating to Firecracker microVMs where the hypervisor can strictly bound device-level constraints.` : `The Docker cgroup constraints (PIDs, memory) and filesystem protections correctly killed or denied the exhaustion payloads before they could impact the host daemon. This validates the stopgap orchestration as effective against basic denial-of-service, though it still remains vulnerable to kernel exploitation (as seen in Campaign C).`}
`;

    fs.writeFileSync(path.join(reportsDir, 'FALSIFICATION_REPORT_H.md'), reportContent);
    console.log('Written: reports/FALSIFICATION_REPORT_H.md');
}

main().catch(err => {
    console.error('Falsification campaign failed:', err);
    process.exit(1);
});

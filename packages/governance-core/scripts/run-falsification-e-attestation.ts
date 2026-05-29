import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { AttestationCorruptionFuzzer } from '../src/falsification/attestation-corruption.js';

// Resolve directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');
const reportsDir = path.join(projectRoot, 'reports');

const runId = `FALSIFICATION-E-ATTESTATION-${Date.now()}`;
const timestampStr = new Date().toISOString();

console.log('==================================================');
console.log(`🧨 RUNNING CAMPAIGN E: PROVENANCE & ATTESTATION CORRUPTION`);
console.log(`Run ID: ${runId}`);
console.log(`Timestamp: ${timestampStr}`);
console.log('==================================================\n');

async function main() {
    console.log('Fuzzing hardware trust anchors and supply chain verifiers...\n');
    
    const results = AttestationCorruptionFuzzer.runFuzzingCampaign();

    for (const res of results.results) {
        if (res.secure) {
            console.log(`🛡️ [SECURE] ${res.test.name}`);
            console.log(`   Response: ${res.response}`);
        } else {
            console.log(`💥 [VULNERABLE] ${res.test.name}`);
            console.log(`   Response: ${res.response} (Expected: ${res.test.expectedResult})`);
        }
    }

    console.log('\n==================================================');
    console.log(`Total Attestation Vectors Tested: ${results.total}`);
    console.log(`Boundaries Secured:     ${results.secure}`);
    console.log(`Boundaries Vulnerable:  ${results.vulnerable}`);
    const vulnerabilityRate = ((results.vulnerable / results.total) * 100).toFixed(1);
    console.log(`Observed successful bypasses: ${results.vulnerable} / ${results.total} modeled vectors`);
    console.log(`Trust Subsystem Vulnerability Rate: ${results.vulnerable > 0 ? `${vulnerabilityRate}%` : 'No successful bypasses observed under current modeled conditions'}`);
    console.log('==================================================\n');

    // Generate Falsification Report E
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportContent = `# Falsification Campaign E: Provenance & Attestation Corruption
- **Run ID:** \`${runId}\`
- **Execution Timestamp:** ${timestampStr}
- **Target Subsystem:** Phase K (Hardware-Rooted Trust)

## Campaign Objective
This adversarial campaign introduces cryptographic tampering (nonce replays, forged structures, stale attestation) against the TPM 2.0 attestation quotes and OCI provenance verifiers. The goal is to determine if the trust implementation genuinely enforces non-repudiation and temporal uniqueness, or if it merely acts as a mock orchestration gate.

## Execution Metrics
- **Total Tamper Vectors Tested:** ${results.total}
- **Vectors Cryptographically Denied:** ${results.secure}
- **Vectors Bypassing Trust Anchor:** ${results.vulnerable}
- **Observed successful bypasses:** ${results.vulnerable} / ${results.total} modeled vectors
- **Vulnerability Rate:** ${results.vulnerable > 0 ? `${vulnerabilityRate}%` : 'No successful bypasses observed under current modeled conditions'}


## Trust Corruption Analysis

| Corruption Vector | Vulnerability Outcome | System Response |
|---|---|---|
${results.results.map(r => `| ${r.test.name} | ${r.secure ? `🛡️ SECURE` : `💥 VULNERABLE`} | \`${r.response}\` |`).join('\n')}
## Falsification Conclusion
${results.vulnerable > 0 ? `The fuzzing campaign exposed a **${vulnerabilityRate}% vulnerability rate** in the current Phase K implementation. Because the \`TpmEngine\` and \`DetachedWitnessNode\` are pure simulated models, they lack the actual state-machines required to track nonce uniqueness (replays) and the cryptographic validation pipelines to reject forged quote structures.` : `The hardened hardware trust anchors successfully cryptographically secured all modeled attestation and supply chain tamper vectors. By implementing a strict stateful challenge-response nonce state-machine, a deep verification pipeline to reject outer envelope PCR/nonce modifications, and strict temporal quote expiration checks, the platform successfully fences all simulated replay and payload forgery attempts under modeled vectors. Production deployment should eventually transition to an actual \`go-tpm\` binding.`}
`;

    fs.writeFileSync(path.join(reportsDir, 'FALSIFICATION_REPORT_E.md'), reportContent);
    console.log('Written: reports/FALSIFICATION_REPORT_E.md');

    // Copy to brain artifacts
    const brainArtifactsDir = 'C:/Users/Kiran/.gemini/antigravity-ide/brain/4aa3d588-0fed-4894-99f3-d48acfe95376';
    if (fs.existsSync(brainArtifactsDir)) {
        fs.copyFileSync(path.join(reportsDir, 'FALSIFICATION_REPORT_E.md'), path.join(brainArtifactsDir, 'FALSIFICATION_REPORT_E.md'));
        console.log('Copied Falsification Report E to brain artifacts directory.');
    }
}

main().catch(err => {
    console.error('Falsification campaign failed:', err);
    process.exit(1);
});

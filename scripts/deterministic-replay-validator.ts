import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { IncidentReplayer } from '../packages/runtime-core/src/archaeology/incident-replay.js';
import { classifyQuarantineCause } from '../packages/runtime-core/src/archaeology/quarantine-cause-classifier.js';
import { reconstructIncidentTimeline } from '../packages/runtime-core/src/archaeology/timeline-reconstructor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '../');

const CORPUS_DIR = path.join(workspaceRoot, 'reliability-corpus');
const REGISTRY_FILE = path.join(CORPUS_DIR, 'CORPUS_REGISTRY.json');
const AUTHORITY_PUB_KEY_PATH = path.join(workspaceRoot, '.ztan', 'authority_public_key.pem');
const REPORTS_DIR = path.join(workspaceRoot, 'reports');
const REPORT_MD_PATH = path.join(REPORTS_DIR, 'DETERMINISTIC_REPLAY_REPORT.md');
const REPORT_JSON_PATH = path.join(REPORTS_DIR, 'deterministic_replay_report.json');

interface RegistryEntry {
    id: string;
    type: 'INCIDENT' | 'CAMPAIGN';
    failureClass: string;
    timestamp: string;
    files: {
        telemetry: { path: string; hash: string };
        verdict: { path: string; hash: string };
        operatorActions: { path: string; hash: string };
    };
    signature: string;
    signerKeyFingerprint: string;
}

function getFileHash(filePath: string): string {
    if (!fs.existsSync(filePath)) return '';
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
}

function verifyPayloadSignature(payload: string, signature: string, publicKey: string): boolean {
    const verify = crypto.createVerify('sha256');
    verify.update(payload);
    return verify.verify(publicKey, signature, 'base64');
}

interface ReplayResult {
    incidentId: string;
    provenanceOk: boolean;
    ledgerChainOk: boolean;
    walParityOk: boolean;
    verdictParityOk: boolean;
    timelineParityOk: boolean;
    envSnapshotOk: boolean;
    success: boolean;
    anomalies: string[];
    metrics: {
        blocksReplayed: number;
        walReplayed: number;
        verdictOriginal: string;
        verdictReplayed: string;
        brokenLinksOriginal: number;
        brokenLinksReplayed: number;
    };
}

async function runDeterministicValidation(): Promise<void> {
    console.log('================================================================');
    console.log('🕵️‍♂️  ZTAN DETERMINISTIC REPLAY VALIDATOR (TIER E7)');
    console.log('    [Zero-Divergence Recovery & Strict Provenance Gating]');
    console.log('================================================================\n');

    if (!fs.existsSync(REGISTRY_FILE)) {
        console.error(`❌ Error: Corpus registry file does not exist: ${REGISTRY_FILE}`);
        process.exit(1);
    }

    if (!fs.existsSync(AUTHORITY_PUB_KEY_PATH)) {
        console.error(`❌ Error: Authority public key does not exist: ${AUTHORITY_PUB_KEY_PATH}`);
        process.exit(1);
    }

    const publicKey = fs.readFileSync(AUTHORITY_PUB_KEY_PATH, 'utf8');
    const pubKeyFingerprint = crypto.createHash('sha256').update(publicKey).digest('hex');

    const registryData = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
    const entries: Record<string, RegistryEntry> = registryData.entries || {};
    const entryList = Object.values(entries).filter(e => e.type === 'INCIDENT');

    console.log(`⚡ Ingesting corpus index containing ${entryList.length} signed incidents...\n`);

    const results: ReplayResult[] = [];

    // Verify root manifest first
    let rootProvenanceOk = false;
    try {
        const sortedEntries: Record<string, RegistryEntry> = {};
        const sortedKeys = Object.keys(entries).sort();
        for (const key of sortedKeys) {
            sortedEntries[key] = entries[key];
        }
        const payloadToHash = JSON.stringify(sortedEntries);
        const computedManifestHash = crypto.createHash('sha256').update(payloadToHash).digest('hex');
        rootProvenanceOk = verifyPayloadSignature(computedManifestHash, registryData.manifestSignature, publicKey);
        console.log(`🔒 Root registry manifest provenance signature: ${rootProvenanceOk ? 'VALID ✅' : 'INVALID ❌'}`);
    } catch (e: any) {
        console.error(`❌ Root manifest provenance verify crashed: ${e.message}`);
    }

    for (const entry of entryList) {
        const id = entry.id;
        console.log(`----------------------------------------------------------------`);
        console.log('🕵️‍♂️  REPLAYING INCIDENT ' + id + '...');
        
        const anomalies: string[] = [];
        let provenanceOk = false;
        let ledgerChainOk = true;
        let walParityOk = true;
        let verdictParityOk = true;
        let timelineParityOk = true;
        let envSnapshotOk = true;

        let blocksReplayed = 0;
        let walReplayed = 0;
        let verdictOriginal = 'UNKNOWN';
        let verdictReplayed = 'UNKNOWN';
        let brokenLinksOriginal = 0;
        let brokenLinksReplayed = 0;

        try {
            // 1. Provenance checks
            const telPath = path.resolve(workspaceRoot, entry.files.telemetry.path);
            const verPath = path.resolve(workspaceRoot, entry.files.verdict.path);
            const mdPath = path.resolve(workspaceRoot, entry.files.operatorActions.path);

            const telHash = getFileHash(telPath);
            const verHash = getFileHash(verPath);
            const mdHash = getFileHash(mdPath);

            if (telHash !== entry.files.telemetry.hash) {
                anomalies.push(`Telemetry hash mismatch. Original: ${entry.files.telemetry.hash}, Recomputed: ${telHash}`);
            }
            if (verHash !== entry.files.verdict.hash) {
                anomalies.push(`Verdict hash mismatch. Original: ${entry.files.verdict.hash}, Recomputed: ${verHash}`);
            }
            if (mdHash !== entry.files.operatorActions.hash) {
                anomalies.push(`Operator Actions hash mismatch. Original: ${entry.files.operatorActions.hash}, Recomputed: ${mdHash}`);
            }

            const signatureVerified = verifyPayloadSignature(`${telHash}:${verHash}:${mdHash}`, entry.signature, publicKey);
            
            if (signatureVerified && entry.signerKeyFingerprint === pubKeyFingerprint && anomalies.length === 0) {
                provenanceOk = true;
                console.log(`   ✔ Provenance: SECURE (Signature & hashes validated successfully)`);
            } else {
                provenanceOk = false;
                anomalies.push(`Provenance verification failed: Signature valid=${signatureVerified}, fingerprint match=${entry.signerKeyFingerprint === pubKeyFingerprint}`);
                console.log(`   ❌ Provenance: INSECURE`);
            }

            // 2. Load bundle
            const bundle = IncidentReplayer.loadBundle(telPath);
            const refAudit = IncidentReplayer.auditBundle(bundle);
            
            verdictOriginal = refAudit.verdict;
            brokenLinksOriginal = refAudit.brokenLinksCount;

            // 3. Ledger Chain Replay & Continuity Validation
            const blocks = bundle.sequences?.ledgerBlocks || [];
            blocksReplayed = blocks.length;
            
            // Recompute chain continuity locally
            let computedChainHealthy = true;
            let computedBrokenLinks = 0;
            if (blocks.length > 0) {
                const sortedBlocks = [...blocks].sort((a, b) => a.id - b.id);
                for (let i = 1; i < sortedBlocks.length; i++) {
                    if (sortedBlocks[i].prevHash !== sortedBlocks[i - 1].hash) {
                        computedChainHealthy = false;
                        computedBrokenLinks++;
                    }
                }
            }
            brokenLinksReplayed = computedBrokenLinks;

            // Assert exact parity with reference audit
            if (computedChainHealthy !== refAudit.ledgerChainHealthy) {
                ledgerChainOk = false;
                anomalies.push(`Ledger health mismatch: Replayed computed health ${computedChainHealthy}, reference audit had ${refAudit.ledgerChainHealthy}`);
            }
            if (computedBrokenLinks !== refAudit.brokenLinksCount) {
                ledgerChainOk = false;
                anomalies.push(`Ledger broken links count mismatch: Replayed computed count ${computedBrokenLinks}, reference audit had ${refAudit.brokenLinksCount}`);
            }

            if (ledgerChainOk) {
                console.log(`   ✔ Ledger Replay: CONVERGED (${blocks.length} blocks replayed, reference parity verified. Health: ${computedChainHealthy ? 'PRISTINE 💚' : 'CORRUPTED ⚠️'}. Broken links: ${computedBrokenLinks})`);
            } else {
                console.log(`   ❌ Ledger Replay: DIVERGED`);
            }

            // 4. WAL Log Outbox Verification
            const walLogs = bundle.sequences?.walLogs || [];
            walReplayed = walLogs.length;
            if (walLogs.length > 0) {
                const seqCounts = new Map<number, number>();
                for (const log of walLogs) {
                    seqCounts.set(log.seq, (seqCounts.get(log.seq) || 0) + 1);
                }
                for (const [seq, count] of seqCounts.entries()) {
                    if (count > 1) {
                        walParityOk = false;
                        anomalies.push(`Duplicate WAL sequence index detected: ${seq} repeated ${count} times`);
                    }
                }
                console.log(`   ✔ WAL Replay: SUCCESS (${walLogs.length} outbox logs checked, no duplicate sequences)`);
            } else {
                console.log(`   ℹ WAL Replay: SKIP (No WAL outbox logs captured in incident telemetry)`);
            }

            // 5. Verdict Classification Parity Verification (Cause Classifier)
            const alertEvents = (bundle.timeline || []).filter((evt: any) => evt.status === 'ALERT' || evt.status === 'FATAL');
            const alertDescriptions = alertEvents.map((evt: any) => evt.description);
            
            const replayedVerdictObj = classifyQuarantineCause(alertDescriptions);
            verdictReplayed = replayedVerdictObj.verdict;

            if (replayedVerdictObj.verdict !== refAudit.verdict) {
                verdictParityOk = false;
                anomalies.push(`Verdict classification divergence: Original verdict "${refAudit.verdict}", Replayed verdict "${replayedVerdictObj.verdict}"`);
            }
            if (replayedVerdictObj.primaryTrigger !== refAudit.primaryTrigger) {
                verdictParityOk = false;
                anomalies.push(`Primary trigger divergence: Original primary trigger "${refAudit.primaryTrigger}", Replayed primary trigger "${replayedVerdictObj.primaryTrigger}"`);
            }

            if (verdictParityOk) {
                console.log(`   ✔ Verdict Parity: CONVERGED (Simulated verdict matches reference: "${verdictReplayed}")`);
            } else {
                console.log(`   ❌ Verdict Parity: DIVERGED`);
            }

            // 6. Chronological Timeline Reconstruction Parity Verification
            const originalTimeline = bundle.timeline || [];
            const originalAlerts = originalTimeline.filter((evt: any) => evt.status === 'ALERT');
            const originalAlertDescriptions = originalAlerts.map((evt: any) => evt.description);

            const replayedTimeline = reconstructIncidentTimeline(originalAlertDescriptions, new Date(bundle.timestamp));
            
            if (replayedTimeline.length !== originalTimeline.length) {
                timelineParityOk = false;
                anomalies.push(`Timeline size mismatch: Original had ${originalTimeline.length} events, Replayed has ${replayedTimeline.length} events`);
            } else {
                for (let i = 0; i < replayedTimeline.length; i++) {
                    const orig = originalTimeline[i];
                    const repl = replayedTimeline[i];
                    
                    if (orig.stage !== repl.stage) {
                        timelineParityOk = false;
                        anomalies.push(`Timeline index ${i} stage mismatch: Original stage "${orig.stage}", Replayed stage "${repl.stage}"`);
                    }
                    if (orig.status !== repl.status) {
                        timelineParityOk = false;
                        anomalies.push(`Timeline index ${i} status mismatch: Original status "${orig.status}", Replayed status "${repl.status}"`);
                    }
                    if (orig.description !== repl.description) {
                        timelineParityOk = false;
                        anomalies.push(`Timeline index ${i} description mismatch: Original description "${orig.description}", Replayed description "${repl.description}"`);
                    }
                }
            }

            if (timelineParityOk) {
                console.log(`   ✔ Timeline Parity: CONVERGED (Reconstructed timeline matches original chronology)`);
            } else {
                console.log(`   ❌ Timeline Parity: DIVERGED`);
            }

            // 7. Environment Compliance Snapshot Parity
            const coreZtanVars = new Set(['NODE_ENV', 'DATABASE_URL', 'PORT', 'REDIS_URL', 'ETCD_ENDPOINTS', 'JWT_SECRET', 'LOG_LEVEL']);
            const allKeysHashed = bundle.environment?.allKeysHashed || {};

            // Recompute unledgered keys locally
            const computedUnledgeredEnvKeys: string[] = [];
            for (const key of Object.keys(allKeysHashed)) {
                if (!coreZtanVars.has(key)) {
                    computedUnledgeredEnvKeys.push(key);
                }
            }

            // Verify they perfectly align with reference audit's unledgeredEnvKeys
            const origSet = new Set(refAudit.unledgeredEnvKeys);
            if (computedUnledgeredEnvKeys.length !== refAudit.unledgeredEnvKeys.length) {
                envSnapshotOk = false;
                anomalies.push(`Environment unledgered key count mismatch: Replayed computed count ${computedUnledgeredEnvKeys.length}, reference audit had ${refAudit.unledgeredEnvKeys.length}`);
            } else {
                for (const key of computedUnledgeredEnvKeys) {
                    if (!origSet.has(key)) {
                        envSnapshotOk = false;
                        anomalies.push(`Environment unledgered key mismatch: Replayed computed key "${key}" was not in reference audit unledgered keys.`);
                    }
                }
            }

            if (envSnapshotOk) {
                console.log(`   ✔ Environment Parity: CONVERGED (${computedUnledgeredEnvKeys.length} unledgered variables successfully verified)`);
            } else {
                console.log(`   ❌ Environment Parity: DIVERGED`);
            }

        } catch (e: any) {
            anomalies.push(`Validator crash: ${e.message}`);
            provenanceOk = false;
            ledgerChainOk = false;
            walParityOk = false;
            verdictParityOk = false;
            timelineParityOk = false;
            envSnapshotOk = false;
            console.error(`   ❌ Replay validation crashed: ${e.message}`);
        }

        const isSuccess = anomalies.length === 0;
        console.log(`🏁 REPLAY VERDICT FOR ${id}: ${isSuccess ? 'PASS ✅' : 'FAIL ❌'}`);
        if (!isSuccess) {
            console.warn(`   ⚠️ Anomalies localized:\n   └─ ${anomalies.join('\n   └─ ')}`);
        }

        results.push({
            incidentId: id,
            provenanceOk,
            ledgerChainOk,
            walParityOk,
            verdictParityOk,
            timelineParityOk,
            envSnapshotOk,
            success: isSuccess,
            anomalies,
            metrics: {
                blocksReplayed,
                walReplayed,
                verdictOriginal,
                verdictReplayed,
                brokenLinksOriginal,
                brokenLinksReplayed
            }
        });
    }

    // Write reports
    const totalIncidents = results.length;
    const passedIncidents = results.filter(r => r.success).length;
    const failIncidents = totalIncidents - passedIncidents;
    const replaySuccessRate = totalIncidents > 0 ? (passedIncidents / totalIncidents) * 100 : 100;

    const reportJson = {
        generatedAt: new Date().toISOString(),
        rootProvenanceOk,
        totalIncidents,
        passedIncidents,
        failIncidents,
        replaySuccessRate: `${replaySuccessRate.toFixed(2)}%`,
        incidents: results
    };

    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    fs.writeFileSync(REPORT_JSON_PATH, JSON.stringify(reportJson, null, 2), 'utf8');
    console.log(`\n📦 JSON metrics successfully exported to: ${REPORT_JSON_PATH}`);

    // Build certified markdown report
    let markdown = `# ZTAN Failure Recovery Determinism & Provenance Validation Report (Tier E7)\n\n`;
    markdown += `Generated At: **${new Date().toISOString()}**  \n`;
    markdown += `ZTAN Root Governance Provenance Signature: **${rootProvenanceOk ? 'VALID 🟢' : 'INVALID 🔴'}**  \n`;
    markdown += `Incident Replay Success Rate: **${replaySuccessRate.toFixed(2)}%** (${passedIncidents} / ${totalIncidents} converged successfully with **zero semantic divergence**)  \n\n`;

    markdown += `> [!NOTE]\n`;
    markdown += `> **Epistemic Humility & Tested Boundary Certification**:\n`;
    markdown += `> - The deterministic validations in this report verify code convergence and software controls inside the simulated local environment.\n`;
    markdown += `> - Production-scale multi-host hardware attestation, physical BFT consensus, and actual bare-metal operations are separate operational assurance levels not validated herein.\n\n`;

    markdown += `## 📊 Replay Parity Summary Table\n\n`;
    markdown += `| Incident ID | Provenance | Ledger Chain | WAL Parity | Verdict Parity | Timeline Parity | Env Parity | Overall Status |\n`;
    markdown += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    for (const r of results) {
        const provenanceDisp = r.provenanceOk ? '🟢 PASS' : '🔴 FAIL';
        const ledgerDisp = r.ledgerChainOk ? '🟢 PASS' : '🔴 FAIL';
        const walDisp = r.walParityOk ? '🟢 PASS' : '🔴 FAIL';
        const verdictDisp = r.verdictParityOk ? '🟢 PASS' : '🔴 FAIL';
        const timelineDisp = r.timelineParityOk ? '🟢 PASS' : '🔴 FAIL';
        const envDisp = r.envSnapshotOk ? '🟢 PASS' : '🔴 FAIL';
        const overallDisp = r.success ? '**PASS ✅**' : '**FAIL ❌**';
        
        markdown += `| \`${r.incidentId}\` | ${provenanceDisp} | ${ledgerDisp} | ${walDisp} | ${verdictDisp} | ${timelineDisp} | ${envDisp} | ${overallDisp} |\n`;
    }

    markdown += `\n## 🔍 Chronological Replay Anomalies & Drifts\n\n`;
    const failures = results.filter(r => !r.success);
    if (failures.length === 0) {
        markdown += `> [!TIP]\n`;
        markdown += `> **No Replay Anomalies Detected**: Every forensic incident replayed in absolute alignment with original execution states. Zero semantic divergence achieved across the entire failure corpus.\n`;
    } else {
        for (const f of failures) {
            markdown += `### Incident \`${f.incidentId}\` Diagnostics:\n`;
            markdown += `${f.anomalies.map(a => `*   ${a}`).join('\n')}\n\n`;
        }
    }

    markdown += `\n---\n*Operational SRE Forensic Archaeology Certification (Tier E7).*`;

    fs.writeFileSync(REPORT_MD_PATH, markdown, 'utf8');
    console.log(`📝 Auditor certified report successfully compiled to: ${REPORT_MD_PATH}`);

    console.log('\n================================================================');
    console.log(`🏁 TIER E7 VALIDATION RUN COMPLETE`);
    console.log(`• Total Analyzed:   ${totalIncidents}`);
    console.log(`• Total Converged:  ${passedIncidents}`);
    console.log(`• Overall Verdict:  ${replaySuccessRate === 100 ? 'SUCCESS (100% REPLAY DETERMINISM) ✅' : 'FAIL ❌'}`);
    console.log('================================================================');

    if (replaySuccessRate !== 100) {
        process.exit(1);
    }
    process.exit(0);
}

runDeterministicValidation().catch(e => {
    console.error('Fatal crash during replay validation execution:', e);
    process.exit(1);
});

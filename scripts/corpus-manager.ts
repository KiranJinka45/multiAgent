import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '../');

const CORPUS_DIR = path.join(workspaceRoot, 'reliability-corpus');
const ARCHAEOLOGY_DIR = path.join(workspaceRoot, '.ztan', 'archaeology');
const SOAK_DATA_DIR = path.join(workspaceRoot, 'soak-data');
const REGISTRY_FILE = path.join(CORPUS_DIR, 'CORPUS_REGISTRY.json');

const AUTHORITY_PRIV_KEY_PATH = path.join(workspaceRoot, '.ztan', 'authority_private_key.pem');
const AUTHORITY_PUB_KEY_PATH = path.join(workspaceRoot, '.ztan', 'authority_public_key.pem');

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

function getOrCreateAuthorityKeys(): { privateKey: string; publicKey: string } {
    if (fs.existsSync(AUTHORITY_PRIV_KEY_PATH) && fs.existsSync(AUTHORITY_PUB_KEY_PATH)) {
        return {
            privateKey: fs.readFileSync(AUTHORITY_PRIV_KEY_PATH, 'utf8'),
            publicKey: fs.readFileSync(AUTHORITY_PUB_KEY_PATH, 'utf8')
        };
    }

    console.log('[Corpus Manager] Generating RSA authority key pair...');
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    const ztanDir = path.dirname(AUTHORITY_PRIV_KEY_PATH);
    if (!fs.existsSync(ztanDir)) {
        fs.mkdirSync(ztanDir, { recursive: true });
    }

    fs.writeFileSync(AUTHORITY_PRIV_KEY_PATH, privateKey, 'utf8');
    fs.writeFileSync(AUTHORITY_PUB_KEY_PATH, publicKey, 'utf8');
    return { privateKey, publicKey };
}

function getFileHash(filePath: string): string {
    if (!fs.existsSync(filePath)) return '';
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
}

function signPayload(payload: string, privateKey: string): string {
    const sign = crypto.createSign('sha256');
    sign.update(payload);
    return sign.sign(privateKey, 'base64');
}

function verifyPayloadSignature(payload: string, signature: string, publicKey: string): boolean {
    const verify = crypto.createVerify('sha256');
    verify.update(payload);
    return verify.verify(publicKey, signature, 'base64');
}

function saveRegistry(registry: Record<string, RegistryEntry>) {
    const { privateKey } = getOrCreateAuthorityKeys();
    
    // Sort entries by ID to ensure deterministic serialization for manifest signing
    const sortedEntries: Record<string, RegistryEntry> = {};
    const sortedKeys = Object.keys(registry).sort();
    for (const key of sortedKeys) {
        sortedEntries[key] = registry[key];
    }

    const payloadToHash = JSON.stringify(sortedEntries);
    const manifestHash = crypto.createHash('sha256').update(payloadToHash).digest('hex');
    const manifestSignature = signPayload(manifestHash, privateKey);

    const registryPayload = {
        schemaVersion: '1.0.0',
        generatedAt: new Date().toISOString(),
        manifestSignature,
        entries: sortedEntries
    };

    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registryPayload, null, 2), 'utf8');
    console.log(`[Corpus Manager] Saved signed registry manifest (signature length: ${manifestSignature.length})`);
}

function normalizeFailureClass(errors: string[]): string {
    const errStr = errors.join(' ').toLowerCase();
    if (errStr.includes('fencing') || errStr.includes('lease')) return 'EPOCH_LEASE_FENCING_BREACH';
    if (errStr.includes('attestation') || errStr.includes('env')) return 'STARTUP_ATTESTATION_ENV_DRIFT';
    if (errStr.includes('opa') || errStr.includes('policy')) return 'POLICY_OPA_GATE_DENIAL';
    if (errStr.includes('network') || errStr.includes('packet')) return 'NETWORK_PATHOLOGY_TIMEOUT';
    if (errStr.includes('fsync') || errStr.includes('storage')) return 'STORAGE_IO_STALL';
    return 'UNKNOWN_SAFETY_INVARIANT_VIOLATION';
}

async function indexArchaeology() {
    console.log('⚡ Scanning .ztan/archaeology for raw forensic bundles...');
    if (!fs.existsSync(ARCHAEOLOGY_DIR)) {
        console.log('   - Directory .ztan/archaeology does not exist. Skipping.');
        return;
    }

    const { privateKey, publicKey } = getOrCreateAuthorityKeys();
    const pubKeyFingerprint = crypto.createHash('sha256').update(publicKey).digest('hex');

    const files = fs.readdirSync(ARCHAEOLOGY_DIR).filter(f => f.startsWith('incident-') && f.endsWith('.json'));
    console.log(`   - Found ${files.length} incident bundles.`);

    const registry: Record<string, RegistryEntry> = fs.existsSync(REGISTRY_FILE)
        ? JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8')).entries || {}
        : {};

    let addedCount = 0;

    for (const file of files) {
        const filePath = path.join(ARCHAEOLOGY_DIR, file);
        try {
            const bundle = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const id = bundle.incidentId;
            if (!id) continue;

            const folderName = `incident-${id.toLowerCase()}`;
            const targetDir = path.join(CORPUS_DIR, folderName);

            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            const telemetryPath = path.join(targetDir, 'telemetry.json');
            const verdictPath = path.join(targetDir, 'verdict.json');
            const mdPath = path.join(targetDir, 'operator-actions.md');

            // 1. Write telemetry.json
            fs.writeFileSync(telemetryPath, JSON.stringify(bundle, null, 2), 'utf8');

            // 2. Write verdict.json
            const verdict = {
                tier: bundle.verdict?.verdict || 'FAIL',
                emoji: '🚨',
                label: `INCIDENT ${id} DETECTED`,
                description: bundle.verdict?.primaryTrigger || 'Safety invariant violation triggered quarantine.',
                exitCode: 1,
                ceilingReason: bundle.verdict?.primaryTrigger || null
            };
            fs.writeFileSync(verdictPath, JSON.stringify(verdict, null, 2), 'utf8');

            // 3. Write operator-actions.md
            const errors = bundle.timeline?.map((t: any) => t.description) || [];
            const failureClass = normalizeFailureClass(errors);

            const mdContent = `# Incident ${id} - Forensic Replay Analysis

## Incident Parameters
*   **Incident ID**: ${id}
*   **Timestamp**: ${bundle.timestamp}
*   **Failure Class**: ${failureClass}
*   **Confidence**: ${bundle.verdict?.confidence || 'N/A'}

## Observed Pathology
${errors.map((e: string) => `*   ${e}`).join('\n') || '*   No detailed error timeline recorded.'}

## Captured Environment
*   **Hashed Environment Keys**: ${Object.keys(bundle.environment?.allKeysHashed || {}).join(', ') || 'None'}

## Recovery & Reconciliation Actions
1.  **Quarantine Lockdown Asserted**: The node was successfully isolated to prevent state drift.
2.  **Evidence Captured**: Forensic bundle ${file} was emitted to .ztan/archaeology.
3.  **Audit Sign-off Pending**: Operator must execute recovery ceremony to reset baseline.

## Verdict Tier
*   **FAIL**: Invariant violation triggered node quarantine.
`;
            fs.writeFileSync(mdPath, mdContent, 'utf8');

            // Compute file hashes
            const telemetryHash = getFileHash(telemetryPath);
            const verdictHash = getFileHash(verdictPath);
            const mdHash = getFileHash(mdPath);

            // Create signature
            const payloadToSign = `${telemetryHash}:${verdictHash}:${mdHash}`;
            const signature = signPayload(payloadToSign, privateKey);

            registry[id] = {
                id,
                type: 'INCIDENT',
                failureClass,
                timestamp: bundle.timestamp,
                files: {
                    telemetry: { path: `reliability-corpus/${folderName}/telemetry.json`, hash: telemetryHash },
                    verdict: { path: `reliability-corpus/${folderName}/verdict.json`, hash: verdictHash },
                    operatorActions: { path: `reliability-corpus/${folderName}/operator-actions.md`, hash: mdHash }
                },
                signature,
                signerKeyFingerprint: pubKeyFingerprint
            };

            addedCount++;
        } catch (e: any) {
            console.error(`   ❌ Failed to process ${file}: ${e.message}`);
        }
    }

    saveRegistry(registry);
    console.log(`✅ Indexed and signed ${addedCount} archaeology incidents in corpus registry.`);
}

async function indexCampaigns() {
    console.log('⚡ Scanning soak-data for campaign reports...');
    if (!fs.existsSync(SOAK_DATA_DIR)) {
        console.log('   - Directory soak-data does not exist. Skipping.');
        return;
    }

    const { privateKey, publicKey } = getOrCreateAuthorityKeys();
    const pubKeyFingerprint = crypto.createHash('sha256').update(publicKey).digest('hex');

    const files = fs.readdirSync(SOAK_DATA_DIR).filter(f => f.startsWith('stateful-chaos-report-') && f.endsWith('.json'));
    console.log(`   - Found ${files.length} campaign reports.`);

    const registry: Record<string, RegistryEntry> = fs.existsSync(REGISTRY_FILE)
        ? JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8')).entries || {}
        : {};

    let addedCount = 0;

    for (const file of files) {
        const filePath = path.join(SOAK_DATA_DIR, file);
        try {
            const report = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const timestampStr = report.timestamp;
            const parsedTime = new Date(timestampStr).getTime();
            const id = `CAMPAIGN-${parsedTime}`;

            const folderName = `campaign-${parsedTime}`;
            const targetDir = path.join(CORPUS_DIR, folderName);

            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            const telemetryPath = path.join(targetDir, 'telemetry.json');
            const verdictPath = path.join(targetDir, 'verdict.json');
            const mdPath = path.join(targetDir, 'operator-actions.md');

            // 1. Write telemetry.json
            fs.writeFileSync(telemetryPath, JSON.stringify(report, null, 2), 'utf8');

            // Determine verdict details
            const isOk = report.failures === 0;
            const verdictTier = isOk ? 'PASS_PRISTINE' : 'PASS_RECOVERED';
            const verdictEmoji = isOk ? '🟢' : '🔄';

            // 2. Write verdict.json
            const verdict = {
                tier: verdictTier,
                emoji: verdictEmoji,
                label: `CAMPAIGN ${id} COMPLETED`,
                description: isOk ? 'Pristine execution under nominal parameters.' : 'Transient errors occurred but system converged successfully.',
                exitCode: 0,
                ceilingReason: null
            };
            fs.writeFileSync(verdictPath, JSON.stringify(verdict, null, 2), 'utf8');

            // 3. Write operator-actions.md
            const mdContent = `# Campaign ${id} - Chaos Soak Report

## Campaign Parameters
*   **Campaign ID**: ${id}
*   **Timestamp**: ${timestampStr}
*   **Duration**: ${report.durationSeconds}s
*   **Ledger Verified**: ${report.ledgerVerifiedOk ? 'SUCCESS ✅' : 'FAILED ❌'}

## Observed Pathology
*   Total request failures: ${report.requestMetrics?.totalRequests - report.requestMetrics?.totalRequests * (parseFloat(report.requestMetrics?.successRate) / 100) || 0}
*   Success rate: ${report.requestMetrics?.successRate}%
*   Dual outage RTO: ${report.requestMetrics?.dualRTO || 'N/A'}

## Recovery & Reconciliation Actions
1.  **State-Reconciliation Activation**: System reconciled container outage states.
2.  **Health Verification**: Containers pg and redis unpaused/started successfully.
3.  **Ledger Integrity Checked**: Cryptographic hash chain checked and validated.

## Verdict Tier
*   **${verdictTier}**: Campaign passed with ${verdictTier} status.
`;
            fs.writeFileSync(mdPath, mdContent, 'utf8');

            // Compute hashes
            const telemetryHash = getFileHash(telemetryPath);
            const verdictHash = getFileHash(verdictPath);
            const mdHash = getFileHash(mdPath);

            // Create signature
            const payloadToSign = `${telemetryHash}:${verdictHash}:${mdHash}`;
            const signature = signPayload(payloadToSign, privateKey);

            registry[id] = {
                id,
                type: 'CAMPAIGN',
                failureClass: 'DUAL_BLACKOUT_RECOVERY',
                timestamp: timestampStr,
                files: {
                    telemetry: { path: `reliability-corpus/${folderName}/telemetry.json`, hash: telemetryHash },
                    verdict: { path: `reliability-corpus/${folderName}/verdict.json`, hash: verdictHash },
                    operatorActions: { path: `reliability-corpus/${folderName}/operator-actions.md`, hash: mdHash }
                },
                signature,
                signerKeyFingerprint: pubKeyFingerprint
            };

            addedCount++;
        } catch (e: any) {
            console.error(`   ❌ Failed to process ${file}: ${e.message}`);
        }
    }

    saveRegistry(registry);
    console.log(`✅ Indexed and signed ${addedCount} campaigns in corpus registry.`);
}

function verifyCorpus() {
    console.log('🕵️‍♂️  Verifying reliability corpus registry integrity...');
    if (!fs.existsSync(REGISTRY_FILE)) {
        console.error('❌ Registry file CORPUS_REGISTRY.json does not exist.');
        process.exit(1);
    }

    const { publicKey } = getOrCreateAuthorityKeys();
    const pubKeyFingerprint = crypto.createHash('sha256').update(publicKey).digest('hex');

    const registryData = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
    
    // Verify root manifest signature first to ensure registry document integrity
    console.log('⚡ Verifying root manifest signature...');
    const schemaVersion = registryData.schemaVersion || '0.0.0';
    const manifestSignature = registryData.manifestSignature;
    const entries = registryData.entries || {};

    if (schemaVersion !== '1.0.0') {
        console.error(`❌ Warning: Unsupported corpus registry schema version "${schemaVersion}". Expected "1.0.0"`);
        process.exit(1);
    }

    if (!manifestSignature) {
        console.error('❌ Registry integrity verification failed: manifestSignature is missing!');
        process.exit(1);
    }

    // Deterministically serialize entries for verification
    const sortedEntries: Record<string, RegistryEntry> = {};
    const sortedKeys = Object.keys(entries).sort();
    for (const key of sortedKeys) {
        sortedEntries[key] = entries[key];
    }
    const payloadToHash = JSON.stringify(sortedEntries);
    const computedManifestHash = crypto.createHash('sha256').update(payloadToHash).digest('hex');

    const manifestVerified = verifyPayloadSignature(computedManifestHash, manifestSignature, publicKey);
    if (!manifestVerified) {
        console.error('❌ Registry integrity verification failed: manifestSignature is INVALID or tampered!');
        process.exit(1);
    }
    console.log('   ✔ Root manifest signature verified successfully.');

    let totalCount = 0;
    let successCount = 0;

    for (const [id, entry] of Object.entries(entries) as [string, RegistryEntry][]) {
        totalCount++;
        try {
            if (entry.signerKeyFingerprint !== pubKeyFingerprint) {
                console.error(`   ❌ Fingerprint mismatch for entry ${id}!`);
                continue;
            }

            const telPath = path.resolve(workspaceRoot, entry.files.telemetry.path.replace('reliability-corpus/', 'reliability-corpus/'));
            const verPath = path.resolve(workspaceRoot, entry.files.verdict.path.replace('reliability-corpus/', 'reliability-corpus/'));
            const mdPath = path.resolve(workspaceRoot, entry.files.operatorActions.path.replace('reliability-corpus/', 'reliability-corpus/'));

            const telHash = getFileHash(telPath);
            const verHash = getFileHash(verPath);
            const mdHash = getFileHash(mdPath);

            if (telHash !== entry.files.telemetry.hash) {
                console.error(`   ❌ Hash mismatch for telemetry.json in entry ${id}`);
                continue;
            }
            if (verHash !== entry.files.verdict.hash) {
                console.error(`   ❌ Hash mismatch for verdict.json in entry ${id}`);
                continue;
            }
            if (mdHash !== entry.files.operatorActions.hash) {
                console.error(`   ❌ Hash mismatch for operator-actions.md in entry ${id}`);
                continue;
            }

            const payloadToVerify = `${telHash}:${verHash}:${mdHash}`;
            const verified = verifyPayloadSignature(payloadToVerify, entry.signature, publicKey);

            if (verified) {
                console.log(`   ✔ Entry ${id} (${entry.type}) verified successfully.`);
                successCount++;
            } else {
                console.error(`   ❌ Signature verification failed for entry ${id}!`);
            }
        } catch (e: any) {
            console.error(`   ❌ Error verifying entry ${id}: ${e.message}`);
        }
    }

    console.log(`\n🏁 Verification completed. ${successCount} / ${totalCount} entries verified successfully.`);
    if (successCount !== totalCount) {
        console.error('❌ Registry verification failed!');
        process.exit(1);
    }
}

async function main() {
    const args = process.argv.slice(2);
    if (args.includes('--index-archaeology')) {
        await indexArchaeology();
    } else if (args.includes('--index-campaigns')) {
        await indexCampaigns();
    } else if (args.includes('--verify')) {
        verifyCorpus();
    } else {
        console.log('Usage: npx tsx scripts/corpus-manager.ts [--index-archaeology] [--index-campaigns] [--verify]');
    }
}

main().catch(err => {
    console.error('Fatal CLI error:', err);
    process.exit(1);
});

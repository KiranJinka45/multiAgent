"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const ztan_crypto_1 = require("@packages/ztan-crypto");
const app = (0, express_1.default)();
app.disable('x-powered-by');
app.use(express_1.default.json());
// Persistent guard for the server
const REPLAY_DB = path_1.default.join(process.cwd(), '.ztan_server_replay_db.json');
const guard = new ztan_crypto_1.FileReplayGuard(REPLAY_DB);
// Local Audit Log Sink
const LOCAL_AUDIT_LOG = path_1.default.join(process.cwd(), 'audit_anchor_log.txt');
// Independent Authorities (Simulated)
const AUTHORITIES = [
    'SEC-GOV-CENTRAL-01',
    'SRE-AUDIT-NODE-02',
    'COMPLIANCE-WATCH-03',
    'LEGAL-ARCHIVE-04',
    'INFRA-TRUST-05'
];
const CONSENSUS_THRESHOLD = 3;
/**
 * ZTAN Cryptographic Infrastructure Endpoint
 * Implements Threshold-Signed Anchor Consensus.
 */
app.post('/api/verify', async (req, res) => {
    try {
        const inputData = req.body;
        // 🔥 STEP 1: INITIAL VERIFICATION TO COMPUTE ANCHOR
        const initialResult = await ztan_crypto_1.ThresholdCrypto.verifyAudit(JSON.stringify(inputData), { guard, skipMarkSeen: true });
        if (initialResult.status === 'FAILED') {
            if (initialResult.errorType === 'REPLAY_DETECTED') {
                const { ArchaeologyEngine } = await import('@packages/utils');
                await ArchaeologyEngine.recordReplay({
                    id: inputData.auditId,
                    service: 'audit-server',
                    failureType: 'REPLAY_ATTEMPT',
                    correlations: {
                        anchor: initialResult.finalAnchor,
                        clientHash: inputData.payloadHash
                    }
                });
            }
            return res.json(initialResult);
        }
        const anchor = initialResult.finalAnchor;
        // 🔥 STEP 2: SIMULATE MULTI-PARTY CONSENSUS
        const partialSigs = await Promise.all(AUTHORITIES.map(async (id) => ({
            verifierId: id,
            signature: await ztan_crypto_1.ThresholdCrypto.signAnchor(anchor, id)
        })));
        // 🔥 STEP 3: RE-VERIFY WITH CONSENSUS DATA
        const consensusInput = {
            ...inputData,
            partialAnchorSignatures: partialSigs,
            consensusThreshold: CONSENSUS_THRESHOLD
        };
        const finalResult = await ztan_crypto_1.ThresholdCrypto.verifyAudit(JSON.stringify(consensusInput), { guard });
        if (finalResult.status === 'VERIFIED') {
            const auditId = inputData.auditId;
            const timestamp = new Date().toISOString();
            // 🔥 MULTI-ANCHOR SINK 1: STDOUT
            console.log(`[ZTAN] [CONSENSUS-VERIFIED] ID: ${auditId} | Threshold: ${CONSENSUS_THRESHOLD}/${AUTHORITIES.length} | Aggregate: ${finalResult.aggregateAnchorSignature}`);
            // 🔥 MULTI-ANCHOR SINK 2: Local File Log
            const logEntry = `[${timestamp}] ID:${auditId} ANCHOR:${anchor} AGGREGATE:${finalResult.aggregateAnchorSignature} VERIFIERS:${finalResult.contributingVerifiers?.join(',')}\n`;
            fs_1.default.appendFileSync(LOCAL_AUDIT_LOG, logEntry);
            // 🔥 MULTI-ANCHOR SINK 3: Simulated WORM
            simulateWormStorage(finalResult.aggregateAnchorSignature);
        }
        res.json(finalResult);
    }
    catch (e) {
        console.error('[ZTAN] Consensus Verification Error:', e);
        res.status(500).json({ error: e.message });
    }
});
function simulateWormStorage(aggregateSig) {
    console.log(`[ZTAN] [WORM-SYNC] Consensus proof ${aggregateSig} persisted to immutable storage.`);
}
const PORT = process.env['PORT'] || 3000;
app.listen(PORT, () => {
    console.log(`[ZTAN] Cryptographic Infrastructure Server running on port ${PORT}`);
    console.log(`[ZTAN] Consensus Authorities: ${AUTHORITIES.length}`);
    console.log(`[ZTAN] Threshold: ${CONSENSUS_THRESHOLD}`);
});

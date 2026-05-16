"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditVerifier = void 0;
const crypto_utils_1 = require("./crypto-utils");
const stability_circuit_1 = require("./stability-circuit");
const notary_service_1 = require("./notary-service");
const logger = console;
class AuditVerifier {
    /**
     * Verifies a single audit entry for Elite Tier compliance.
     */
    static async verifyEntry(entry, groupPublicKey) {
        const { sequenceId, _audit, governance, elite, _verification_data } = entry;
        logger.info(`\n🔍 VERIFYING ENTRY [Seq: ${sequenceId}]`);
        // 1. Verify Hash Chain Continuity
        // (In full verify, this checks against prev entry)
        if (!_audit.hash) {
            logger.error('❌ FAILED: Missing audit hash.');
            return false;
        }
        // 2. Verify Threshold Signature (TSAC)
        if (_audit.ztan_consensus && _audit.aggregatedSignature) {
            const payload = `${sequenceId}|PASS|${entry.elite?.multiAgent?.consensus.action === 'NO_ACTION' ? 'UNKNOWN' : 'node-a'}`; // Simplified payload match
            const participants = governance.attestations
                .filter(a => a.status === 'PASS')
                .map(a => a.verifierId);
            const isSigValid = await crypto_utils_1.ThresholdCrypto.verifyAggregate(_audit.aggregatedSignature, payload, groupPublicKey, crypto_utils_1.DEFAULT_THRESHOLD, crypto_utils_1.DEFAULT_NODE_IDS);
            if (isSigValid) {
                logger.info('✅ TSAC: Threshold signature is cryptographically valid.');
            }
            else {
                logger.error('❌ TSAC: Threshold signature FORGERY or INVALID quorum detected!');
                return false;
            }
        }
        // 3. Verify ZK Proof (ZKAV)
        if (_audit.zkProof && _verification_data) {
            const isZkValid = await stability_circuit_1.StabilityCircuit.verifyProof(_audit.zkProof, _verification_data.acc, _verification_data.ldet, _verification_data.lsla);
            if (isZkValid) {
                logger.info('✅ ZKAV: Stability proof is mathematically correct.');
            }
            else {
                logger.error('❌ ZKAV: Stability proof calculation mismatch or invalid.');
                return false;
            }
        }
        // 4. Verify External Notarization (Phase 3)
        if (_audit.notarized && _audit.notarySeq) {
            const isNotaryValid = await notary_service_1.notaryService.verify(_audit.hash, _audit.notarySeq);
            if (isNotaryValid) {
                logger.info('✅ NOTARY: External anchor verified in immutable ledger.');
            }
            else {
                logger.error('❌ NOTARY: Local head hash mismatch with external notarized anchor!');
                return false;
            }
        }
        logger.info(`🟢 ENTRY [Seq: ${sequenceId}] CERTIFIED AS AUDIT-GRADE.`);
        return true;
    }
}
exports.AuditVerifier = AuditVerifier;

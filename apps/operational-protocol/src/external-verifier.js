"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.externalVerifier = exports.ExternalVerifier = void 0;
const crypto_utils_1 = require("./crypto-utils");
const logger = console;
class ExternalVerifier {
    verifierId = 'ZTAN-EXTERNAL-03';
    keyShare = null;
    setKeyShare(share) {
        this.keyShare = share;
    }
    async verifyDecision(decision, telemetrySnapshot) {
        logger.info({ eventId: decision.eventId }, '[EXTERNAL-VERIFIER] Verifying with Threshold Cryptography (Node C)...');
        let suspectedNode = 'UNKNOWN';
        let maxHeuristicScore = 0;
        for (const data of telemetrySnapshot) {
            const score = this.calculateHeuristicScore(data);
            if (score > maxHeuristicScore) {
                maxHeuristicScore = score;
                suspectedNode = data.nodeId;
            }
        }
        const isMatched = decision.targetNode === suspectedNode;
        const status = isMatched ? 'PASS' : 'FAIL';
        const attestation = {
            eventId: decision.eventId,
            status,
            verifierId: this.verifierId,
            expectedNode: suspectedNode,
            confidence: maxHeuristicScore,
            timestamp: Date.now()
        };
        // --- ELITE TIER: CRYPTOGRAPHIC SIGNING ---
        if (this.keyShare) {
            const payload = `${decision.eventId}|${status}|${suspectedNode}`;
            attestation.partialSignature = await crypto_utils_1.ThresholdCrypto.signPartial(payload, this.keyShare.share, this.verifierId, crypto_utils_1.DEFAULT_THRESHOLD, crypto_utils_1.DEFAULT_NODE_IDS);
        }
        return attestation;
    }
    calculateHeuristicScore(data) {
        const errorScore = data.metrics.errors > 5 ? 0.8 : 0;
        const latencyScore = data.metrics.latency > 1000 ? 0.2 : 0;
        return Math.min(1.0, errorScore + latencyScore);
    }
}
exports.ExternalVerifier = ExternalVerifier;
exports.externalVerifier = new ExternalVerifier();

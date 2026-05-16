"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sidecarVerifier = exports.SidecarVerifier = void 0;
const crypto_utils_1 = require("./crypto-utils");
const logger = console;
class SidecarVerifier {
    verifierId = 'ZTAN-SIDECAR-02';
    telemetryBuffer = [];
    keyShare = null;
    setKeyShare(share) {
        this.keyShare = share;
    }
    /**
     * Processes a new telemetry update and stores it in the local buffer.
     */
    processTelemetry(data) {
        this.telemetryBuffer.push(data);
        if (this.telemetryBuffer.length > 100)
            this.telemetryBuffer.shift();
    }
    /**
     * Independently validates an SRE decision.
     */
    async verifyDecision(decision) {
        logger.info({ eventId: decision.eventId }, '[SIDECAR] Verifying with Threshold Cryptography (Node B)...');
        let suspectedNode = 'UNKNOWN';
        let maxCpu = 0;
        for (const data of this.telemetryBuffer) {
            if (data.metrics.cpu > maxCpu) {
                maxCpu = data.metrics.cpu;
                suspectedNode = data.nodeId;
            }
        }
        const isMatched = decision.targetNode === suspectedNode && maxCpu > 80;
        const status = isMatched ? 'PASS' : 'FAIL';
        const attestation = {
            eventId: decision.eventId,
            status,
            verifierId: this.verifierId,
            expectedNode: suspectedNode,
            confidence: maxCpu / 100,
            timestamp: Date.now()
        };
        // --- ELITE TIER: CRYPTOGRAPHIC SIGNING ---
        if (this.keyShare) {
            const payload = `${decision.eventId}|${status}|${suspectedNode}`;
            attestation.partialSignature = await crypto_utils_1.ThresholdCrypto.signPartial(payload, this.keyShare.share, this.verifierId, crypto_utils_1.DEFAULT_THRESHOLD, crypto_utils_1.DEFAULT_NODE_IDS);
        }
        return attestation;
    }
}
exports.SidecarVerifier = SidecarVerifier;
exports.sidecarVerifier = new SidecarVerifier();

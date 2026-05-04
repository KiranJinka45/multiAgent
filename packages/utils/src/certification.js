"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCertificationState = updateCertificationState;
exports.getLiveCertification = getLiveCertification;
const server_1 = require("./server");
/**
 * CERTIFICATION STATE MANAGER
 * Persists the live system status to Redis for API and Deployment Guard consumption.
 */
async function updateCertificationState(metrics, confidence) {
    const status = confidence >= 90 ? 'CERTIFIED' :
        confidence >= 70 ? 'DEGRADED' :
            'UNSAFE';
    const state = {
        status,
        confidence,
        lastChaosRun: new Date().toISOString(),
        metrics,
        updatedAt: new Date().toISOString()
    };
    // TTL of 5 minutes ensures the state "expires" if the daemon dies, 
    // forcing a non-certified state for safety.
    await server_1.redis.set('system:certification:live', JSON.stringify(state), 'EX', 300);
    return state;
}
async function getLiveCertification() {
    const data = await server_1.redis.get('system:certification:live');
    return data ? JSON.parse(data) : null;
}
//# sourceMappingURL=certification.js.map
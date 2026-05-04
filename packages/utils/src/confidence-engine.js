"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateConfidence = calculateConfidence;
/**
 * CONFIDENCE ENGINE
 * Computes a real-time health score (0-100) based on system metrics.
 */
function calculateConfidence(metrics) {
    let score = 100;
    // 1. Critical Failure Penalty
    if (metrics.failureRate > 0.01) {
        // Linear penalty for failures above 1%
        score -= (metrics.failureRate * 100 * 2);
    }
    // 2. Retry Storm Penalty
    // Normal retries are fine, but > 50 in a window indicates instability
    if (metrics.retryRate > 50) {
        score -= 20;
    }
    // 3. DLQ Growth Penalty
    // Any items in DLQ indicate failed recovery
    if (metrics.dlqRate > 0) {
        score -= Math.min(30, metrics.dlqRate * 5);
    }
    // 4. Resource Starvation
    if (metrics.activeWorkers === 0) {
        score -= 50; // Critical: No capacity
    }
    else if (metrics.activeWorkers < 2) {
        score -= 10; // Warning: Low redundancy
    }
    // 5. Success Floor
    // If success rate is below 95%, hard-cap the score
    if (metrics.successRate < 0.95) {
        score = Math.min(score, 60);
    }
    return Math.max(0, Math.min(100, Math.round(score)));
}
//# sourceMappingURL=confidence-engine.js.map
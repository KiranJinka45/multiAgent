// scripts/sre-ai/feature-extractor.js
/**
 * Transforms raw telemetry into normalized features for decision logic.
 */
function extractFeatures(metrics) {
  return {
    errorRate: metrics.errorRate || 0,
    latency: metrics.avgLatency || 0,
    queueDepth: metrics.queueDepth || 0,
    redisUp: metrics.redisStatus === 'HEALTHY' ? 1 : 0,
    activeWorkers: metrics.activeWorkers || 0,
    systemLoad: metrics.cpuUsage || 0,
    isEmergencyMode: metrics.operationalMode === 'EMERGENCY' ? 1 : 0,
    failoverCount: metrics.recentFailovers || 0
  };
}

module.exports = { extractFeatures };

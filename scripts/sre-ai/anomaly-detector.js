// scripts/sre-ai/anomaly-detector.js
const { loadIncidents } = require("./incident-store");

const ALPHA = 0.3; // Smoothing factor for EWMA

/**
 * Anomaly Predictor: Uses trend forecasting to predict failures.
 */
function analyzeTrends(currentMetrics) {
  const history = loadIncidents();
  if (history.length < 5) return { anomaly: false };

  // 1. EWMA (Exponentially Weighted Moving Average) for Latency
  let ewmaLatency = history[0].metrics.avgLatency || 200;
  history.forEach(h => {
    const l = h.metrics.avgLatency || 200;
    ewmaLatency = (ALPHA * l) + (1 - ALPHA) * ewmaLatency;
  });

  // 2. Trend Forecasting (Slope)
  const lastThree = history.slice(-3).map(h => h.metrics.avgLatency || 200);
  const slope = (currentMetrics.avgLatency - lastThree[0]) / 3; // ms per step

  // 3. Time-to-Failure Prediction
  const SLO_LIMIT = 1000;
  let timeToBreach = null;
  if (slope > 0) {
    timeToBreach = (SLO_LIMIT - currentMetrics.avgLatency) / slope;
  }

  // 4. Anomaly Logic
  const drift = currentMetrics.avgLatency / ewmaLatency;

  if (timeToBreach !== null && timeToBreach > 0 && timeToBreach < 5) {
    return {
      anomaly: true,
      reason: "PREDICTIVE_BREACH",
      confidence: 0.9,
      message: `SLO Breach Predicted in ~${timeToBreach.toFixed(1)} cycles. Current slope: +${slope.toFixed(1)}ms/cycle.`
    };
  }

  if (drift > 1.8) {
    return {
      anomaly: true,
      reason: "LATENCY_DRIFT",
      confidence: 0.75,
      message: `Latency drift detected. Current (${currentMetrics.avgLatency}ms) is 1.8x EWMA baseline (${ewmaLatency.toFixed(1)}ms).`
    };
  }

  return { anomaly: false, ewmaLatency, slope };
}

module.exports = { analyzeTrends };

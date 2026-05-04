/**
 * MultiAgent Business Value Modeling Engine
 * Implements canonical loss models for SRE governance and ROI certification.
 */

export interface BizInputs {
  trafficPerMin: number;        // sessions/min
  conversionRate: number;       // 0..1
  avgOrderValue: number;        // currency
  errorRate: number;            // 0..1
  p95LatencyMs: number;         // ms
}

/**
 * Normalizes latency into a penalty factor (0..1) using a sigmoid function around the SLO.
 */
function latencyPenalty(p95: number) {
  const slo = 300; // 300ms SLO
  const k = 0.01;
  return 1 / (1 + Math.exp(-k * (p95 - slo))); 
}

/**
 * Clamps a number between 0 and 1.
 */
function clamp01(x: number) { 
  return Math.max(0, Math.min(1, x)); 
}

/**
 * Sanitizes business signals to prevent non-physical values.
 */
export function sanitize(i: BizInputs): BizInputs {
  return {
    trafficPerMin: Math.max(0, i.trafficPerMin),
    conversionRate: clamp01(i.conversionRate),
    avgOrderValue: Math.max(0, i.avgOrderValue),
    errorRate: clamp01(i.errorRate),
    p95LatencyMs: Math.max(0, i.p95LatencyMs),
  };
}

/**
 * Calculates financial loss per minute based on traffic, conversion, and impact.
 */
export function lossPerMinute(i: BizInputs) {
  const sanitized = sanitize(i);
  const we = 0.7; // Error weight
  const wl = 0.3; // Latency weight
  
  const impactFactor = we * sanitized.errorRate + wl * latencyPenalty(sanitized.p95LatencyMs);
  
  return sanitized.trafficPerMin * sanitized.conversionRate * sanitized.avgOrderValue * impactFactor;
}

/**
 * Normalizes a delta relative to the baseline to prevent scale mismatch.
 */
function normalizeDelta(before: number, after: number) {
  const denom = Math.max(Math.abs(before), 0.001);
  return (before - after) / denom;
}

/**
 * Calculates the delta in ROI between two states (e.g., Before vs After Intervention).
 * Normalized to [-1, 1] range for scale-independent verification.
 */
export function roiDelta(before: BizInputs, after: BizInputs) {
  const errImpact = normalizeDelta(before.errorRate, after.errorRate);
  const latImpact = normalizeDelta(before.p95LatencyMs, after.p95LatencyMs);
  
  // Weights: 70% Error, 30% Latency (Causal Weights)
  const impact = (errImpact * 0.7) + (latImpact * 0.3);
  
  // Clamp to [-1, 1] to ensure stability in the presence of extreme outliers
  return Math.max(-1, Math.min(1, impact));
}

/**
 * Calculates normalized ROI Error for calibration verification.
 * Since both pred and obs are in [-1, 1], the absolute difference is the error.
 */
export function calculateRoiError(predictedDelta: number, observedDelta: number) {
  return Math.abs(predictedDelta - observedDelta);
}



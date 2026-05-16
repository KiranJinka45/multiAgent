import { lossPerMinute, roiDelta, calculateRoiError } from './packages/business/src/value-model';

const before = {
  trafficPerMin: 100,
  conversionRate: 0.05,
  avgOrderValue: 50,
  errorRate: 0.1,
  p95LatencyMs: 1200
};

const after = {
  trafficPerMin: 100,
  conversionRate: 0.05,
  avgOrderValue: 50,
  errorRate: 0.01,
  p95LatencyMs: 350
};

const Lb = lossPerMinute(before);
const La = lossPerMinute(after);
const delta = roiDelta(before, after);
const error = calculateRoiError(delta, delta * 1.1); // 10% error

console.log('Loss Before:', Lb);
console.log('Loss After:', La);
console.log('ROI Delta (Prevention):', delta);
console.log('Calibration Error (10% expected):', error);

// scripts/sre-ai/calibrator.js
const fs = require('fs');
const path = require('path');

const CALIBRATION_FILE = path.join(__dirname, '../../data/calibration.json');

/**
 * Confidence Calibrator: Moves from heuristic confidence to statistically grounded reliability.
 * Measures the 'Calibration Error' between predicted lift and actual reward.
 */
class Calibrator {
  constructor() {
    this.initStore();
  }

  initStore() {
    if (!fs.existsSync(CALIBRATION_FILE)) {
      const initial = {
        totalIncidents: 0,
        sumSquaredError: 0, // Used for Brier-style scoring
        reliabilityCurve: [],
        historicalAccuracy: 1.0
      };
      fs.writeFileSync(CALIBRATION_FILE, JSON.stringify(initial, null, 2));
    }
  }

  /**
   * Updates reliability based on outcome.
   * predictedConf: 0-1
   * actualReward: -1 to 1 (normalized)
   */
  track(predictedConf, actualReward) {
    const data = JSON.parse(fs.readFileSync(CALIBRATION_FILE, 'utf8'));
    
    // Normalize reward to 0-1 for accuracy calculation
    const accuracy = (actualReward + 1) / 2;
    const error = Math.pow(predictedConf - accuracy, 2);

    data.totalIncidents++;
    data.sumSquaredError += error;
    data.historicalAccuracy = 1 - (data.sumSquaredError / data.totalIncidents);

    fs.writeFileSync(CALIBRATION_FILE, JSON.stringify(data, null, 2));
  }

  /**
   * Returns a calibrated confidence score.
   */
  calibrate(rawConfidence) {
    const data = JSON.parse(fs.readFileSync(CALIBRATION_FILE, 'utf8'));
    
    // If we have history, penalize raw confidence by historical inaccuracy
    const adjustmentFactor = data.totalIncidents > 5 ? data.historicalAccuracy : 1.0;
    
    let calibrated = rawConfidence * adjustmentFactor;
    
    // Additional "Epistemic Uncertainty" penalty for low-incident states
    if (data.totalIncidents < 3) calibrated *= 0.8;

    return Math.min(1.0, Math.max(0.1, calibrated));
  }
}

module.exports = new Calibrator();

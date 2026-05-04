// scripts/sre-ai/model.js
const fs = require("fs");
const path = require("path");

const WEIGHTS_PATH = path.join(__dirname, "../../data/ai-weights.json");

function loadWeights() {
  try {
    const data = JSON.parse(fs.readFileSync(WEIGHTS_PATH, "utf8"));
    return data.weights;
  } catch (err) {
    // Fallback to defaults
    return {
      errorRate: 50,
      latency: 10,
      queueDepth: 0.1,
      redisUp: 20,
      isEmergencyMode: 10,
      failoverCount: 5
    };
  }
}

/**
 * AI Scoring Model: Calculates system severity based on dynamic weights.
 */
function predict(features) {
  const weights = loadWeights();
  let score = 0;

  score += features.errorRate * weights.errorRate;
  score += (features.latency > 500 ? weights.latency / 2 : 0);
  score += (features.latency > 1000 ? weights.latency : 0);
  score += features.queueDepth * weights.queueDepth;
  score += (features.redisUp === 0 ? weights.redisUp : 0);
  score += features.isEmergencyMode * weights.isEmergencyMode;
  score += features.failoverCount * weights.failoverCount;

  console.log(`[AI-MODEL] Calculated Severity Score: ${score.toFixed(2)} (using dynamic weights)`);

  if (score > 25) return "GLOBAL_FAILOVER";
  if (score > 15) return "ROLLBACK";
  if (score > 10) return "LOAD_SHEDDING";
  if (score > 5)  return "RESTART_WORKERS";
  
  return "MONITOR";
}

module.exports = { predict };

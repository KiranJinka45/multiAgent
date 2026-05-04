// scripts/sre-ai/feedback-processor.js
const fs = require("fs");
const path = require("path");

const WEIGHTS_PATH = path.join(__dirname, "../../data/ai-weights.json");

/**
 * Updates model weights based on the outcome of an action.
 * This is a simple Reinforcement Learning (RL) step.
 */
function processFeedback(action, preMetrics, postMetrics) {
  const data = JSON.parse(fs.readFileSync(WEIGHTS_PATH, "utf8"));
  const { weights, learningRate } = data;

  // Calculate Reward: Improvement in system health
  // Improvement = (preError - postError) + (preLatency - postLatency) / 1000
  const errorImprovement = preMetrics.errorRate - postMetrics.errorRate;
  const latencyImprovement = (preMetrics.avgLatency - postMetrics.avgLatency) / 1000;
  
  const reward = errorImprovement + latencyImprovement;

  console.log(`[RL-FEEDBACK] Action: ${action}, Reward: ${reward.toFixed(4)}`);

  // Update weights based on reward
  if (reward > 0.05) {
    // Action was successful - reinforce the features that triggered it
    if (preMetrics.errorRate > 0.1) weights.errorRate += learningRate * 5;
    if (preMetrics.avgLatency > 500) weights.latency += learningRate * 2;
    console.log(`[RL-FEEDBACK] Success! Reinforcing weights.`);
  } else if (reward < -0.05) {
    // Action was unsuccessful or harmful - penalize the weights
    if (preMetrics.errorRate > 0.1) weights.errorRate -= learningRate * 10;
    if (preMetrics.avgLatency > 500) weights.latency -= learningRate * 5;
    console.log(`[RL-FEEDBACK] Failure. Penalizing weights.`);
  }

  // Persist updated weights
  data.weights = weights;
  data.lastUpdate = Date.now();
  fs.writeFileSync(WEIGHTS_PATH, JSON.stringify(data, null, 2));

  return { reward, updatedWeights: weights };
}

module.exports = { processFeedback };

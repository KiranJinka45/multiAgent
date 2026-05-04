// scripts/sre-rl/policy-manager.js
const fs = require('fs');
const path = require('path');

const ope = require("./ope");
const POLICY_FILE = path.join(__dirname, '../../data/policies.json');
const HISTORY_FILE = path.join(__dirname, '../../data/experience_replay.json');

/**
 * Policy Manager: Handles versioning, rollback, and promotion of RL policies.
 * Prevents "Silent Corruption" of the learning system.
 */
class PolicyManager {
  constructor() {
    this.initStore();
  }

  initStore() {
    if (!fs.existsSync(POLICY_FILE)) {
      const initial = {
        active: "v1",
        history: {
          "v1": {
            weights: {},
            avgReward: 0,
            incidents: 0,
            createdAt: Date.now()
          }
        }
      };
      fs.writeFileSync(POLICY_FILE, JSON.stringify(initial, null, 2));
    }
  }

  getActivePolicy() {
    const data = JSON.parse(fs.readFileSync(POLICY_FILE, 'utf8'));
    return { version: data.active, ...data.history[data.active] };
  }

  promote(version, weights, avgReward) {
    const data = JSON.parse(fs.readFileSync(POLICY_FILE, 'utf8'));
    
    // OPE Safety Gate
    if (fs.existsSync(HISTORY_FILE)) {
      const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
      const estimatedValue = ope.evaluate(weights, history);
      const currentValue = data.history[data.active]?.avgReward || 0;

      if (estimatedValue < currentValue * 0.9) {
         console.log(`[POLICY] 🛑 BLOCKING PROMOTION of ${version}: OPE estimated value (${estimatedValue.toFixed(2)}) is regressive compared to active policy (${currentValue.toFixed(2)}).`);
         return false;
      }
    }

    data.history[version] = {
      weights,
      avgReward,
      incidents: 0,
      createdAt: Date.now()
    };
    data.active = version;
    fs.writeFileSync(POLICY_FILE, JSON.stringify(data, null, 2));
    console.log(`[POLICY] 🚀 Promoted policy ${version} to active.`);
    return true;
  }

  rollback() {
    const data = JSON.parse(fs.readFileSync(POLICY_FILE, 'utf8'));
    const versions = Object.keys(data.history).sort();
    if (versions.length < 2) return;

    const previous = versions[versions.indexOf(data.active) - 1] || versions[0];
    console.log(`[POLICY] ⚠️ Rolling back from ${data.active} to ${previous} due to reward degradation.`);
    data.active = previous;
    fs.writeFileSync(POLICY_FILE, JSON.stringify(data, null, 2));
  }

  trackPerformance(reward) {
    const data = JSON.parse(fs.readFileSync(POLICY_FILE, 'utf8'));
    const active = data.history[data.active];
    
    // Moving average of reward
    active.avgReward = (active.avgReward * active.incidents + reward) / (active.incidents + 1);
    active.incidents++;

    fs.writeFileSync(POLICY_FILE, JSON.stringify(data, null, 2));

    // Auto-Rollback Gate
    if (active.incidents > 5 && active.avgReward < -0.5) {
      this.rollback();
    }
  }
}

module.exports = new PolicyManager();

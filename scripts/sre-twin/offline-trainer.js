// scripts/sre-twin/offline-trainer.js
const fs = require("fs");
const path = require("path");
const { loadQ, saveQ, updateQ } = require("../sre-rl/q-learning");

const DATASET_PATH = path.join(__dirname, "../../data/training-dataset.json");

function train() {
  if (!fs.existsSync(DATASET_PATH)) {
    console.error("❌ [TRAIN] No dataset found. Run dataset-builder first.");
    return;
  }

  const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, "utf8"));
  const q = loadQ();

  console.log(`🚀 [TRAIN] Starting offline training on ${dataset.length} samples...`);

  // Run multiple epochs to ensure convergence
  for (let epoch = 0; epoch < 100; epoch++) {
    dataset.forEach(sample => {
      updateQ(q, sample.state, sample.action, sample.reward, sample.nextState);
    });
  }

  saveQ(q);
  console.log("✅ [TRAIN] Offline training complete. Q-table updated.");
}

train();

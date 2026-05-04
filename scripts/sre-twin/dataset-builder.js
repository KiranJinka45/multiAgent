// scripts/sre-twin/dataset-builder.js
const fs = require("fs");
const path = require("path");
const { buildState } = require("../sre-rl/state-builder");

const INCIDENTS_PATH = path.join(__dirname, "../../data/incidents.json");
const DATASET_PATH = path.join(__dirname, "../../data/training-dataset.json");

function buildDataset() {
  if (!fs.existsSync(INCIDENTS_PATH)) return [];

  const incidents = JSON.parse(fs.readFileSync(INCIDENTS_PATH, "utf8"));
  
  // Group incidents into trajectories (state -> action -> reward -> nextState)
  // For this demo, we treat each incident as a single transition
  const dataset = incidents.map((i, index) => {
    const next = incidents[index + 1];
    if (!next) return null;

    return {
      state: buildState(i.metrics),
      action: i.decision.action,
      reward: i.reward || 0,
      nextState: buildState(next.metrics)
    };
  }).filter(Boolean);

  fs.writeFileSync(DATASET_PATH, JSON.stringify(dataset, null, 2));
  console.log(`✅ [DATASET] Created dataset with ${dataset.length} samples.`);
  return dataset;
}

buildDataset();

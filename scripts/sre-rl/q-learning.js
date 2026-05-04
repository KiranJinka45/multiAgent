// scripts/sre-rl/q-learning.js
const fs = require("fs");
const path = require("path");

const Q_TABLE_PATH = path.join(__dirname, "../../data/q-table.json");

function loadQ() {
  return fs.existsSync(Q_TABLE_PATH)
    ? JSON.parse(fs.readFileSync(Q_TABLE_PATH, "utf8"))
    : {};
}

function saveQ(q) {
  // Ensure directory exists
  const dir = path.dirname(Q_TABLE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(Q_TABLE_PATH, JSON.stringify(q, null, 2));
}

function getQ(q, state, action) {
  const key = JSON.stringify(state);
  return q[key]?.[action] || 0;
}

/**
 * Standard Q-Learning update rule:
 * Q(s,a) = Q(s,a) + alpha * (reward + gamma * max(Q(s',a')) - Q(s,a))
 */
function updateQ(q, state, action, reward, nextState) {
  const alpha = 0.1;  // Learning rate
  const gamma = 0.9;  // Discount factor (future impact)

  const key = JSON.stringify(state);
  const nextKey = JSON.stringify(nextState);

  q[key] = q[key] || {};
  
  // Find max value for the next state
  const nextActions = q[nextKey] || {};
  const maxNext = Object.values(nextActions).length > 0 
    ? Math.max(...Object.values(nextActions)) 
    : 0;

  const current = q[key][action] || 0;

  q[key][action] = current + alpha * (reward + gamma * maxNext - current);
  
  return q[key][action];
}

module.exports = { loadQ, saveQ, getQ, updateQ };

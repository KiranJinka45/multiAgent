// scripts/sre-swarm/coordinator.js
const dbAgent = require("./agents/db-agent");
const trafficAgent = require("./agents/traffic-agent");
const costAgent = require("./agents/cost-agent");
const { resolve } = require("./consensus");
const { decide: globalAI } = require("../sre-ai/inference");

function coordinate(metrics, context) {
  console.log("[SWARM] 🐝 Initiating multi-agent proposal cycle...");

  const proposals = [
    dbAgent.propose(metrics, context),
    trafficAgent.propose(metrics, context),
    costAgent.propose(metrics, context)
  ];

  // Also include the Global Strategist/AI's view as a "weighted" proposal
  const aiDecision = globalAI(metrics, context);
  proposals.push({
    agent: 'GLOBAL_STRATEGIST',
    action: aiDecision.action,
    confidence: aiDecision.confidence || 0.8,
    cost: 50,
    reason: aiDecision.reason || 'Strategic global optimization'
  });

  console.log(`[SWARM] Received ${proposals.length} proposals. Resolving consensus...`);
  
  const consensus = resolve(proposals);
  
  return {
    ...consensus,
    proposals // Capture for post-mortem transparency
  };
}

module.exports = { coordinate };

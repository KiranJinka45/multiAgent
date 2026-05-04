// scripts/sre-swarm/blackboard.js

/**
 * Blackboard: Shared state for the SRE Swarm.
 * Agents read current system state and post 'intents' (proposed actions).
 */
class Blackboard {
  constructor() {
    this.state = {};
    this.proposals = [];
  }

  setState(metrics) {
    this.state = metrics;
  }

  getState() {
    return this.state;
  }

  postIntent(intent) {
    console.log(`[SWARM] Agent ${intent.agent} proposed: ${intent.action} (${(intent.confidence * 100).toFixed(0)}%)`);
    this.proposals.push(intent);
  }

  getProposals() {
    return this.proposals;
  }

  clear() {
    this.proposals = [];
  }
}

module.exports = new Blackboard();

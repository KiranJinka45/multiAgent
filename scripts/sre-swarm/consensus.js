// scripts/sre-swarm/consensus.js

/**
 * Consensus Engine: Resolves conflicts between specialized agents.
 */
function resolve(proposals) {
  if (!proposals.length) return null;

  // 1. Scoring: Confidence / Cost
  const scored = proposals.map(p => ({
    ...p,
    score: (p.confidence * 10) / (p.cost || 1)
  }));

  // 2. Grouping & Quorum
  const actionBuckets = {};
  scored.forEach(p => {
    if (!actionBuckets[p.action]) {
      actionBuckets[p.action] = {
        action: p.action,
        totalScore: 0,
        agents: [],
        maxConfidence: 0,
        avgCost: 0
      };
    }
    actionBuckets[p.action].totalScore += p.score;
    actionBuckets[p.action].agents.push(p.agent);
    actionBuckets[p.action].maxConfidence = Math.max(actionBuckets[p.action].maxConfidence, p.confidence);
    actionBuckets[p.action].avgCost += p.cost;
  });

  // Calculate final metrics per action
  const finalCandidates = Object.values(actionBuckets).map(a => ({
    ...a,
    avgCost: a.avgCost / a.agents.length,
    hasQuorum: a.agents.length > 1
  }));

  // 3. Selection Strategy
  // Priority 1: High Total Score (Confidence/Cost balance)
  // Priority 2: Quorum (Multiple agents agreeing)
  // Priority 3: Lowest Average Cost (Tie-breaker)
  
  finalCandidates.sort((a, b) => {
    if (a.hasQuorum && !b.hasQuorum) return -1;
    if (!a.hasQuorum && b.hasQuorum) return 1;
    return b.totalScore - a.totalScore;
  });

  // 4. Critical Action Gating: High-impact actions REQUIRE Quorum
  const HIGH_IMPACT_ACTIONS = ['GLOBAL_FAILOVER', 'ROLLBACK'];
  
  const winner = finalCandidates[0];
  
  if (HIGH_IMPACT_ACTIONS.includes(winner.action) && !winner.hasQuorum) {
    console.log(`[CONSENSUS] 🛑 Rejected ${winner.action} - High impact requires Quorum. Reverting to MONITOR.`);
    return { action: 'MONITOR', agents: winner.agents, totalScore: 0, hasQuorum: false };
  }

  console.log(`[CONSENSUS] Winner: ${winner.action} (Score: ${winner.totalScore.toFixed(2)}, Quorum: ${winner.hasQuorum})`);
  
  return winner;
}

module.exports = { resolve };

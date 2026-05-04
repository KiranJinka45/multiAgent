// scripts/sre-global/authority.js
const Redis = require('ioredis');
const raft = require('./raft-authority');
const redis = new Redis(); // Shared global state

/**
 * Global Authority Service: The Central Governance layer for Planet-Scale Autonomy.
 * Prevents cross-region conflicts and enforces global execution quotas.
 * Now backed by Raft Consensus for linearizable safety.
 */
class GlobalAuthority {
  constructor() {
    this.QUOTA_TTL = 3600; // 1 hour
    this.MAX_CONCURRENT_HIGH_IMPACT = 1;
  }

  /**
   * Requests permission for an AI action.
   * action: { type, risk, blastRadius }
   */
  async requestExecution(region, action) {
    console.log(`🌍 [GLOBAL-AUTHORITY] ${region} requesting ${action.type} (Risk: ${action.risk})`);

    // 1. Check Global Kill Switch
    const isKilled = await redis.get('SRE_GLOBAL_KILL_SWITCH');
    if (isKilled === 'TRUE') {
      return { allowed: false, reason: 'GLOBAL_KILL_SWITCH_ACTIVE' };
    }

    // 2. Consensus-Backed Permission for High-Risk Actions
    if (action.risk === 'CRITICAL' || action.risk === 'HIGH') {
      const raftAuth = await raft.requestConsensus(action);
      if (!raftAuth.allowed) {
        return { allowed: false, reason: `RAFT_CONSENSUS_DENIED: ${raftAuth.reason}` };
      }
      // Attach fencing token for distributed lock safety
      action.fencingToken = raftAuth.fencingToken;
    }

    // 3. Uncertainty Gating (Phase 4)
    if (action.stateUncertainty > 0.3) { // 30% uncertainty threshold
      return { allowed: false, reason: 'STATE_UNCERTAINTY_TOO_HIGH' };
    }

    // 4. Economic Guardrails (Phase 6)
    const econ = require('./economic-guardrails');
    const projectedCost = action.projectedCost || 5.0; // Estimate
    const viability = await econ.checkViability(action, projectedCost);
    if (!viability.allowed) {
        return { allowed: false, reason: `ECONOMIC_BUDGET_EXCEEDED: ${viability.reason}` };
    }


    // 4. Policy Oscillation Protection (Phase 4)
    const oscillationKey = `SRE_OSCILLATION:${action.targetResource || 'global'}`;
    const recentActions = await redis.incr(oscillationKey);
    if (recentActions === 1) await redis.expire(oscillationKey, 300); // 5 min window
    
    if (recentActions > 3) { // Max 3 mutations per 5 mins
      return { allowed: false, reason: 'POLICY_OSCILLATION_DETECTED' };
    }

    // 5. Enforce Blast Radius Quota (Hard Non-AI Gate)
    const quotaKey = `SRE_QUOTA:${region}:BLAST_RADIUS`;
    const currentBlast = await redis.get(quotaKey) || 0;
    if (parseFloat(currentBlast) + action.blastRadius > 0.5) { 
      return { allowed: false, reason: 'EXCEEDED_BLAST_RADIUS_QUOTA' };
    }

    // 6. Update Quota
    await redis.set(quotaKey, parseFloat(currentBlast) + action.blastRadius, 'EX', this.QUOTA_TTL);

    return { 
      allowed: true, 
      fencingToken: action.fencingToken,
      quotaRemaining: 0.5 - (parseFloat(currentBlast) + action.blastRadius) 
    };

  }

  /**
   * Global Kill Switch: Halt all AI execution across the planet
   */
  async triggerGlobalHalt(reason) {
    await redis.set('SRE_GLOBAL_KILL_SWITCH', 'TRUE', 'EX', 86400);
    console.log(`🚨 [GLOBAL-AUTHORITY] !!! GLOBAL HALT TRIGGERED !!! Reason: ${reason}`);
  }
}

module.exports = new GlobalAuthority();


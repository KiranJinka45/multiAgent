const { coordinate: decide } = require("../sre-swarm/coordinator");
const { saveIncident } = require("../sre-ai/incident-store");
const { loadQ, saveQ, updateQ } = require("../sre-rl/q-learning");
const { calculateReward } = require("../sre-rl/reward");
const { buildState } = require("../sre-rl/state-builder");
const shadowValidator = require("../sre-ai/shadow-validator");
const { trainSelf } = require("../sre-chaos/self-trainer");
const policyManager = require("../sre-rl/policy-manager");
const { runCanary } = require("../sre-plan/canary-runner");
const { generatePostMortem } = require("../sre-ai/post-mortem");
const safety = require("./safety-invariants");
const calibrator = require("../sre-ai/calibrator");
const rollout = require("../sre-global/rollout-controller");
const authority = require("../sre-global/authority");
const { exec } = require("child_process");
const axios = require("axios");

const GATEWAY_URL = "http://localhost:4080";
let lastAction = null;
let lastActionTime = 0;
let cycleCount = 0;

async function getSystemMetrics() {
  try {
    const res = await axios.get(`${GATEWAY_URL}/api/admin/health`, { timeout: 2000 });
    return res.data;
  } catch (err) {
    return { errorRate: 1, avgLatency: 5000, redisStatus: 'DOWN', activeWorkers: 0 };
  }
}

async function executeAction(action, options = {}) {
  if (action === 'MONITOR') return;
  const isCanary = options.scope === 'CANARY';
  console.log(`[AUTO-HEALER] ⚡ Executing ${isCanary ? 'CANARY ' : ''}Action: ${action}`);
  
  const commands = {
    "RESTART_WORKERS": isCanary ? "docker-compose restart worker-canary" : "docker-compose restart worker",
    "ROLLBACK": "node scripts/sre/rollback.js",
    "LOAD_SHEDDING": `curl -X POST http://localhost:4080/api/admin/governance/mode -H "idempotency-key: sre-auto-${Date.now()}" -d 'mode=PROTECT'`,
    "GLOBAL_FAILOVER": "node scripts/global-validation/region-failover.js"
  };

  return new Promise((res) => {
    if (!commands[action]) return res();
    exec(commands[action], (err) => {
      if (err) console.error(`[ERROR] Action ${action} failed:`, err);
      res();
    });
  });
}

async function runLoop() {
  console.log("🚀 [SRE] Level 5 Governed & Explainable Swarm Active.");

  while (true) {
    cycleCount++;
    const preMetrics = await getSystemMetrics();
    const context = { lastAction, lastActionTime, recentDeploy: true, activeIncidents: preMetrics.errorRate > 0.1 ? 1 : 0 };

    const decision = decide(preMetrics, context);
    
    const activePolicy = policyManager.getActivePolicy();
    const shadowStats = shadowValidator.validate(preMetrics, decision);
    
    decision.evolution = {
      cycle: cycleCount,
      winRate: shadowStats.winRate,
      score: activePolicy.avgReward > 0 ? 90 : 70,
      policyVersion: activePolicy.version
    };

    if (decision.action !== "MONITOR") {
      // 1. Planet-Scale Rollout & Safety Stack
      const planAction = { 
          type: decision.action, 
          risk: (decision.action === 'GLOBAL_FAILOVER') ? 'CRITICAL' : 'MEDIUM',
          blastRadius: 0.1, // Initial conservative blast radius
          confidence: decision.confidence / 100
      };

      const audit = await rollout.processAction(planAction, preMetrics, state);
      
      if (audit.status === 'BLOCKED') {
        console.log(`[GLOBAL-SAFETY] 🛑 BLOCKING ACTION: ${decision.action}. Reason: ${audit.reason}`);
        decision.action = "MONITOR";
        decision.safetyBlocked = true;
      } else {
        console.log(`🛡️ [GLOBAL-SAFETY] Action ${decision.action} approved via ${audit.executionType}`);
        
        if (audit.executionType === 'LOG_ONLY' || audit.executionType === 'HUMAN_APPROVAL_REQUIRED') {
            decision.action = "MONITOR";
            decision.requiresHuman = true;
        } else if (audit.executionType === 'CANARY') {
            // Proceed via Canary
            const canaryPassed = await runCanary(decision.action, executeAction, getSystemMetrics);
            if (!canaryPassed) decision.action = "MONITOR";
        }
      }

      if (decision.action !== "MONITOR" && !decision.requiresHuman) {
        // Full Rollout
        console.log(`🚨 [SRE] Executing full rollout for ${decision.action}`);
        await executeAction(decision.action);
        
        await new Promise(r => setTimeout(r, 10000));
        const postMetrics = await getSystemMetrics();
        const nextState = buildState(postMetrics);
        
        const reward = calculateReward(preMetrics, postMetrics, decision.action);
        const totalReward = reward + (decision.lift?.lift || 0);
        
        // 4. Update Policy and Calibrator
        calibrator.track(decision.confidence / 100, totalReward);
        
        const q = loadQ();
        updateQ(q, decision.state, decision.action, totalReward, nextState);
        saveQ(q);

        // 5. Release Global Authority Lock
        await authority.releaseExecution(rollout.region, { type: decision.action, risk: (decision.action === 'GLOBAL_FAILOVER') ? 'CRITICAL' : 'MEDIUM' });
        
        policyManager.trackPerformance(totalReward);

        const incidentData = { metrics: preMetrics, decision, outcome: 'SUCCESS', reward: totalReward };
        const postMortem = generatePostMortem(incidentData);
        
        saveIncident({ ...incidentData, postMortem });
        console.log(`[EXPLAIN] 📄 Post-Mortem generated: ${postMortem.incidentId}`);

        lastAction = decision.action;
        lastActionTime = Date.now();
        await new Promise(r => setTimeout(r, 20000));
      } else {
        console.log(`⚠️ [SRE] Canary FAILED. Action ${decision.action} aborted.`);
      }
    }

    await new Promise(r => setTimeout(r, 10000));
  }
}

runLoop().catch(console.error);

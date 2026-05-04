// scripts/sre-global/rollout-controller.js
const authority = require('./authority');
const fallback = require('./fallback');
const progressive = require('./progressive-rollout');
const safety = require('../sre/safety-invariants');
const calibrator = require('../sre-ai/calibrator');

/**
 * Planet-Scale Rollout Controller: Manages the progressive authority of AI.
 * Enforces the Phased Rollout strategy and the Global Safety Envelope.
 */
class RolloutController {
  constructor() {
    this.STAGES = {
      0: 'SHADOW_MODE',         // Log only
      1: 'ASSISTED_MODE',       // Human approval required
      2: 'LOW_RISK_AUTONOMY',   // Auto for low-risk actions
      3: 'CANARY_AUTONOMY',     // Auto via canary for medium-risk
      4: 'SCOPED_FULL',         // Full per-region autonomy
      5: 'CONTROLLED_GLOBAL'    // Planet-scale autonomous authority
    };

    this.currentStage = 0;
    this.region = process.env.REGION || 'us-east-1';
  }

  /**
   * The "Decision Safety Stack" Execution Pipeline.
   * Every AI action must pass this stack.
   */
  async processAction(action, metrics, state) {
    console.log(`🛡️ [ROLLOUT] Processing action ${action.type} at Stage ${this.currentStage} (${this.STAGES[this.currentStage]})`);

    // 1. Unified Global Permission Layer (Consensus-Backed)
    let auth;
    try {
        auth = await authority.requestExecution(this.region, action);
    } catch (err) {
        const fallbackState = fallback.degrade(this.currentStage, err);
        return { status: 'DEGRADED', reason: fallbackState.reason, executionType: 'LOG_ONLY' };
    }

    if (!auth.allowed) {
      return { status: 'BLOCKED', reason: `GLOBAL_PERMISSION_DENIED: ${auth.reason}` };
    }

    // 2. Progressive Blast Radius Enforcement
    const policyAge = state.policyCreatedAt || Date.now();
    const blastCheck = progressive.validateBlastRadius(policyAge, action.blastRadius || 0.1);
    if (!blastCheck.isValid) {
        return { status: 'BLOCKED', reason: `BLAST_RADIUS_VIOLATION: Max allowed is ${blastCheck.allowed} for policy age ${blastCheck.age} days` };
    }

    // 3. Safety Invariant Check (Hard deterministic law)
    const safetyAudit = safety.validate(action.type, state, metrics);
    if (!safetyAudit.isValid) {
      return { status: 'BLOCKED', reason: `SAFETY_INVARIANT: ${safetyAudit.violations[0].message}` };
    }

    // 3. Stage-Aware Execution Logic
    let executionType = 'NONE';
    const risk = action.risk || 'LOW';

    switch (this.currentStage) {
      case 0: // SHADOW
        executionType = 'LOG_ONLY';
        break;
      case 1: // ASSISTED
        executionType = 'HUMAN_APPROVAL_REQUIRED';
        break;
      case 2: // LOW_RISK
        executionType = (risk === 'LOW') ? 'AUTO' : 'HUMAN_APPROVAL_REQUIRED';
        break;
      case 3: // CANARY
        executionType = (risk === 'LOW' || risk === 'MEDIUM') ? 'CANARY' : 'HUMAN_APPROVAL_REQUIRED';
        break;
      default:
        executionType = 'AUTO';
    }

    // 4. Confidence-Gated Promotion
    const calibratedConf = calibrator.calibrate(action.confidence || 0.5);
    if (calibratedConf < 0.7 && executionType !== 'LOG_ONLY') {
      console.log(`⚠️ [ROLLOUT] Confidence too low (${calibratedConf.toFixed(2)}). Escalating to Human.`);
      executionType = 'HUMAN_APPROVAL_REQUIRED';
    }

    return {
      status: 'PROCESSED',
      executionType,
      region: this.region,
      fencingToken: auth.fencingToken,
      calibratedConfidence: calibratedConf
    };
  }

  setStage(stage) {
    if (this.STAGES[stage]) {
      this.currentStage = stage;
      console.log(`🚀 [ROLLOUT] Authority Stage escalated to ${stage}: ${this.STAGES[stage]}`);
    }
  }
}

module.exports = new RolloutController();


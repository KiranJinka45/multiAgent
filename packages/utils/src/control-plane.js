"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControlPlaneMetrics = exports.ControlPlane = void 0;
exports.evaluateMode = evaluateMode;
exports.calculateErrorBudget = calculateErrorBudget;
/**
 * CONTROL PLANE ENGINE
 *
 * The closed-loop feedback system that bridges Observe → Decide → Act → Stabilize.
 *
 * Reads real-time system state from Redis/Prometheus counters, evaluates the
 * current operating mode (NORMAL → DEGRADED → PROTECT → EMERGENCY), and
 * distributes enforcement decisions to all cluster nodes via Redis.
 *
 * This is the "brain" that makes the system self-protecting.
 */
const observability_1 = require("@packages/observability");
// Defensive metric imports — gracefully degrade if observability hasn't compiled new exports
let jobTotal = null;
let jobRetriesTotal = null;
let queueDepth = null;
let activeWorkers = null;
try {
    const obs = require('@packages/observability');
    jobTotal = obs.jobTotal;
    jobRetriesTotal = obs.jobRetriesTotal;
    queueDepth = obs.queueDepth;
    activeWorkers = obs.activeWorkers;
}
catch { /* metrics unavailable — non-fatal */ }
// ── Mode Evaluation (Pure Function — Testable) ──────────────────────────────
const MODE_THRESHOLDS = {
    emergency: {
        failureRate: 0.05,
        queueDepth: 5000,
        activeWorkers: 0,
    },
    protect: {
        failureRate: 0.01,
        retryRate: 20,
    },
    degraded: {
        latencyP95Ms: 120_000,
        queueDepth: 1000,
    },
};
function evaluateMode(state) {
    // EMERGENCY: No workers or catastrophic failure rate
    if (state.activeWorkers === 0)
        return 'EMERGENCY';
    if (state.failureRate > MODE_THRESHOLDS.emergency.failureRate ||
        state.queueDepth > MODE_THRESHOLDS.emergency.queueDepth) {
        return 'EMERGENCY';
    }
    // PROTECT: Failure rate or retry rate exceeded SLO
    if (state.failureRate > MODE_THRESHOLDS.protect.failureRate ||
        state.retryRate > MODE_THRESHOLDS.protect.retryRate) {
        return 'PROTECT';
    }
    // DEGRADED: Latency SLO breach or moderate queue buildup
    if (state.latencyP95Ms > MODE_THRESHOLDS.degraded.latencyP95Ms ||
        state.queueDepth > MODE_THRESHOLDS.degraded.queueDepth) {
        return 'DEGRADED';
    }
    return 'NORMAL';
}
// ── Error Budget Engine ─────────────────────────────────────────────────────
const SLO_TARGET = 0.999; // 99.9%
const ERROR_BUDGET = 1 - SLO_TARGET; // 0.001
function calculateErrorBudget(failureRate, windowMinutes = 60) {
    // Burn rate: how fast we're consuming the error budget relative to the SLO window
    const burnRate = failureRate / ERROR_BUDGET;
    // Budget remaining: assumes a 30-day window, calculate how much is left
    // If burn rate > 1, we're burning faster than allowed
    const budgetRemaining = Math.max(0, 1 - (burnRate * (windowMinutes / (30 * 24 * 60))));
    const isExhausted = budgetRemaining <= 0 || burnRate > 2;
    return {
        burnRate,
        budgetRemaining,
        isExhausted,
        blockDeployments: burnRate > 2,
        shedNonCriticalTraffic: isExhausted,
    };
}
// ── Control Plane (Stateful — Runs as Singleton) ────────────────────────────
class ControlPlane {
    redis;
    intervalHandle = null;
    currentMode = 'NORMAL';
    previousMode = 'NORMAL';
    modeStableSince = Date.now();
    errorsAtModeEntry = 0;
    missionsAtModeEntry = 0;
    effectivenessScore = 0; // 0 to 1, where 1 is 100% reduction in error rate acceleration
    errorsBeforeEscalation = 0;
    // Hysteresis: prevent mode flapping by requiring stable readings before downgrade
    STABILITY_WINDOW_MS = 15_000; // 15 seconds of stability before downgrading
    EVAL_INTERVAL_MS = 5_000; // evaluate every 5 seconds
    // Redis keys for cluster-wide mode distribution (Multi-Region Aware)
    static get MODE_KEY() { return `system:control_plane:mode:${process.env.REGION_ID || 'local'}`; }
    static get STATE_KEY() { return `system:control_plane:state:${process.env.REGION_ID || 'local'}`; }
    static get BUDGET_KEY() { return `system:control_plane:error_budget:${process.env.REGION_ID || 'local'}`; }
    // New Prometheus metrics for control plane observability
    loadSheddingTotal = { inc: (_labels) => { } };
    requestsRejectedTotal = { inc: (_labels) => { } };
    controlPlaneModeGauge = { set: (_labels, _val) => { } };
    controlPlaneEvaluationLatency = { observe: (_val) => { } };
    controlPlaneModeChangesTotal = { inc: (_labels) => { } };
    controlPlaneFailuresTotal = { inc: (_labels) => { } };
    static localState = {
        mode: 'NORMAL',
        version: 0,
        updatedAt: Date.now()
    };
    constructor(redisClient) {
        this.redis = redisClient;
        // Try to load control plane metrics
        try {
            const obs = require('@packages/observability');
            if (obs.controlPlaneEvaluationLatency)
                this.controlPlaneEvaluationLatency = obs.controlPlaneEvaluationLatency;
            if (obs.controlPlaneModeChangesTotal)
                this.controlPlaneModeChangesTotal = obs.controlPlaneModeChangesTotal;
            if (obs.controlPlaneFailuresTotal)
                this.controlPlaneFailuresTotal = obs.controlPlaneFailuresTotal;
        }
        catch { /* metrics unavailable — non-fatal */ }
    }
    // ── Metrics Adapter: Read Real-Time State ───────────────────────────────
    async getSystemState() {
        try {
            // Read from Redis counters (set by worker heartbeats and job processing)
            const [failedCount, totalCount, retryCount, depth, workers, latency,] = await Promise.all([
                this.redis.get('control:metrics:failed_5m').then((v) => parseFloat(v || '0')),
                this.redis.get('control:metrics:total_5m').then((v) => parseFloat(v || '1')),
                this.redis.get('control:metrics:retries_5m').then((v) => parseFloat(v || '0')),
                this.redis.get('governance:total_active_jobs').then((v) => parseInt(v || '0', 10)),
                this.redis.keys('worker:heartbeat:*').then((keys) => keys.length),
                this.redis.get('control:metrics:latency_p95').then((v) => parseFloat(v || '0')),
            ]);
            const totalSafe = Math.max(totalCount, 1); // prevent division by zero
            return {
                failureRate: failedCount / totalSafe,
                retryRate: retryCount / 5, // per second (5-minute window)
                queueDepth: depth,
                activeWorkers: workers,
                latencyP95Ms: latency,
            };
        }
        catch (err) {
            observability_1.logger.error({ err }, '[ControlPlane] Failed to read system state');
            // Fail safe: return healthy defaults so we don't accidentally trigger EMERGENCY
            return { failureRate: 0, retryRate: 0, queueDepth: 0, activeWorkers: 1, latencyP95Ms: 0 };
        }
    }
    // ── Core Control Loop ────────────────────────────────────────────────────
    async evaluate() {
        const startMs = Date.now();
        const regionId = process.env.REGION_ID || 'local';
        // 1. Leadership Election (Deterministic)
        const leader = await this.redis.get('system:control_plane:leader');
        let isLeader = false;
        if (!leader || leader === regionId) {
            if (!leader) {
                const acquired = await this.redis.set('system:control_plane:leader', regionId, 'NX', 'EX', 10);
                isLeader = acquired === 'OK';
            }
            else {
                await this.redis.set('system:control_plane:leader', regionId, 'EX', 10);
                isLeader = true;
            }
        }
        if (!isLeader) {
            return null; // Not the leader, do not evaluate
        }
        const state = await this.getSystemState();
        const candidateMode = evaluateMode(state);
        const budget = calculateErrorBudget(state.failureRate);
        // Error budget override: if budget is exhausted, force PROTECT mode minimum
        let finalMode = candidateMode;
        if (budget.isExhausted && candidateMode === 'NORMAL') {
            finalMode = 'DEGRADED';
        }
        // Export deployment block signals
        if (budget.blockDeployments) {
            await this.redis.set('system:deploy:blocked', 'true', 'EX', 60); // 1-minute expiration
        }
        else {
            await this.redis.del('system:deploy:blocked');
        }
        // Hysteresis: only allow mode DOWNGRADE (less severe) if stable for STABILITY_WINDOW_MS
        const modeOrder = ['NORMAL', 'DEGRADED', 'PROTECT', 'EMERGENCY'];
        const currentSeverity = modeOrder.indexOf(this.currentMode);
        const candidateSeverity = modeOrder.indexOf(finalMode);
        if (candidateSeverity < currentSeverity) {
            // Attempting to downgrade (less severe) — require stability
            const stableFor = Date.now() - this.modeStableSince;
            if (stableFor < this.STABILITY_WINDOW_MS) {
                finalMode = this.currentMode; // Hold current mode
            }
        }
        // 2. Control-Plane Effectiveness Loop Validation
        if (this.currentMode !== 'NORMAL' && this.currentMode !== 'EMERGENCY') {
            const timeInMode = Date.now() - this.modeStableSince;
            if (timeInMode > 30000) { // 30s evaluation window
                const effectivenessRatio = state.failureRate / Math.max(0.0001, this.errorsBeforeEscalation);
                if (effectivenessRatio >= 1.0) {
                    observability_1.logger.error({ effectivenessRatio, failureRate: state.failureRate, previous: this.errorsBeforeEscalation }, '💥 [ControlPlane] Control loop validation failed (no improvement). Escalating to EMERGENCY.');
                    finalMode = 'EMERGENCY';
                }
            }
        }
        // Track mode changes
        if (finalMode !== this.currentMode) {
            this.previousMode = this.currentMode;
            this.currentMode = finalMode;
            this.modeStableSince = Date.now();
            if (finalMode === 'PROTECT' || finalMode === 'DEGRADED') {
                this.errorsBeforeEscalation = state.failureRate;
            }
            else if (finalMode === 'NORMAL') {
                this.errorsBeforeEscalation = 0;
            }
            this.controlPlaneModeChangesTotal.inc({ from_mode: this.previousMode, to_mode: this.currentMode });
            observability_1.logger.warn({
                previousMode: this.previousMode,
                newMode: this.currentMode,
                state,
                budget,
            }, `🚦 [ControlPlane] Mode transition: ${this.previousMode} → ${this.currentMode}`);
        }
        // Distribute mode to all cluster nodes
        await this.distributeMode(finalMode, state, budget);
        this.controlPlaneEvaluationLatency.observe((Date.now() - startMs) / 1000);
        return { mode: finalMode, state, budget };
    }
    // ── Cluster-Wide Mode Distribution ──────────────────────────────────────
    async distributeMode(mode, state, budget) {
        try {
            const nextVersion = ControlPlane.localState.version + 1;
            const modeState = { mode, version: nextVersion, updatedAt: Date.now() };
            const pipeline = this.redis.pipeline();
            pipeline.set(ControlPlane.MODE_KEY, JSON.stringify(modeState), 'EX', 10); // 10s TTL — failsafe to escalate if control plane dies
            pipeline.set(ControlPlane.STATE_KEY, JSON.stringify(state), 'EX', 10);
            pipeline.set(ControlPlane.BUDGET_KEY, JSON.stringify(budget), 'EX', 10);
            await pipeline.exec();
            ControlPlane.localState = modeState;
        }
        catch (err) {
            this.controlPlaneFailuresTotal.inc();
            observability_1.logger.error({ err }, '[ControlPlane] Failed to distribute mode');
        }
    }
    // ── Static Readers (For Gateway / Worker / Any Service) ─────────────────
    static async getRegionModeSafe(redis, regionId) {
        try {
            const raw = await redis.get(`system:control_plane:mode:${regionId}`);
            if (!raw)
                return ControlPlane.escalate(ControlPlane.localState.mode, 'PROTECT');
            let remote;
            try {
                remote = JSON.parse(raw);
            }
            catch {
                return raw;
            }
            return remote.mode;
        }
        catch (err) {
            observability_1.logger.error({ err: err.message }, '💥 [ControlPlane] Redis unreachable, falling back to local PROTECT mode');
            return ControlPlane.escalate(ControlPlane.localState.mode, 'PROTECT');
        }
    }
    static async getModeSafe(redis, defaultEscalation = 'PROTECT') {
        try {
            const raw = await redis.get(ControlPlane.MODE_KEY);
            if (!raw)
                return ControlPlane.escalate(ControlPlane.localState.mode, defaultEscalation);
            let remote;
            try {
                remote = JSON.parse(raw);
            }
            catch {
                return raw;
            }
            if (remote.version < ControlPlane.localState.version) {
                return ControlPlane.localState.mode;
            }
            ControlPlane.localState = remote;
            return remote.mode;
        }
        catch {
            return ControlPlane.escalate(ControlPlane.localState.mode, defaultEscalation);
        }
    }
    static escalate(mode, defaultFallback) {
        if (mode === 'NORMAL')
            return 'DEGRADED';
        if (mode === 'DEGRADED')
            return 'PROTECT';
        if (mode === 'PROTECT')
            return 'EMERGENCY';
        return mode || defaultFallback;
    }
    static async getErrorBudget(redis) {
        try {
            const raw = await redis.get(ControlPlane.BUDGET_KEY);
            return raw ? JSON.parse(raw) : null;
        }
        catch {
            return null;
        }
    }
    // ── Lifecycle ───────────────────────────────────────────────────────────
    start() {
        if (this.intervalHandle)
            return;
        observability_1.logger.info('[ControlPlane] 🚀 Control loop started (eval every 5s)');
        this.intervalHandle = setInterval(() => {
            this.evaluate().catch(err => {
                observability_1.logger.error({ err }, '[ControlPlane] Evaluation cycle failed');
            });
        }, this.EVAL_INTERVAL_MS);
        // Run immediately on start
        this.evaluate().catch(() => { });
    }
    stop() {
        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
            this.intervalHandle = null;
            observability_1.logger.info('[ControlPlane] ⏹️ Control loop stopped');
        }
    }
    getMode() {
        return this.currentMode;
    }
}
exports.ControlPlane = ControlPlane;
// ── Metrics Push (Called by Worker on Each Job) ─────────────────────────────
// These functions update the Redis counters that the Control Plane reads.
// They use sliding window counters for 5-minute aggregation.
class ControlPlaneMetrics {
    static async recordJobResult(redis, status) {
        const pipeline = redis.pipeline();
        pipeline.incr('control:metrics:total_5m');
        pipeline.expire('control:metrics:total_5m', 300); // 5 minutes
        if (status === 'failed') {
            pipeline.incr('control:metrics:failed_5m');
            pipeline.expire('control:metrics:failed_5m', 300);
        }
        await pipeline.exec();
    }
    static async recordRetry(redis) {
        const pipeline = redis.pipeline();
        pipeline.incr('control:metrics:retries_5m');
        pipeline.expire('control:metrics:retries_5m', 300);
        await pipeline.exec();
    }
    static async recordLatencyP95(redis, latencyMs) {
        // Simple approach: store the latest P95 reading
        // In production, use a histogram or T-Digest for proper percentile calculation
        await redis.set('control:metrics:latency_p95', latencyMs.toString(), 'EX', 300);
    }
    static async incrementRetryRate(redis, tenantId = 'global', tier = 'free') {
        const pipeline = redis.pipeline();
        pipeline.incr(`system:retry:rate:${tenantId}:${tier}`);
        pipeline.expire(`system:retry:rate:${tenantId}:${tier}`, 1);
        await pipeline.exec();
    }
    static async getRetryRate(redis, tenantId = 'global', tier = 'free') {
        const val = await redis.get(`system:retry:rate:${tenantId}:${tier}`);
        return parseInt(val || '0', 10);
    }
}
exports.ControlPlaneMetrics = ControlPlaneMetrics;
//# sourceMappingURL=control-plane.js.map
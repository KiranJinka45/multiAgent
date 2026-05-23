import { RuntimePairExecutor } from './RuntimePairExecutor.js';
import type { ReplayExecutionContract } from './ReplayExecutionContract.js';
import type { ReplayTelemetryProfile } from './ReplayArtifactCollector.js';

export interface QueueTask {
  contract: ReplayExecutionContract;
  payload: string;
  resolve: (res: ReplayTelemetryProfile) => void;
  reject: (err: any) => void;
  queuedAt: number;
}

/**
 * Manages and schedules concurrent execution runs of differential replay contracts.
 * Throttles execution pool size to limit active subprocesses and avoid descriptor exhaustion.
 * Actively monitors event-loop starvation, queue backlog trends, and completion metrics.
 * Calculates first- and second-order derivatives to segment the collapse phases.
 */
export class ReplayQueueScheduler {
  private queue: QueueTask[] = [];
  private activeCount = 0;
  private maxConcurrency: number;

  // Event loop monitor properties
  private eventLoopTimer: NodeJS.Timeout | null = null;
  private lastLoopTime = Date.now();
  public maxEventLoopBlockTime = 0;

  // Statistics & History
  public totalQueued = 0;
  public totalCompleted = 0;
  public accumulatedQueueDelayMs = 0;
  
  public backlogDepthHistory: number[] = [];
  public hysteresisCoordinates: { backlog: number; delay: number }[] = [];
  public queueDelays: number[] = [];
  public completionDurations: number[] = [];
  public stdoutDrainLatencies: number[] = [];
  public varianceHistory: number[] = [];
  public parentMemoryHistory: number[] = [];

  // Recovery half-life tracking
  public peakBacklogDepth = 0;
  private peakBacklogTime = 0;
  public recoveryHalfLifeMs = 0;

  // Calibration thresholds set dynamically after 5 runs
  private isCalibrated = false;
  private baselineAvgDuration = 0;
  private baselineStdDevDuration = 0;
  private baselineAvgDrain = 0;
  private baselineStdDevDrain = 0;
  private baselineAvgDelay = 0;
  private baselineStdDevDelay = 0;

  // Calibrated limits (with standard safe fallbacks)
  private limitPressuredDelay = 100;
  private limitSaturatedDelay = 1000;
  private limitDestabilizingBlock = 50;
  private limitCollapseBlock = 150;

  constructor(maxConcurrency = 4) {
    this.maxConcurrency = maxConcurrency;
    this.startEventLoopMonitor();
  }

  private startEventLoopMonitor() {
    this.lastLoopTime = Date.now();
    this.eventLoopTimer = setInterval(() => {
      const now = Date.now();
      const delay = now - this.lastLoopTime - 5;
      if (delay > this.maxEventLoopBlockTime) {
        this.maxEventLoopBlockTime = delay;
      }
      
      const len = this.queue.length;
      this.backlogDepthHistory.push(len);

      if (len > this.peakBacklogDepth) {
        this.peakBacklogDepth = len;
        this.peakBacklogTime = Date.now();
        this.recoveryHalfLifeMs = 0; // reset
      } else if (this.peakBacklogDepth > 0 && len <= Math.floor(this.peakBacklogDepth / 2) && this.recoveryHalfLifeMs === 0) {
        this.recoveryHalfLifeMs = Date.now() - this.peakBacklogTime;
      }

      this.lastLoopTime = now;
    }, 5);
  }

  /**
   * Stops the internal monitor timer to allow node process exit cleanly.
   */
  public shutdown() {
    if (this.eventLoopTimer) {
      clearInterval(this.eventLoopTimer);
      this.eventLoopTimer = null;
    }
  }

  /**
   * Enqueues a replay execution contract task.
   * Returns a promise that resolves when the execution completes.
   */
  public schedule(contract: ReplayExecutionContract, payload: string): Promise<ReplayTelemetryProfile> {
    this.totalQueued++;
    return new Promise<ReplayTelemetryProfile>((resolve, reject) => {
      this.queue.push({
        contract,
        payload,
        resolve,
        reject,
        queuedAt: Date.now()
      });
      this.processQueue();
    });
  }

  /**
   * Computes the completion duration variance.
   */
  public getReplayCompletionVariance(): number {
    if (this.completionDurations.length === 0) return 0;
    const avg = this.completionDurations.reduce((a, b) => a + b, 0) / this.completionDurations.length;
    const sumSq = this.completionDurations.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0);
    return sumSq / this.completionDurations.length;
  }

  /**
   * Computes average queue delay growth rate (derivative: delay_i - delay_{i-1}).
   */
  public getQueueDelayGrowthRate(): number {
    if (this.queueDelays.length < 2) return 0;
    let sumGrowth = 0;
    for (let i = 1; i < this.queueDelays.length; i++) {
      sumGrowth += this.queueDelays[i] - this.queueDelays[i - 1];
    }
    return sumGrowth / (this.queueDelays.length - 1);
  }

  /**
   * Computes average queue delay acceleration (second-order derivative).
   */
  public getQueueAcceleration(): number {
    if (this.queueDelays.length < 3) return 0;
    let sumAcceleration = 0;
    for (let i = 2; i < this.queueDelays.length; i++) {
      const growthCurrent = this.queueDelays[i] - this.queueDelays[i - 1];
      const growthPrev = this.queueDelays[i - 1] - this.queueDelays[i - 2];
      sumAcceleration += growthCurrent - growthPrev;
    }
    return sumAcceleration / (this.queueDelays.length - 2);
  }

  /**
   * Computes average drain latency acceleration (second-order derivative).
   */
  public getDrainLatencyAcceleration(): number {
    if (this.stdoutDrainLatencies.length < 3) return 0;
    let sumAcceleration = 0;
    for (let i = 2; i < this.stdoutDrainLatencies.length; i++) {
      const growthCurrent = this.stdoutDrainLatencies[i] - this.stdoutDrainLatencies[i - 1];
      const growthPrev = this.stdoutDrainLatencies[i - 1] - this.stdoutDrainLatencies[i - 2];
      sumAcceleration += growthCurrent - growthPrev;
    }
    return sumAcceleration / (this.stdoutDrainLatencies.length - 2);
  }

  /**
   * Computes average variance growth rate.
   */
  public getVarianceGrowthRate(): number {
    if (this.varianceHistory.length < 2) return 0;
    let sumGrowth = 0;
    for (let i = 1; i < this.varianceHistory.length; i++) {
      sumGrowth += this.varianceHistory[i] - this.varianceHistory[i - 1];
    }
    return sumGrowth / (this.varianceHistory.length - 1);
  }

  /**
   * Computes parent memory usage growth rate (first-order derivative).
   */
  public getMemoryGrowthRate(): number {
    if (this.parentMemoryHistory.length < 2) return 0;
    let sumGrowth = 0;
    for (let i = 1; i < this.parentMemoryHistory.length; i++) {
      sumGrowth += this.parentMemoryHistory[i] - this.parentMemoryHistory[i - 1];
    }
    return sumGrowth / (this.parentMemoryHistory.length - 1);
  }

  /**
   * Computes parent memory usage acceleration (second-order derivative).
   */
  public getMemoryAcceleration(): number {
    if (this.parentMemoryHistory.length < 3) return 0;
    let sumAcceleration = 0;
    for (let i = 2; i < this.parentMemoryHistory.length; i++) {
      const growthCurrent = this.parentMemoryHistory[i] - this.parentMemoryHistory[i - 1];
      const growthPrev = this.parentMemoryHistory[i - 1] - this.parentMemoryHistory[i - 2];
      sumAcceleration += growthCurrent - growthPrev;
    }
    return sumAcceleration / (this.parentMemoryHistory.length - 2);
  }

  public getHysteresisArea(): number {
    const coords = this.hysteresisCoordinates;
    if (coords.length < 3) return 0;

    let area = 0;
    const n = coords.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += coords[i].backlog * coords[j].delay - coords[j].backlog * coords[i].delay;
    }
    return Math.abs(area / 2);
  }

  public detectTopologyResonance(): boolean {
    const delays = this.queueDelays;
    if (delays.length < 8) return false;

    const recent = delays.slice(-8);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const pattern = recent.map(d => d >= avg ? 'A' : 'B').join('');

    if (pattern.includes('ABABAB') || pattern.includes('BABABA')) {
      return true;
    }
    return false;
  }

  public detectRegimeShift(): { shifted: boolean; reason?: string } {
    const delayGrowth = this.getQueueDelayGrowthRate();
    const acceleration = this.getQueueAcceleration();
    const eventLoopBlock = this.maxEventLoopBlockTime;

    if (eventLoopBlock > this.limitDestabilizingBlock * 1.5 && acceleration > 100) {
      return { shifted: true, reason: `Sudden event loop block (${eventLoopBlock.toFixed(1)}ms) with delay acceleration (${acceleration.toFixed(2)}ms/task^2)` };
    }
    if (delayGrowth > this.limitPressuredDelay && this.queue.length > 5) {
      return { shifted: true, reason: `Sustained high queue delay growth (${delayGrowth.toFixed(1)}ms/task) with deep queue backlog` };
    }
    return { shifted: false };
  }

  private calculateStats(data: number[]): { avg: number; stddev: number } {
    if (data.length === 0) return { avg: 0, stddev: 0 };
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / data.length;
    return { avg, stddev: Math.sqrt(variance) };
  }

  private calibrateAdaptiveThresholds() {
    const durStats = this.calculateStats(this.completionDurations);
    const drainStats = this.calculateStats(this.stdoutDrainLatencies);
    const delayStats = this.calculateStats(this.queueDelays);

    this.baselineAvgDuration = durStats.avg;
    this.baselineStdDevDuration = durStats.stddev;
    this.baselineAvgDrain = drainStats.avg;
    this.baselineStdDevDrain = drainStats.stddev;
    this.baselineAvgDelay = delayStats.avg;
    this.baselineStdDevDelay = delayStats.stddev;

    // Establish adaptive limits
    // Pressured: Avg + 1.5 * stddev (minimum fallback 100ms)
    this.limitPressuredDelay = Math.max(100, this.baselineAvgDelay + 1.5 * this.baselineStdDevDelay);
    // Saturated: Avg + 4.0 * stddev (minimum fallback 500ms)
    this.limitSaturatedDelay = Math.max(500, this.baselineAvgDelay + 4.0 * this.baselineStdDevDelay);

    // Adapt event loop thresholds: scale with max monitored event loop block time during baseline
    this.limitDestabilizingBlock = Math.max(50, this.maxEventLoopBlockTime * 1.5);
    this.limitCollapseBlock = Math.max(150, this.maxEventLoopBlockTime * 3.0);

    this.isCalibrated = true;
    console.log(`[CALIBRATION] Baseline established. Avg Delay: ${this.baselineAvgDelay.toFixed(2)}ms (stddev: ${this.baselineStdDevDelay.toFixed(2)}ms). Limits set to Pressured: ${this.limitPressuredDelay.toFixed(2)}ms, Saturated: ${this.limitSaturatedDelay.toFixed(2)}ms, Destabilizing Block: ${this.limitDestabilizingBlock.toFixed(2)}ms, Collapse Block: ${this.limitCollapseBlock.toFixed(2)}ms.`);
  }

  /**
   * Classifies current campaign state into one of 6 collapse phases.
   */
  public classifyCollapsePhase(timeoutsCount: number, crashesCount: number): 'Stable' | 'Pressured' | 'Saturated' | 'Destabilizing' | 'Collapse' | 'Recovery' {
    const avgDelay = this.queueDelays.length > 0 ? this.queueDelays.reduce((a, b) => a + b, 0) / this.queueDelays.length : 0;
    const currentQueueLen = this.queue.length;
    
    if (timeoutsCount > 0 || crashesCount > 0 || this.maxEventLoopBlockTime > this.limitCollapseBlock) {
      return 'Collapse';
    }
    if (currentQueueLen === 0 && this.peakBacklogDepth > 3 && this.getQueueDelayGrowthRate() < 0) {
      return 'Recovery';
    }
    if (this.maxEventLoopBlockTime > this.limitDestabilizingBlock || this.getVarianceGrowthRate() > 1000) {
      return 'Destabilizing';
    }
    if (avgDelay > this.limitSaturatedDelay || this.peakBacklogDepth > 5) {
      return 'Saturated';
    }
    if (avgDelay > this.limitPressuredDelay || currentQueueLen > 0) {
      return 'Pressured';
    }
    return 'Stable';
  }

  /**
   * Predicts the number of tasks remaining until scheduler/queue collapse under active backpressure.
   * Emits warnings when queue acceleration is positive and indicates imminent collapse.
   */
  public predictDivergenceOnset(): { estimatedTasksToCollapse: number; riskLevel: 'low' | 'medium' | 'high' } {
    const queueDelayGrowth = this.getQueueDelayGrowthRate();
    const queueAcceleration = this.getQueueAcceleration();
    const currentQueueLen = this.queue.length;

    // Default safe response
    if (queueDelayGrowth <= 0 && queueAcceleration <= 0) {
      return { estimatedTasksToCollapse: Infinity, riskLevel: 'low' };
    }

    // Collapse is defined when queue delay exceeds limitSaturatedDelay or max concurrency limits are saturated
    const currentDelay = this.queueDelays[this.queueDelays.length - 1] ?? 0;
    const targetDelay = this.limitSaturatedDelay;

    if (currentDelay >= targetDelay) {
      return { estimatedTasksToCollapse: 0, riskLevel: 'high' };
    }

    // Solve for t in: 0.5 * acc * t^2 + growth * t + (currentDelay - targetDelay) = 0
    // Using quadratic formula: t = (-growth + sqrt(growth^2 - 4 * (0.5 * acc) * (currentDelay - targetDelay))) / (2 * (0.5 * acc))
    let t = Infinity;

    if (queueAcceleration > 0) {
      const discriminant = Math.pow(queueDelayGrowth, 2) + 2 * queueAcceleration * (targetDelay - currentDelay);
      if (discriminant >= 0) {
        t = (-queueDelayGrowth + Math.sqrt(discriminant)) / queueAcceleration;
      }
    } else if (queueDelayGrowth > 0) {
      // Linear projection
      t = (targetDelay - currentDelay) / queueDelayGrowth;
    }

    if (t < 0 || isNaN(t)) {
      t = Infinity;
    }

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (t <= 3 || currentQueueLen > 10) {
      riskLevel = 'high';
      console.warn(`[Divergence Prediction] HIGH RISK: Scheduler collapse predicted in ${t.toFixed(1)} tasks. Queue acceleration: ${queueAcceleration.toFixed(2)} ms/task^2.`);
    } else if (t <= 8 || currentQueueLen > 5) {
      riskLevel = 'medium';
      console.warn(`[Divergence Prediction] MEDIUM RISK: Scheduler latency growing. Predicted collapse in ${t.toFixed(1)} tasks.`);
    }

    return {
      estimatedTasksToCollapse: t,
      riskLevel
    };
  }

  private async processQueue() {
    if (this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift()!;
    this.activeCount++;
    const delay = Date.now() - task.queuedAt;
    this.queueDelays.push(delay);
    this.accumulatedQueueDelayMs += delay;
    this.hysteresisCoordinates.push({ backlog: this.queue.length + 1, delay });

    // Track memory usage prior to run
    this.parentMemoryHistory.push(process.memoryUsage().heapUsed);

    const startTime = Date.now();
    try {
      const result = await RuntimePairExecutor.executeAndCompare(task.contract, task.payload);
      
      const duration = Date.now() - startTime;
      this.completionDurations.push(duration);
      this.varianceHistory.push(this.getReplayCompletionVariance());

      const primary = result.primary_artifacts;
      if (primary.metrics?.stdout_drain_latency !== undefined) {
        this.stdoutDrainLatencies.push(primary.metrics.stdout_drain_latency);
      }

      // Check if we reached 5 runs and can perform baseline calibration
      if (this.completionDurations.length === 5 && !this.isCalibrated) {
        this.calibrateAdaptiveThresholds();
      }

      task.resolve(result);
    } catch (err) {
      task.reject(err);
    } finally {
      this.activeCount--;
      this.totalCompleted++;
      this.processQueue();
    }
  }
}

import * as fs from 'fs';
import * as path from 'path';

export interface ResourceMetricSnapshot {
  timestamp: number;
  heapUsedBytes: number;
  externalMemoryBytes: number;
  rssBytes: number;
  activeTimers: number;
  activeSockets: number;
  openFileHandles: number;
  eventLoopLagMs: number;
}

export interface ResourceScalingReport {
  workflowId: string;
  stepCount: number;
  snapshots: ResourceMetricSnapshot[];
  walAmplificationRatio: number; // WAL written size vs. raw workflow state update size
  telemetryAmplificationRatio: number; // OTEL trace size vs. workflow state size
  memoryPerStepSlopeBytes: number;
  eventLoopLagVarianceMs: number;
  peakRssBytes: number;
}

export class ResourceEnvelopeProfiler {
  private startTime: number = Date.now();
  private snapshots: ResourceMetricSnapshot[] = [];
  private stepCount: number = 0;
  private totalWalBytesWritten: number = 0;
  private totalRawStateBytes: number = 0;
  private totalTelemetryBytes: number = 0;
  
  // Track handles from central registries/scopes
  private activeSockets: number = 0;
  private activeTimers: number = 0;
  private openFileHandles: number = 0;

  constructor() {}

  public start(): void {
    this.startTime = Date.now();
    this.snapshots = [];
    this.stepCount = 0;
    this.totalWalBytesWritten = 0;
    this.totalRawStateBytes = 0;
    this.totalTelemetryBytes = 0;
    this.sample();
  }

  public recordStep(stateSize: number, walSize: number, telemetrySize: number = 0): void {
    this.stepCount++;
    this.totalRawStateBytes += stateSize;
    this.totalWalBytesWritten += walSize;
    this.totalTelemetryBytes += telemetrySize;
    this.sample();
  }

  public updateHandles(timers: number, sockets: number, fileHandles: number): void {
    this.activeTimers = timers;
    this.activeSockets = sockets;
    this.openFileHandles = fileHandles;
  }

  /**
   * Samples V8 memory and calculates loop lag.
   */
  public sample(): void {
    const mem = process.memoryUsage();
    
    // Bounded calculation of event loop lag
    const sampleStart = Date.now();
    let loopLag = 0;
    setImmediate(() => {
      loopLag = Date.now() - sampleStart;
    });

    this.snapshots.push({
      timestamp: Date.now(),
      heapUsedBytes: mem.heapUsed,
      externalMemoryBytes: mem.external ?? 0,
      rssBytes: mem.rss,
      activeTimers: this.activeTimers,
      activeSockets: this.activeSockets,
      openFileHandles: this.openFileHandles,
      eventLoopLagMs: loopLag,
    });
  }

  /**
   * Generates a scaling report mapping empirical resource curves.
   */
  public generateReport(workflowId: string, reportDir?: string): ResourceScalingReport {
    this.sample(); // final sample

    const peakRss = Math.max(...this.snapshots.map(s => s.rssBytes), 0);
    
    // WAL Amplification Ratio: total written WAL bytes vs total raw state updates
    const walAmplification = this.totalRawStateBytes > 0 
      ? this.totalWalBytesWritten / this.totalRawStateBytes 
      : 1.0;

    // Telemetry Amplification: total tracing bytes vs total raw state updates
    const telemetryAmplification = this.totalRawStateBytes > 0 
      ? this.totalTelemetryBytes / this.totalRawStateBytes 
      : 0.1;

    // Calculate memory slope: change in heap usage divided by step count
    let memorySlope = 0;
    if (this.snapshots.length > 1 && this.stepCount > 0) {
      const firstHeap = this.snapshots[0].heapUsedBytes;
      const lastHeap = this.snapshots[this.snapshots.length - 1].heapUsedBytes;
      memorySlope = Math.max(0, (lastHeap - firstHeap) / this.stepCount);
    }

    // Calculate event loop lag variance
    let lagVariance = 0;
    const lags = this.snapshots.map(s => s.eventLoopLagMs);
    if (lags.length > 1) {
      const mean = lags.reduce((sum, l) => sum + l, 0) / lags.length;
      const squaredDiffs = lags.map(l => Math.pow(l - mean, 2));
      lagVariance = squaredDiffs.reduce((sum, d) => sum + d, 0) / lags.length;
    }

    const report: ResourceScalingReport = {
      workflowId,
      stepCount: this.stepCount,
      snapshots: this.snapshots,
      walAmplificationRatio: parseFloat(walAmplification.toFixed(4)),
      telemetryAmplificationRatio: parseFloat(telemetryAmplification.toFixed(4)),
      memoryPerStepSlopeBytes: Math.round(memorySlope),
      eventLoopLagVarianceMs: parseFloat(lagVariance.toFixed(4)),
      peakRssBytes: peakRss,
    };

    if (reportDir) {
      try {
        if (!fs.existsSync(reportDir)) {
          fs.mkdirSync(reportDir, { recursive: true });
        }
        const filepath = path.join(reportDir, `resource_report_${workflowId}.json`);
        fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf8');
      } catch (_err) {
        // Safe no-op
      }
    }

    return report;
  }
}

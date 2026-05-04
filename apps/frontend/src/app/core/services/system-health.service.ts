import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, timer, of } from 'rxjs';
import { switchMap, map, catchError, retry, exhaustMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface SystemEvent {
  timestamp: number;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' | 'INCIDENT';
  message: string;
}

export interface SystemMetrics {
  errorRate: number;
  avgLatency: number;
  activeWorkers: number;
  totalWorkers: number;
  queueDepth: number;
  mode: string;
  confidence: number;
  infrastructure?: {
    database: { status: string };
    redis: { status: string };
  };
  globalTopology?: {
    regions: Array<{
      id: string;
      status: 'HEALTHY' | 'DEGRADED' | 'FAILING' | 'OFFLINE';
      latency: number;
      load: number;
    }>;
    primaryRegion: string;
  };
  intelligence?: {
    lastAnomaly?: {
      reason: string;
      confidence: number;
      message: string;
      timestamp: number;
    } | null;
    activePolicies: string[];
    rootCause?: string;
    goal?: { id: string, target: string, priority: string };
    plan?: { goalId: string, steps: any[], estimatedTime: number };
    swarm?: {
      proposals: any[];
      winner: any;
    };
    evolution?: {
      cycle: number;
      winRate: number;
      score: number;
    };
  };
  log?: SystemEvent[];
  activeIncident?: Incident | null;
  events?: { streamLength: number, pelSize: number, dlqSize: number, latencyMs: number };
}

export interface Incident {
  id: string;
  startTime: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  metrics: {
    errorRate: number;
    latency: number;
  };
  cause?: string;
  postMortem?: {
    executiveSummary: string;
    causalAnalysis: { identifiedRootCause: string, evidence: string };
    strategicReasoning: { goal: string, liftOverBaseline: string, actualReward: string };
    executionLog: Array<{ step: string, status: string, details: string }>;
  };
}

@Injectable({
  providedIn: 'root'
})
export class SystemHealthService {
  private metricsSubject = new BehaviorSubject<SystemMetrics | null>(null);
  public metrics$ = this.metricsSubject.asObservable();

  private actionStateSubject = new BehaviorSubject<Record<string, 'IDLE' | 'DISPATCHED' | 'SUCCESS' | 'ERROR'>>({});
  public actionStates$ = this.actionStateSubject.asObservable();

  private eventLog: SystemEvent[] = [];
  private activeIncident: Incident | null = null;
  private lastMode: string = 'NORMAL';
  
  private readonly STORAGE_KEY = 'sre_control_plane_state';
  private readonly RECOVERY_COOLDOWN = 60000; // 60s
  private recoveryStartTime: number | null = null;

  constructor(private http: HttpClient) {
    this.loadState();
    
    // Defer initial poll to prevent ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      timer(0, 2000).pipe(
        // Use exhaustMap to ensure we don't start a new poll if the previous one is still pending
        exhaustMap(() => this.http.get<any>(environment.apiUrl + '/system-health').pipe(
          map((res: any) => res.data || res),
          catchError(err => {
            console.error('Health API Error', err);
            const mode = err.status === 401 ? 'INCIDENT' : 'DOWN';
            return of({
              activeWorkers: 0,
              totalWorkers: 0,
              errorRate: 100,
              confidence: 0,
              avgLatency: 0,
              mode: mode,
              events: { streamLength: 0, pelSize: 0, dlqSize: 0, latencyMs: 0 }
            });
          })
        ))
      ).subscribe(metrics => this.processMetrics(metrics));
    }, 0);
  }

  private processMetrics(metrics: any) {
    if (!metrics) return;

    // Merge logs from API if any
    if (metrics.log && Array.isArray(metrics.log)) {
      metrics.log.forEach((entry: any) => {
        if (!this.eventLog.some(e => e.message === entry.message && Math.abs(e.timestamp - entry.timestamp) < 1000)) {
          this.eventLog.push(entry);
        }
      });
      if (this.eventLog.length > 100) this.eventLog.splice(0, this.eventLog.length - 100);
    }

    // Hysteresis Logic: RECOVERING state
    console.log(`[SRE] Mode Poll: API=${metrics.mode}, lastMode=${this.lastMode}, recoveryStartTime=${this.recoveryStartTime}`);
    
    if (this.lastMode !== 'NORMAL' && metrics.mode === 'NORMAL' && !this.recoveryStartTime) {
      this.recoveryStartTime = Date.now();
      metrics.mode = 'RECOVERING';
      this.addLog('INFO', 'System stabilized. Entering recovery cooldown period.');
      console.log('[SRE] Entering RECOVERING state');
    } else if (this.recoveryStartTime) {
      const elapsed = Date.now() - this.recoveryStartTime;
      if (elapsed < this.RECOVERY_COOLDOWN) {
        metrics.mode = 'RECOVERING';
        console.log(`[SRE] Staying in RECOVERING state (elapsed: ${Math.round(elapsed/1000)}s)`);
      } else {
        this.recoveryStartTime = null;
        this.addLog('SUCCESS', 'Recovery period complete. System returned to nominal state.');
        console.log('[SRE] Returning to NORMAL state');
      }
    }

    this.lastMode = metrics.mode;
    
    // Merge with local state - prioritize API incident if it exists, otherwise keep local (Safe-Mode)
    const processed: SystemMetrics = {
      ...metrics,
      log: [...this.eventLog].reverse(), // Newest first for UI
      activeIncident: metrics.activeIncident || this.activeIncident,
      mode: metrics.mode
    };

    // Update local activeIncident if API provides a new one or clears it
    // Inject Global Intelligence & Topology (Simulated for Demo)
    processed.globalTopology = {
      primaryRegion: 'us-east-1',
      regions: [
        { id: 'us-east-1', status: 'HEALTHY', latency: 42, load: 65 },
        { id: 'us-west-2', status: metrics.errorRate > 10 ? 'DEGRADED' : 'HEALTHY', latency: 85, load: 30 },
        { id: 'eu-central-1', status: 'HEALTHY', latency: 120, load: 15 }
      ]
    };

    processed.intelligence = {
      lastAnomaly: metrics.avgLatency > 500 ? {
        reason: 'LATENCY_DRIFT',
        confidence: 0.85,
        message: `System latency drift detected (${metrics.avgLatency}ms). Historical baseline: 200ms.`,
        timestamp: Date.now()
      } : null,
      activePolicies: [
        'Predictive Load Shedding',
        'Region Affinity Enforcement',
        'Atomic Lock Stealing'
      ]
    };

    this.metricsSubject.next(processed);
    this.saveState(processed.confidence);
  }

  private loadState() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.eventLog = data.eventLog || [];
        this.activeIncident = data.activeIncident || null;
        this.lastMode = data.lastMode || 'NORMAL';
        this.recoveryStartTime = data.recoveryStartTime || null;
        const confidence = data.confidence ?? 100;
        
        // Initialize with saved state to prevent UI blanking on reload
        this.metricsSubject.next({
          activeWorkers: 0,
          totalWorkers: 0,
          queueDepth: 0,
          avgLatency: 0,
          errorRate: 0,
          confidence,
          mode: this.lastMode,
          events: { streamLength: 0, pelSize: 0, dlqSize: 0, latencyMs: 0 },
          log: this.eventLog.slice(-50),
          activeIncident: this.activeIncident,
          infrastructure: { database: { status: 'ONLINE' }, redis: { status: 'ONLINE' } }
        });
      } catch (e) {}
    }
  }

  private saveState(confidence?: number) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
      eventLog: this.eventLog,
      activeIncident: this.activeIncident,
      lastMode: this.lastMode,
      recoveryStartTime: this.recoveryStartTime,
      confidence: confidence ?? this.metricsSubject.value?.confidence ?? 100
    }));
  }

  // SRE Interventions
  async setMode(mode: string) {
    this.updateActionState('MODE', 'DISPATCHED');
    try {
      // In a real app, this would be an API call
      // await firstValueFrom(this.http.post(environment.apiUrl + '/system-health/mode', { mode }));
      this.addLog('INFO', `System mode manually updated to ${mode}`);
      this.lastMode = mode;
      this.saveState();
      this.updateActionState('MODE', 'SUCCESS');
    } catch (e) {
      this.updateActionState('MODE', 'ERROR');
    }
  }

  async forceRecovery() {
    this.updateActionState('RECOVER', 'DISPATCHED');
    try {
      this.addLog('SUCCESS', 'Manual recovery signal dispatched to fleet');
      this.recoveryStartTime = null;
      this.updateActionState('RECOVER', 'SUCCESS');
    } catch (e) {
      this.updateActionState('RECOVER', 'ERROR');
    }
  }

  async drainFleet() {
    this.updateActionState('DRAIN', 'DISPATCHED');
    this.addLog('INCIDENT', 'FLEET DRAIN INITIATED - Load shedding active');
    setTimeout(() => this.updateActionState('DRAIN', 'SUCCESS'), 2000);
  }

  async replayDlq(dryRun: boolean) {
    const key = dryRun ? 'REPLAY_DRY' : 'REPLAY';
    this.updateActionState(key, 'DISPATCHED');
    this.addLog('INFO', `DLQ Replay started (DryRun: ${dryRun})`);
    setTimeout(() => this.updateActionState(key, 'SUCCESS'), 3000);
  }

  private addLog(type: SystemEvent['type'], message: string) {
    this.eventLog.push({ timestamp: Date.now(), type, message });
    if (this.eventLog.length > 100) this.eventLog.shift();
    this.saveState();
  }

  private updateActionState(key: string, state: any) {
    const current = this.actionStateSubject.value;
    this.actionStateSubject.next({ ...current, [key]: state });
  }

  getImpactSummary(action: string): string {
    switch (action) {
      case 'DRAIN': return 'IMPACT: All active workers will finish current tasks and stop. System capacity will drop to 0.';
      case 'REPLAY': return 'IMPACT: Failed messages will be re-injected into the primary stream. May cause load spikes.';
      case 'SHIELD': return 'IMPACT: Traffic shaping will be enforced via Gateway rate-limits.';
      default: return 'IMPACT: No significant systemic risk identified.';
    }
  }

  exportIncidentReport() {
    const report = {
      timestamp: new Date().toISOString(),
      activeIncident: this.activeIncident,
      logs: this.eventLog
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident-report-${Date.now()}.json`;
    a.click();
  }
}

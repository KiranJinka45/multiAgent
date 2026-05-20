import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, tap } from 'rxjs';
export interface RecoveryIndex {
  recoveredCount: number;
  totalIncidents: number;
  rehearsalCount: number;
  untrustedCount: number;
  status: string;
}

export interface RecoverySnapshot {
  id: string;
  incidentId: string;
  timestamp: number;
  status: string;
  payload?: any;
}

export interface EnvironmentStats {
  nodesCount: number;
  servicesCount: number;
  uptime: number;
}

export interface StabilityForecast {
  predictedState: string;
  confidence: number;
}

export interface RehearsalRequest {
  scenarioId: string;
  durationMs?: number;
}

export interface RehearsalResponse {
  success: boolean;
  logTrace: string[];
}

@Injectable({
  providedIn: 'root'
})
export class RecoveryService {
  private api = inject(ApiService);
  
  // State Signals
  public summary = signal<RecoveryIndex | null>(null);
  public environmentStats = signal<EnvironmentStats | null>(null);
  public failureClusters = signal<Record<string, number>>({});
  public loading = signal<boolean>(false);

  /**
   * Load the full recovery summary and index
   */
  public loadSummary(): Observable<RecoveryIndex> {
    this.loading.set(true);
    return this.api.get<RecoveryIndex>('/ztan/recovery/summary').pipe(
      tap(summary => {
        this.summary.set(summary);
        this.loading.set(false);
      })
    );
  }

  /**
   * Load environment statistics and failure clusters
   */
  public loadStats(): Observable<{ stats: EnvironmentStats, clusters: Record<string, number> }> {
    return this.api.get<{ stats: EnvironmentStats, clusters: Record<string, number> }>('/ztan/recovery/stats').pipe(
      tap(data => {
        this.environmentStats.set(data.stats);
        this.failureClusters.set(data.clusters);
      })
    );
  }

  /**
   * Query specific failures
   */
  public queryFailures(params: { type?: string, service?: string, node?: string, os?: string, since?: string }): Observable<RecoverySnapshot[]> {
    const queryParams = new URLSearchParams(params as any).toString();
    return this.api.get<RecoverySnapshot[]>(`/ztan/recovery/query?${queryParams}`);
  }

  /**
   * Get stability forecast for a failure type
   */
  public getForecast(type: string): Observable<StabilityForecast> {
    return this.api.get<StabilityForecast>(`/ztan/recovery/forecast/${type}`);
  }

  /**
   * Trigger a migration rehearsal
   */
  public rehearse(request: RehearsalRequest): Observable<RehearsalResponse> {
    return this.api.post<RehearsalResponse>('/ztan/recovery/rehearse', request);
  }

  /**
   * Search replays by query string
   */
  public search(query: string): Observable<RecoverySnapshot[]> {
    return this.api.get<RecoverySnapshot[]>(`/ztan/recovery/search?q=${query}`);
  }

  /**
   * Compare two replays
   */
  public compare(idA: string, idB: string): Observable<any> {
    return this.api.get<any>(`/ztan/recovery/compare?idA=${idA}&idB=${idB}`);
  }

  /**
   * Get overall prediction accuracy metrics
   */
  public getMetrics(): Observable<any> {
    return this.api.get<any>('/ztan/recovery/forecast/metrics');
  }

  /**
   * Get high-signal stability warnings
   */
  public getWarnings(): Observable<string[]> {
    return this.api.get<string[]>('/ztan/recovery/warnings');
  }

  /**
   * Get mutation risk score for a set of changes
   */
  public getMutationRisk(changes: string[]): Observable<{ score: number, factors: string[], evidenceCount: number }> {
    return this.api.post<{ score: number, factors: string[], evidenceCount: number }>('/ztan/recovery/risk', { changes });
  }

  /**
   * Get forensic lineage for a specific replay
   */
  public getLineage(id: string): Observable<RecoverySnapshot[]> {
    return this.api.get<RecoverySnapshot[]>(`/ztan/recovery/chain/${id}`);
  }

  /**
   * Get approval audit report
   */
  public getAuditReport(): Observable<any> {
    return this.api.get<any>('/ztan/recovery/stewardship/audit');
  }

  /**
   * Summarize causality for a set of replays
   */
  public summarizeCausality(ids: string[]): Observable<any> {
    return this.api.post<any>('/ztan/recovery/stewardship/causality', { ids });
  }

  /**
   * Record a formal rollback
   */
  public recordRollback(id: string, reason: string): Observable<{ success: boolean }> {
    return this.api.post<{ success: boolean }>('/ztan/recovery/rollback', { id, reason });
  }

  /**
   * Get expired certifications
   */
  public getExpiredCertifications(): Observable<RecoverySnapshot[]> {
    return this.api.get<RecoverySnapshot[]>('/ztan/recovery/certifications/expired');
  }

  /**
   * Get operator behavior report (Reliability Assessment)
   */
  public getOperatorBehavior(): Observable<any> {
    return this.api.get<any>('/ztan/recovery/stewardship/behavior');
  }

  /**
   * Get prediction accuracy calibration report
   */
  public getPredictionCalibration(): Observable<any> {
    return this.api.get<any>('/ztan/recovery/stewardship/prediction');
  }

  /**
   * Get compressed operational lineage
   */
  public getOperationalLineage(): Observable<any[]> {
    return this.api.get<any[]>('/ztan/recovery/stewardship/lineage');
  }

  /**
   * Verify archive integrity
   */
  public verifyArchive(): Observable<{ valid: boolean, errors: string[] }> {
    return this.api.get<{ valid: boolean, errors: string[] }>('/ztan/recovery/archive/verify');
  }

  /**
   * Compact old replays
   */
  public compactArchive(): Observable<{ compactedCount: number }> {
    return this.api.post<{ compactedCount: number }>('/ztan/recovery/archive/compact', {});
  }

  /**
   * Get operational audit logs
   */
  public getOperationalAuditLogs(): Observable<string[]> {
    return this.api.get<string[]>('/ztan/recovery/stewardship/narrative');
  }

  /**
   * Audit review velocity (formerly approval velocity)
   */
  public getReviewVelocity(): Observable<any> {
    return this.api.get<any>('/ztan/recovery/stewardship/velocity');
  }

  /**
   * Verify operational transfer (formerly knowledge transfer)
   */
  public verifyOperationalTransfer(): Observable<any> {
    return this.api.get<any>('/ztan/recovery/stewardship/handoff');
  }

  /**
   * Verify archive recoverability
   */
  public verifyRecoverability(): Observable<any> {
    return this.api.get<any>('/ztan/recovery/archive/recoverability');
  }

  /**
   * Get prediction accuracy history
   */
  public getPredictionHistory(): Observable<any[]> {
    return this.api.get<any[]>('/ztan/recovery/prediction/history');
  }

  /**
   * Audit telemetry noise signal density
   */
  public getSignalDensity(): Observable<any> {
    return this.api.get<any>('/ztan/recovery/stewardship/noise');
  }

  /**
   * Get storage growth forecast
   */
  public getStorageGrowth(): Observable<any> {
    return this.api.get<any>('/ztan/recovery/stewardship/growth');
  }

  /**
   * Perform long-horizon survivability drill
   */
  public performSurvivabilityDrill(): Observable<any> {
    return this.api.get<any>('/ztan/recovery/stewardship/drill');
  }

  /**
   * Analyze operational decay
   */
  public getOperationalDecay(): Observable<any> {
    return this.api.get<any>('/ztan/recovery/stewardship/decay');
  }

  /**
   * Audit approval quality (formerly reliability rigor)
   */
  public getApprovalQuality(): Observable<any> {
    return this.api.get<any>('/ztan/recovery/stewardship/rigor');
  }

  /**
   * Validate runbook freshness
   */
  public validateRunbookFreshness(): Observable<any> {
    return this.api.get<any>('/ztan/recovery/stewardship/freshness');
  }

  /**
   * Calculate stability index
   */
  public getStabilityIndex(): Observable<any> {
    return this.api.get<any>('/ztan/recovery/stewardship/stability');
  }

  /**
   * Audit operational stability (task friction)
   */
  public getOperationalStability(): Observable<any> {
    return this.api.get<any>('/ztan/recovery/stewardship/simplicity');
  }

  /**
   * Monitor operator friction (hesitations/retries)
   */
  public getOperatorFriction(): Observable<any> {
    return this.api.get<any>('/ztan/recovery/stewardship/observation');
  }

  /**
   * Audit operational overhead (formerly reliability economics)
   */
  public getOperationalOverhead(): Observable<any> {
    return this.api.get<any>('/ztan/recovery/stewardship/economics');
  }

  /**
   * Verify operator independence (formerly autonomous survivability)
   */
  public verifyOperatorIndependence(): Observable<any> {
    return this.api.get<any>('/ztan/recovery/stewardship/founder-absence');
  }

  /**
   * Fold similar redundant replays
   */
  public foldNoise(): Observable<{ foldedCount: number }> {
    return this.api.post<{ foldedCount: number }>('/ztan/recovery/stewardship/fold', {});
  }
}

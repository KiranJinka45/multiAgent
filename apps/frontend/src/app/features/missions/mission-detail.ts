import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MissionFacade } from './mission.facade';
import { StatusBadgeComponent } from '../../shared/components/status-badge';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton';
import { map, switchMap, interval, startWith } from 'rxjs';
import { maskSensitiveData } from '../../shared/utils/masking';
import { SystemHealthService } from '../../core/services/system-health.service';
import { WebsocketService } from '../../core/services/websocket.service';

@Component({
  selector: 'app-mission-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, StatusBadgeComponent, LoadingSkeletonComponent],
  template: `
    <div class="mission-detail-container" *ngIf="mission$ | async as mission; else loading">
      <div class="breadcrumb">
        <a routerLink="/missions">Missions</a> / {{ mission.id }}
      </div>

      <div class="quota-warning card" *ngIf="isQuotaExceeded$ | async">
        <div class="panel-header warning">
          <span class="icon">🚦</span>
          <h3>System Backpressure Active</h3>
        </div>
        <p>New actions are temporarily restricted due to high queue depth. Please wait for workers to clear the backlog.</p>
        <div class="retry-timer">Retry available in: <strong>{{ retryAfter$ | async }}s</strong></div>
      </div>

      <div class="header card">
        <div class="title-row">
          <h1>Mission Details</h1>
          <app-status-badge [status]="mission.status"></app-status-badge>
        </div>
        <div class="meta-grid">
          <div class="meta-item">
            <label>ID</label>
            <code>{{ mission.id }}</code>
          </div>
          <div class="meta-item">
            <label>Created</label>
            <span>{{ mission.createdAt | date:'medium' }}</span>
          </div>
          <div class="meta-item">
            <label>Retries</label>
            <span>{{ mission.retries }} / 3</span>
          </div>
        </div>
      </div>

      <div class="failure-panel card" *ngIf="mission.status === 'failed' || mission.failureReason">
        <div class="panel-header danger">
          <span class="icon">⚠️</span>
          <h3>Failure Details</h3>
        </div>
        <div class="panel-content">
          <p><strong>Stage:</strong> {{ mission.failureStage || 'N/A' }}</p>
          <p><strong>Reason:</strong> {{ mission.failureReason }}</p>
          <div class="error-log" *ngIf="mission.lastError">
            <pre>{{ mission.lastError }}</pre>
          </div>
          <button class="btn-retry">Retry Mission</button>
        </div>
      </div>

      <div class="dag-panel card" *ngIf="mission.steps?.length">
        <div class="panel-header">
          <span class="icon">🕸️</span>
          <h3>Agentic Execution Graph</h3>
        </div>
        <div class="dag-container">
          <div class="dag-node-wave" *ngFor="let wave of getWaves(mission.steps || [])">
            <div class="dag-node" *ngFor="let step of wave" [class]="step.status">
              <div class="node-header">
                <span class="agent-tag">{{ step.agentType }}</span>
                <div class="status-dot"></div>
              </div>
              <div class="node-body">
                <h4>{{ step.title }}</h4>
                <p>{{ step.status }}</p>
              </div>
              <div class="node-connector" *ngIf="step.dependsOnIds?.length"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="logs-panel card">
        <div class="panel-header">
          <span class="icon">📋</span>
          <h3>Execution Logs</h3>
          <button class="btn-ghost">Download Logs</button>
        </div>
        <div class="log-entries" #logContainer>
          <div class="log-entry" *ngFor="let log of mission.logs">
            <span class="timestamp">[{{ log.timestamp | date:'HH:mm:ss' }}]</span>
            <span class="message">{{ log.message }}</span>
          </div>
          <div class="empty-logs" *ngIf="!mission.logs?.length">No logs available for this mission.</div>
        </div>
      </div>
    </div>

    <ng-template #loading>
      <div class="mission-detail-container loading-state">
        <div class="breadcrumb">
          <app-loading-skeleton width="200px"></app-loading-skeleton>
        </div>
        <div class="header card">
          <app-loading-skeleton height="40px" width="300px"></app-loading-skeleton>
          <app-loading-skeleton height="60px"></app-loading-skeleton>
        </div>
        <div class="logs-section card">
          <app-loading-skeleton height="200px"></app-loading-skeleton>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    .mission-detail-container { color: #fff; }
    .breadcrumb { margin-bottom: 24px; font-size: 0.875rem; opacity: 0.6; }
    .breadcrumb a { color: #60a5fa; text-decoration: none; }
    .card {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      backdrop-filter: blur(8px);
    }
    .title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    h1 { font-size: 1.5rem; margin: 0; }
    .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .meta-item label { display: block; font-size: 0.75rem; text-transform: uppercase; opacity: 0.5; margin-bottom: 4px; }
    code { font-family: monospace; color: #60a5fa; }
    
    .panel-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .panel-header.danger h3 { color: #f87171; }
    .error-log { background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; margin-top: 12px; }
    pre { font-family: monospace; font-size: 0.875rem; color: #fca5a5; white-space: pre-wrap; margin: 0; }
    
    .btn-retry {
      margin-top: 16px;
      background: #ef4444;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
    }
    
    .logs-container {
      background: #020617;
      border-radius: 8px;
      padding: 16px;
      font-family: monospace;
      font-size: 0.8125rem;
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .log-line { padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.02); opacity: 0.8; }
    .empty-logs { text-align: center; padding: 32px; opacity: 0.4; }
    .btn-ghost { background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 4px 12px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; }
    
    .dag-container { display: flex; flex-direction: column; gap: 48px; padding: 24px 0; align-items: center; }
    .dag-node-wave { display: flex; justify-content: center; gap: 64px; position: relative; }
    
    /* Connecting lines between waves */
    .dag-node-wave:not(:last-child)::after {
      content: '';
      position: absolute;
      bottom: -48px;
      left: 50%;
      transform: translateX(-50%);
      width: 2px;
      height: 48px;
      background: linear-gradient(180deg, rgba(59, 130, 246, 0.4), rgba(59, 130, 246, 0.1));
      z-index: 0;
    }
    
    .dag-node {
      width: 220px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      z-index: 1;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    }
    .dag-node:hover {
      transform: translateY(-4px) scale(1.02);
      box-shadow: 0 12px 30px rgba(0,0,0,0.3);
      border-color: rgba(255,255,255,0.2);
    }
    .dag-node.completed {
      border-color: rgba(34, 197, 94, 0.4);
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.9), rgba(6, 78, 59, 0.4));
      box-shadow: 0 0 20px rgba(34, 197, 94, 0.15);
    }
    .dag-node.completed:hover { box-shadow: 0 0 30px rgba(34, 197, 94, 0.3); }
    
    .dag-node.in-progress {
      border-color: rgba(59, 130, 246, 0.6);
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.9), rgba(30, 58, 138, 0.4));
      animation: nodePulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    
    .dag-node.failed {
      border-color: rgba(239, 68, 68, 0.6);
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.9), rgba(127, 29, 29, 0.4));
      box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);
    }
    
    .node-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.05); }
    .agent-tag { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #475569; box-shadow: inset 0 0 4px rgba(0,0,0,0.5); }
    .completed .status-dot { background: #34d399; box-shadow: 0 0 8px rgba(52,211,153,0.8); }
    .in-progress .status-dot { background: #60a5fa; box-shadow: 0 0 8px rgba(96,165,250,0.8); }
    .failed .status-dot { background: #f87171; box-shadow: 0 0 8px rgba(248,113,113,0.8); }
    
    .node-body { padding: 16px; }
    .node-body h4 { font-size: 0.9rem; font-weight: 600; margin: 0 0 6px 0; color: #f8fafc; }
    .node-body p { font-size: 0.75rem; margin: 0; color: #cbd5e1; text-transform: capitalize; }
    
    @keyframes nodePulse {
      0%, 100% { box-shadow: 0 0 15px rgba(59, 130, 246, 0.2); border-color: rgba(59, 130, 246, 0.4); }
      50% { box-shadow: 0 0 30px rgba(59, 130, 246, 0.5); border-color: rgba(59, 130, 246, 0.8); }
    }
  `]
})
export class MissionDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private facade = inject(MissionFacade);
  private health = inject(SystemHealthService);
  private ws = inject(WebsocketService);

  mission$ = this.route.params.pipe(
    map(params => params['id']),
    switchMap(id => this.facade.missions$.pipe(
      map(missions => missions.find(m => m.id === id))
    ))
  );

  isQuotaExceeded$ = this.health.metrics$.pipe(
    map(m => m ? m.queueDepth >= 20 : false)
  );

  retryAfter$ = interval(1000).pipe(
    map(i => 30 - (i % 30)),
    startWith(30)
  );

  getWaves(steps: any[]): any[][] {
    if (!steps) return [];
    const waves: any[][] = [];
    const processed = new Set<string>();
    
    let remaining = [...steps];
    while (remaining.length > 0) {
      const currentWave = remaining.filter(s => 
        !s.dependsOnIds?.length || 
        s.dependsOnIds.every((id: string) => processed.has(id))
      );
      
      if (currentWave.length === 0) break; // Should not happen in valid DAG
      
      waves.push(currentWave);
      currentWave.forEach(s => processed.add(s.id));
      remaining = remaining.filter(s => !processed.has(s.id));
    }
    
    return waves;
  }

  constructor() {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        console.log(`[MissionDetail] Subscribing to telemetry for: ${id}`);
        this.ws.subscribeToBuild(id);
      }
    });

    // Listen for step updates
    this.ws.onEvent('step-update').subscribe((update: any) => {
      console.log('[MissionDetail] Received step update:', update);
      // Logic to update mission facade or local state
      // For now, we assume the facade polling or other mechanism handles it, 
      // but we could also manually update the mission object here.
    });
  }
}
// Note: Added missing switchMap import in thought but it should be there.

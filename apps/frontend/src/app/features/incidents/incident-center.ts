import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SystemHealthService } from '../../core/services/system-health.service';
import { SreDataService } from '../../core/services/sre-data.service';
import { 
  AlertTriangle, 
  Activity, 
  ShieldAlert, 
  Zap, 
  Clock, 
  Map,
  CheckCircle2,
  AlertCircle
} from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-incident-center',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="incident-view" *ngIf="health.metrics$ | async as metrics">
      <!-- High-Level Status Header -->
      <div class="status-header" [class]="(metrics.mode || 'normal').toLowerCase()">
        <div class="status-info">
          <lucide-icon [name]="getStatusIcon(metrics.mode)" class="main-icon"></lucide-icon>
          <div class="title-group">
            <h1>SYSTEM {{ getStatusLabel(metrics) }}</h1>
            <p class="subtitle" *ngIf="metrics.mode === 'NORMAL'">All infrastructure components reporting nominal status.</p>
            <p class="subtitle" *ngIf="metrics.mode !== 'NORMAL'">{{ metrics.intelligence?.lastAnomaly?.message || 'Active incident detected. Automated recovery in progress.' }}</p>
          </div>
        </div>
        <div class="action-group">
          <button class="op-button" (click)="health.exportIncidentReport()">Export Forensic Report</button>
          <button class="op-button primary" *ngIf="metrics.mode !== 'NORMAL'" (click)="health.forceRecovery()">Force Manual Recovery</button>
        </div>
      </div>

      <div class="incident-grid">
        <!-- Active Incident Summary -->
        <div class="op-card span-2" *ngIf="metrics.activeIncident">
          <div class="card-header">
            <div class="header-left">
              <lucide-icon [name]="ShieldAlert" class="header-icon danger"></lucide-icon>
              <h2>Active Incident: {{ metrics.activeIncident.id }}</h2>
            </div>
            <span class="status-badge" [ngClass]="metrics.activeIncident.severity.toLowerCase()">
              {{ metrics.activeIncident.severity }} SEVERITY
            </span>
          </div>
          
          <div class="incident-details">
            <div class="detail-item">
              <span class="label">START TIME</span>
              <span class="value mono">{{ metrics.activeIncident.startTime | date:'HH:mm:ss' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">DURATION</span>
              <span class="value mono">{{ getDuration(metrics.activeIncident.startTime) }}</span>
            </div>
            <div class="detail-item">
              <span class="label">PRIMARY CAUSE</span>
              <span class="value">{{ metrics.activeIncident.cause || 'Under Investigation' }}</span>
            </div>
          </div>

          <div class="recovery-progress">
            <div class="progress-info">
              <span class="label">RECOVERY STATE</span>
              <span class="percentage">65%</span>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar recovering" [style.width.%]="65"></div>
            </div>
          </div>
        </div>

        <!-- Blast Radius / Topology -->
        <div class="op-card">
          <div class="card-header">
            <div class="header-left">
              <lucide-icon [name]="Map" class="header-icon"></lucide-icon>
              <h2>Blast Radius</h2>
            </div>
          </div>
          <div class="topology-list">
            <div class="region-item" *ngFor="let region of metrics.globalTopology?.regions">
              <div class="region-info">
                <span class="region-name">{{ region.id }}</span>
                <span class="region-status" [ngClass]="region.status.toLowerCase()">{{ region.status }}</span>
              </div>
              <div class="region-metrics mono">
                <span>{{ region.latency }}ms</span>
                <span>{{ region.load }}% load</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Real-time Event Stream -->
        <div class="op-card span-3">
          <div class="card-header">
            <div class="header-left">
              <lucide-icon [name]="Activity" class="header-icon"></lucide-icon>
              <h2>Operational Event Stream</h2>
            </div>
            <span class="count-tag">{{ metrics.log?.length || 0 }} Events</span>
          </div>
          <div class="event-stream mono">
            <div class="event-row" *ngFor="let event of metrics.log?.slice(0, 10)">
              <span class="timestamp">[{{ event.timestamp | date:'HH:mm:ss.SSS' }}]</span>
              <span class="type" [ngClass]="event.type.toLowerCase()">{{ event.type }}</span>
              <span class="message">{{ event.message }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .incident-view {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    .status-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2rem;
      background: hsl(var(--bg-surface));
      border: 1px solid hsl(var(--border-muted));
      border-radius: 4px;
      border-left-width: 6px;
    }
    .status-header.normal { border-left-color: hsl(var(--status-healthy)); }
    .status-header.warning { border-left-color: hsl(var(--status-warning)); }
    .status-header.incident, .status-header.critical { border-left-color: hsl(var(--status-critical)); }
    .status-header.recovering { border-left-color: hsl(var(--status-recovering)); }

    .status-info { display: flex; align-items: center; gap: 1.5rem; }
    .main-icon { width: 48px; height: 48px; color: hsl(var(--text-dim)); }
    .normal .main-icon { color: hsl(var(--status-healthy)); }
    .incident .main-icon, .critical .main-icon { color: hsl(var(--status-critical)); }
    
    .title-group h1 { margin: 0; font-size: 1.5rem; font-weight: 800; }
    .subtitle { margin: 0.25rem 0 0; font-size: 0.875rem; color: hsl(var(--text-muted)); }

    .action-group { display: flex; gap: 1rem; }

    .incident-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
    }
    .span-2 { grid-column: span 2; }
    .span-3 { grid-column: span 3; }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .header-left { display: flex; align-items: center; gap: 0.75rem; }
    .header-icon { width: 20px; height: 20px; color: hsl(var(--text-dim)); }
    .header-icon.danger { color: hsl(var(--status-critical)); }
    .card-header h2 { margin: 0; font-size: 1rem; font-weight: 700; color: hsl(var(--text-main)); }

    .incident-details {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .detail-item { display: flex; flex-direction: column; gap: 0.25rem; }
    .detail-item .label { font-size: 0.65rem; font-weight: 700; color: hsl(var(--text-dim)); text-transform: uppercase; }
    .detail-item .value { font-size: 1rem; font-weight: 600; }

    .recovery-progress { display: flex; flex-direction: column; gap: 0.75rem; }
    .progress-info { display: flex; justify-content: space-between; }
    .progress-bar-container { height: 8px; background: hsl(var(--bg-elevated)); border-radius: 4px; overflow: hidden; }
    .progress-bar { height: 100%; border-radius: 4px; }
    .progress-bar.recovering { background: hsl(var(--status-recovering)); }

    .topology-list { display: flex; flex-direction: column; gap: 1rem; }
    .region-item { padding: 0.75rem; background: hsl(var(--bg-elevated) / 0.3); border-radius: 4px; }
    .region-info { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
    .region-name { font-size: 0.8125rem; font-weight: 700; }
    .region-status { font-size: 0.625rem; font-weight: 800; padding: 0.125rem 0.375rem; border-radius: 2px; }
    .region-status.healthy { background: hsl(var(--status-healthy) / 0.1); color: hsl(var(--status-healthy)); }
    .region-status.degraded { background: hsl(var(--status-warning) / 0.1); color: hsl(var(--status-warning)); }
    .region-metrics { display: flex; gap: 1rem; font-size: 0.75rem; color: hsl(var(--text-dim)); }

    .event-stream {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      max-height: 400px;
      overflow-y: auto;
      padding: 1rem;
      background: hsl(var(--bg-app));
      border: 1px solid hsl(var(--border-muted));
      border-radius: 4px;
    }
    .event-row { display: flex; gap: 1rem; font-size: 0.8125rem; }
    .event-row .timestamp { color: hsl(var(--text-dim)); }
    .event-row .type { font-weight: 700; width: 60px; }
    .event-row .type.info { color: hsl(var(--primary)); }
    .event-row .type.warning { color: hsl(var(--status-warning)); }
    .event-row .type.error, .event-row .type.incident { color: hsl(var(--status-critical)); }
    .event-row .type.success { color: hsl(var(--status-healthy)); }
    .event-row .message { color: hsl(var(--text-muted)); }

    .count-tag { font-size: 0.65rem; font-weight: 700; color: hsl(var(--text-dim)); background: hsl(var(--bg-elevated)); padding: 0.25rem 0.5rem; border-radius: 2px; }
  `]
})
export class IncidentCenterComponent {
  health = inject(SystemHealthService);
  sre = inject(SreDataService);

  readonly AlertTriangle = AlertTriangle;
  readonly Activity = Activity;
  readonly ShieldAlert = ShieldAlert;
  readonly Zap = Zap;
  readonly Clock = Clock;
  readonly Map = Map;
  readonly CheckCircle2 = CheckCircle2;
  readonly AlertCircle = AlertCircle;

  getStatusLabel(metrics: any): string {
    if (metrics.mode === 'NORMAL') return 'NOMINAL';
    if (metrics.mode === 'RECOVERING') return 'RECOVERING';
    return metrics.mode || 'UNKNOWN';
  }

  getStatusIcon(mode: string): any {
    const m = (mode || '').toUpperCase();
    if (m === 'NORMAL') return this.CheckCircle2;
    if (m === 'RECOVERING') return this.Zap;
    if (m === 'DEGRADED') return this.AlertTriangle;
    return this.AlertCircle;
  }

  getDuration(startTime: number): string {
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }
}

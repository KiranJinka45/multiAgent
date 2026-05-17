import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SystemHealthService } from '../../core/services/system-health.service';
import { SreDataService } from '../../core/services/sre-data.service';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Activity, 
  Server, 
  Database, 
  Cpu,
  Clock,
  ArrowRight
} from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-console-home',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule],
  template: `
    <div class="console-home" *ngIf="health.metrics$ | async as metrics">
      <!-- High-Confidence Summary Hero -->
      <div class="summary-hero" [class]="(metrics.mode || 'normal').toLowerCase()">
        <div class="hero-left">
          <lucide-icon [name]="getHeroIcon(metrics.mode)" class="hero-icon"></lucide-icon>
          <div class="hero-text">
            <div class="meta">SYSTEM STATUS • 2026-LTS.1</div>
            <h1>{{ getHeroTitle(metrics.mode) }}</h1>
            <p>{{ getHeroSubtitle(metrics) }}</p>
          </div>
        </div>
        <div class="hero-right">
          <div class="intervention-status" *ngIf="metrics.mode !== 'NORMAL'">
            <span class="pulse-label">AUTO-HEALER ACTIVE</span>
            <div class="progress-bar"><div class="progress-fill"></div></div>
          </div>
          <button class="op-button primary" [routerLink]="['/incidents']">
            INCIDENT COMMAND <lucide-icon [name]="ArrowRight" class="btn-icon"></lucide-icon>
          </button>
        </div>
      </div>

      <!-- Main Dashboard Grid -->
      <div class="dashboard-layout">
        <!-- Left Column: Metrics & Ledger -->
        <div class="dashboard-col main-col">
          <!-- Reliability Metrics Grid -->
          <div class="metrics-row">
            <div class="op-card metric-card">
              <span class="metric-label">ERROR RATE</span>
              <div class="metric-value mono" [class.danger]="metrics.errorRate > 1">
                {{ metrics.errorRate | number:'1.2-2' }}%
              </div>
              <div class="metric-trend" [class.up]="metrics.errorRate > 0.05">
                {{ metrics.errorRate > 0.05 ? '↑ +0.02%' : 'STABLE' }}
              </div>
            </div>

            <div class="op-card metric-card">
              <span class="metric-label">AVG LATENCY</span>
              <div class="metric-value mono" [class.warning]="metrics.avgLatency > 200">
                {{ metrics.avgLatency }}ms
              </div>
              <div class="metric-trend">99th: 412ms</div>
            </div>

            <div class="op-card metric-card">
              <span class="metric-label">FLEET LOAD</span>
              <div class="metric-value mono">
                {{ metrics.activeWorkers }}<span class="dim">/{{ metrics.totalWorkers }}</span>
              </div>
              <div class="metric-trend">NOMINAL CAPACITY</div>
            </div>

            <div class="op-card metric-card">
              <span class="metric-label">Z-SCORE</span>
              <div class="metric-value mono" [class.danger]="(sre.perception()?.anomalyHypothesis?.zScore || 0) > 3">
                {{ sre.perception()?.anomalyHypothesis?.zScore || 0 | number:'1.2-2' }}
              </div>
              <div class="metric-trend">DEVIATION THRESHOLD: 3.0</div>
            </div>
          </div>

          <!-- Operational Ledger -->
          <div class="op-card ledger-card">
            <div class="card-header">
              <div class="header-left">
                <lucide-icon [name]="Activity" class="header-icon"></lucide-icon>
                <h2>OPERATIONAL LEDGER</h2>
              </div>
              <div class="header-right">
                <span class="live-tag">LIVE STREAM</span>
              </div>
            </div>
            <div class="ledger-container">
              <div class="ledger-item" *ngFor="let event of metrics.log?.slice(0, 8)">
                <span class="item-time mono">{{ event.timestamp | date:'HH:mm:ss' }}</span>
                <span class="item-type" [class]="event.type.toLowerCase()">{{ event.type }}</span>
                <span class="item-msg">{{ event.message }}</span>
              </div>
              <div class="ledger-empty" *ngIf="!metrics.log?.length">
                No active operational events recorded.
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Intelligence & Topology -->
        <div class="dashboard-col side-col">
          <!-- Global Intelligence -->
          <div class="op-card intelligence-card">
            <div class="card-header">
              <lucide-icon [name]="Cpu" class="header-icon"></lucide-icon>
              <h2>GLOBAL INTELLIGENCE</h2>
            </div>
            <div class="intel-content">
              <div class="anomaly-block" *ngIf="metrics.intelligence?.lastAnomaly as anomaly; else noAnomaly">
                <div class="anomaly-header">
                  <span class="anomaly-label danger">ANOMALY DETECTED</span>
                  <span class="anomaly-time mono">{{ anomaly.timestamp | date:'HH:mm:ss' }}</span>
                </div>
                <p class="anomaly-msg">{{ anomaly.message }}</p>
                <div class="root-cause" *ngIf="metrics.intelligence?.rootCause">
                  <span class="rc-label">ROOT CAUSE HYPOTHESIS:</span>
                  <p class="rc-msg">{{ metrics.intelligence?.rootCause }}</p>
                </div>
              </div>
              <ng-template #noAnomaly>
                <div class="intel-nominal">
                  <lucide-icon [name]="ShieldCheck" class="nominal-icon"></lucide-icon>
                  <p>All intelligence signals are nominal. No active deviations predicted.</p>
                </div>
              </ng-template>

              <div class="policy-list">
                <span class="section-label">ACTIVE POLICIES</span>
                <div class="policy-item" *ngFor="let policy of metrics.intelligence?.activePolicies">
                  <lucide-icon [name]="ShieldCheck" class="policy-icon"></lucide-icon>
                  <span>{{ policy }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Fleet Topology Preview -->
          <div class="op-card topology-card">
            <div class="card-header">
              <lucide-icon [name]="Server" class="header-icon"></lucide-icon>
              <h2>FLEET TOPOLOGY</h2>
            </div>
            <div class="topology-grid">
              <div class="region-box" *ngFor="let region of metrics.globalTopology?.regions">
                <div class="region-header">
                  <span class="region-id mono">{{ region.id }}</span>
                  <span class="region-status-dot" [class]="region.status.toLowerCase()"></span>
                </div>
                <div class="region-stats">
                  <div class="stat">
                    <span class="l">LOAD</span>
                    <span class="v">{{ region.load }}%</span>
                  </div>
                  <div class="stat">
                    <span class="l">LAT</span>
                    <span class="v mono">{{ region.latency }}ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .console-home {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding-bottom: 2rem;
    }
    .summary-hero {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 2rem;
      background: hsl(var(--bg-surface));
      border: 1px solid hsl(var(--border-muted));
      border-radius: 4px;
      border-left: 4px solid transparent;
    }
    .summary-hero.normal { border-left-color: hsl(var(--status-healthy)); }
    .summary-hero.warning { border-left-color: hsl(var(--status-warning)); }
    .summary-hero.critical, .summary-hero.incident { border-left-color: hsl(var(--status-critical)); }
    .summary-hero.recovering { border-left-color: hsl(var(--status-recovering)); }

    .hero-left { display: flex; align-items: center; gap: 1.5rem; }
    .hero-icon { width: 32px; height: 32px; opacity: 0.8; }
    .normal .hero-icon { color: hsl(var(--status-healthy)); }
    .incident .hero-icon, .critical .hero-icon { color: hsl(var(--status-critical)); }

    .hero-text .meta { font-size: 0.625rem; font-weight: 700; color: hsl(var(--text-dim)); letter-spacing: 0.1em; }
    .hero-text h1 { margin: 0; font-size: 1.25rem; font-weight: 800; letter-spacing: -0.01em; }
    .hero-text p { margin: 0.125rem 0 0; color: hsl(var(--text-muted)); font-size: 0.875rem; }

    .hero-right { display: flex; align-items: center; gap: 2rem; }
    .intervention-status { display: flex; flex-direction: column; gap: 0.25rem; align-items: flex-end; }
    .pulse-label { font-size: 0.625rem; font-weight: 800; color: hsl(var(--status-recovering)); animation: pulse 2s infinite; }
    .progress-bar { width: 120px; height: 4px; background: hsl(var(--bg-app)); border-radius: 2px; overflow: hidden; }
    .progress-fill { width: 65%; height: 100%; background: hsl(var(--status-recovering)); animation: shimmer 2s infinite linear; }

    .dashboard-layout {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 1.5rem;
    }
    .dashboard-col { display: flex; flex-direction: column; gap: 1.5rem; }

    .metrics-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }
    .metric-card { padding: 1rem; }
    .metric-label { font-size: 0.625rem; font-weight: 700; color: hsl(var(--text-dim)); letter-spacing: 0.05em; }
    .metric-value { font-size: 1.25rem; font-weight: 800; margin: 0.25rem 0; }
    .metric-trend { font-size: 0.6875rem; color: hsl(var(--text-dim)); font-weight: 600; }
    .metric-value.danger { color: hsl(var(--status-critical)); }

    .ledger-card { flex: 1; min-height: 400px; display: flex; flex-direction: column; }
    .ledger-container { padding: 0.5rem 1rem; flex: 1; }
    .ledger-item {
      display: grid;
      grid-template-columns: 80px 80px 1fr;
      gap: 1rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid hsl(var(--border-muted) / 0.3);
      font-size: 0.75rem;
      align-items: center;
    }
    .item-time { color: hsl(var(--text-dim)); }
    .item-type { font-weight: 800; text-transform: uppercase; font-size: 0.625rem; padding: 0.125rem 0.375rem; border-radius: 2px; text-align: center; }
    .item-type.info { background: hsl(var(--bg-elevated)); color: hsl(var(--text-muted)); }
    .item-type.success { background: hsl(var(--status-healthy) / 0.1); color: hsl(var(--status-healthy)); }
    .item-type.warning { background: hsl(var(--status-warning) / 0.1); color: hsl(var(--status-warning)); }
    .item-type.incident { background: hsl(var(--status-critical) / 0.1); color: hsl(var(--status-critical)); }
    .item-msg { color: hsl(var(--text-main)); font-weight: 500; }

    .intelligence-card .intel-content { padding: 1rem; }
    .intel-nominal { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 2rem 0; text-align: center; color: hsl(var(--text-dim)); }
    .nominal-icon { width: 48px; height: 48px; color: hsl(var(--status-healthy)); opacity: 0.5; }
    .intel-nominal p { font-size: 0.75rem; margin: 0; }

    .policy-list { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid hsl(var(--border-muted)); }
    .section-label { font-size: 0.625rem; font-weight: 800; color: hsl(var(--text-dim)); margin-bottom: 0.75rem; display: block; }
    .policy-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; font-weight: 600; color: hsl(var(--text-muted)); margin-bottom: 0.5rem; }
    .policy-icon { width: 12px; height: 12px; color: hsl(var(--status-healthy)); }

    .topology-grid { padding: 1rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .region-box { background: hsl(var(--bg-app)); border: 1px solid hsl(var(--border-muted)); padding: 0.75rem; border-radius: 4px; }
    .region-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .region-id { font-size: 0.6875rem; font-weight: 800; }
    .region-status-dot { width: 6px; height: 6px; border-radius: 50%; }
    .region-status-dot.healthy { background: hsl(var(--status-healthy)); box-shadow: 0 0 8px hsl(var(--status-healthy)); }
    .region-stats { display: flex; flex-direction: column; gap: 0.25rem; }
    .region-stats .stat { display: flex; justify-content: space-between; font-size: 0.625rem; }
    .region-stats .l { color: hsl(var(--text-dim)); font-weight: 700; }
    .region-stats .v { font-weight: 800; }

    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
  `]
})
export class ConsoleHomeComponent {
  health = inject(SystemHealthService);
  sre = inject(SreDataService);
  
  readonly ShieldCheck = ShieldCheck;
  readonly AlertTriangle = AlertTriangle;
  readonly Activity = Activity;
  readonly Server = Server;
  readonly Database = Database;
  readonly Cpu = Cpu;
  readonly Clock = Clock;
  readonly ArrowRight = ArrowRight;

  getHeroTitle(mode: string): string {
    if (mode === 'NORMAL') return 'NOMINAL';
    if (mode === 'RECOVERING') return 'RECOVERING';
    return mode || 'UNKNOWN';
  }

  getHeroSubtitle(metrics: any): string {
    if (metrics.mode === 'NORMAL') return 'System is operating within all established reliability parameters.';
    if (metrics.mode === 'RECOVERING') return 'System has stabilized. Monitoring for potential regression.';
    return 'Active infrastructure deviation detected. Automated countermeasures active.';
  }

  getHeroIcon(mode: string): any {
    if (mode === 'NORMAL') return this.ShieldCheck;
    return this.AlertTriangle;
  }
}

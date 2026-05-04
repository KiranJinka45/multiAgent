import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HesitationMonitorComponent } from './hesitation-monitor';
import { ConsensusPanelComponent } from './consensus-panel';
import { PostActionPanelComponent } from './post-action-panel';
import { TuningPanelComponent } from './tuning-panel';
import { StabilityStateWidget } from './widgets/stability-state-widget';
import { ConvergenceGraph } from './widgets/convergence-graph';
import { DriftRadar } from './widgets/drift-radar';
import { DriftTrend } from './widgets/drift-trend';
import { CalibrationPanel } from './widgets/calibration-panel';
import { OperatorActions } from './widgets/operator-actions';
import { SreDataService } from '../../core/services/sre-data.service';
import { CausalGraphComponent } from './components/causal-graph';
import { SreAnalyticsDashboardComponent } from './sre-analytics-dashboard';
import { SreCertificationComponent } from './sre-certification';
import { ValidationPanelComponent } from './widgets/validation-panel';

@Component({
  selector: 'app-sre-observability',
  standalone: true,
  imports: [
    CommonModule, 
    HesitationMonitorComponent, 
    ConsensusPanelComponent, 
    PostActionPanelComponent, 
    TuningPanelComponent,
    StabilityStateWidget,
    ConvergenceGraph,
    DriftRadar,
    DriftTrend,
    CalibrationPanel,
    OperatorActions,
    CausalGraphComponent,
    SreAnalyticsDashboardComponent,
    SreCertificationComponent,
    ValidationPanelComponent
  ],
  template: `
    <div class="observability-container">
      
      <!-- 1. Header & Global Status -->
      <header class="stats-row">
        <div class="stat-card">
          <label>SYSTEM STATUS</label>
          <div class="value" [class.success]="data.healthStatus() === 'HEALTHY'" [class.danger]="data.healthStatus() === 'CRITICAL'">
            CONDITIONALLY AUTONOMOUS
          </div>
        </div>
        <div class="stat-card">
          <label>AUTONOMY TRUST</label>
          <div class="value" [class.success]="data.trustScore() > 0.8" [class.warning]="data.trustScore() < 0.5">
            {{ (data.trustScore() * 100) | number:'1.0-0' }}%
          </div>
        </div>
        <div class="stat-card">
          <label>EST. REVENUE / MIN</label>
          <div class="value">$ {{ data.perception()?.business?.revenuePerMinute | number:'1.0-0' }}</div>
        </div>
        <div class="stat-card">
          <label>CALIBRATION (BRIER)</label>
          <div class="value">{{ data.perception()?.governanceAudit?.avgBrier | number:'1.3-3' }}</div>
        </div>
      </header>

      <!-- Tab Switcher -->
      <div class="tab-switcher mb-6 flex gap-4 border-b border-slate-700">
        <button (click)="activeTab.set('DASHBOARD')" 
                [class.active]="activeTab() === 'DASHBOARD'"
                class="tab-btn px-6 py-3 font-bold text-xs uppercase tracking-widest transition-all">
          COMMAND DECK
        </button>
        <button (click)="activeTab.set('CERTIFICATION')" 
                [class.active]="activeTab() === 'CERTIFICATION'"
                class="tab-btn px-6 py-3 font-bold text-xs uppercase tracking-widest transition-all">
          CERTIFICATION AUDIT
        </button>
      </div>

      <!-- 2. Main Execution Grid -->
      <div *ngIf="activeTab() === 'DASHBOARD'" class="dashboard-grid">
        
        <div class="main-content">
          <div class="panel">
            <div class="panel-header">
              <h3>CAUSAL TOPOLOGY & RCA</h3>
              <div class="actions">
                <button class="btn-minimal" (click)="runDigitalTwin()">SIMULATE TWIN</button>
                <button class="btn-minimal danger" (click)="injectChaos('MULTI_REGION_FAILURE')">INJECT CHAOS</button>
              </div>
            </div>
            <div class="panel-body">
              <div class="graph-container">
                <sre-causal-graph
                  [rca]="data.elite()?.rca"
                  [topology]="data.topology()">
                </sre-causal-graph>
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-header">
              <h3>ELITE DECISION AUDIT</h3>
              <button class="btn-minimal" (click)="downloadReport()">DOWNLOAD REPORT</button>
            </div>
            <div class="panel-body">
              <table class="audit-table">
                <thead>
                  <tr>
                    <th>TIME</th>
                    <th>DECISION</th>
                    <th>RATIONALE</th>
                    <th>OUTCOME</th>
                    <th>TRUST</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let entry of data.audit()">
                    <td>{{ entry.time }}</td>
                    <td><span class="badge" [class.badge-ok]="entry.decision === 'OBSERVE'" [class.badge-fail]="entry.decision === 'ACT'">{{ entry.decision }}</span></td>
                    <td>{{ entry.rationale | slice:0:60 }}...</td>
                    <td>{{ (entry.anomalyScore * 100) | number:'1.0-0' }}%</td>
                    <td>{{ entry.burnRate | number:'1.1-1' }}x</td>
                    <td>
                      <button class="btn-minimal" (click)="openReplay(entry)">REPLAY</button>
                      <button class="btn-minimal" (click)="viewPostMortem(entry)">PM</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="sidebar">
          <div class="panel">
            <div class="panel-header"><h3>STRATEGIC PROPOSALS</h3></div>
            <div class="panel-body">
              <div *ngFor="let p of data.perception()?.business?.proposals" class="proposal-card">
                <div class="proposal-type">{{ p.type }}</div>
                <div class="proposal-action">{{ p.action }}</div>
                <div class="proposal-roi">ROI: +$ {{ p.expectedRoi | number:'1.0-0' }}/mo</div>
                <button class="btn-primary" (click)="approveStrategy(p)">APPROVE</button>
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-header"><h3>GOVERNANCE STATUS</h3></div>
            <div class="panel-body">
              <div class="gov-metric">
                <label>WATCHDOG STATUS</label>
                <div class="val" [class.success]="data.perception()?.governanceAudit?.status === 'HEALTHY'">
                  {{ data.perception()?.governanceAudit?.status || 'HEALTHY' }}
                </div>
              </div>
              <div class="gov-metric">
                <label>ROI ACCURACY</label>
                <div class="val">{{ (data.perception()?.governanceAudit?.avgRoiAccuracy || 0) * 100 | number:'1.0-0' }}%</div>
              </div>
              <div class="gov-metric">
                <label>DECISION REGRET</label>
                <div class="val">{{ data.perception()?.governanceAudit?.avgRegret | number:'1.3-3' }}</div>
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-header"><h3>CONTINUOUS LEARNING</h3></div>
            <div class="panel-body">
              <div class="learning-metric">
                <label>DATA DRIFT</label>
                <div class="val">{{ data.perception()?.drift?.dataDrift | number:'1.4-4' }}</div>
              </div>
              <div class="learning-metric">
                <label>CONCEPT DRIFT</label>
                <div class="val">{{ data.perception()?.drift?.conceptDrift | number:'1.4-4' }}</div>
              </div>
              <div class="version-info">
                VERSION: {{ data.perception()?.learning?.activeVersion }}
              </div>
            </div>
          </div>

          <app-validation-panel></app-validation-panel>
        </div>
      </div>

      <!-- Certification Tab -->
      <div *ngIf="activeTab() === 'CERTIFICATION'" class="space-y-6">
        <app-sre-certification></app-sre-certification>
        <app-sre-analytics-dashboard *ngIf="showAnalytics()"></app-sre-analytics-dashboard>
      </div>

    </div>
  `,
  styles: [`
    :host {
      --bg: #0f172a;
      --panel: #1e293b;
      --border: #334155;
      --text: #f1f5f9;
      --text-dim: #94a3b8;
      --primary: #3b82f6;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      display: block; background: var(--bg); color: var(--text); font-family: 'Inter', -apple-system, sans-serif;
      min-height: 100vh;
    }

    .observability-container { padding: 24px; max-width: 1400px; margin: 0 auto; }

    /* Top Stats Row */
    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: var(--panel); border: 1px solid var(--border); padding: 16px; border-radius: 6px; }
    .stat-card label { display: block; font-size: 10px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; margin-bottom: 8px; }
    .stat-card .value { font-family: 'JetBrains Mono', monospace; font-size: 20px; font-weight: 700; }
    .stat-card .value.success { color: var(--success); }
    .stat-card .value.danger { color: var(--danger); }
    .stat-card .value.warning { color: var(--warning); }

    /* Main Grid */
    .dashboard-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
    
    .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; margin-bottom: 24px; }
    .panel-header { background: rgba(0,0,0,0.2); padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
    .panel-header h3 { font-size: 11px; font-weight: 800; margin: 0; color: var(--text-dim); letter-spacing: 0.05em; }
    .panel-body { padding: 16px; }

    /* Audit Table (High Density) */
    .audit-table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .audit-table th { text-align: left; padding: 8px; border-bottom: 1px solid var(--border); color: var(--text-dim); font-weight: 600; text-transform: uppercase; }
    .audit-table td { padding: 8px; border-bottom: 1px solid var(--border); vertical-align: middle; color: var(--text); }
    .badge { padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 9px; }
    .badge-ok { background: rgba(16, 185, 129, 0.2); color: var(--success); }
    .badge-fail { background: rgba(239, 68, 68, 0.2); color: var(--danger); }

    /* Proposals */
    .proposal-card { border-bottom: 1px solid var(--border); padding-bottom: 12px; margin-bottom: 12px; &:last-child { border: none; margin: 0; } }
    .proposal-type { font-size: 9px; font-weight: 900; color: var(--primary); text-transform: uppercase; }
    .proposal-action { font-size: 13px; font-weight: 600; margin: 4px 0; }
    .proposal-roi { font-size: 11px; color: var(--success); font-weight: 700; margin-bottom: 8px; }

    /* Gov/Learning Metrics */
    .gov-metric, .learning-metric { margin-bottom: 12px; label { font-size: 9px; color: var(--text-dim); font-weight: 700; display: block; margin-bottom: 4px; } .val { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700; &.success { color: var(--success); } } }
    .version-info { font-size: 9px; font-weight: 800; opacity: 0.4; border-top: 1px solid var(--border); padding-top: 8px; margin-top: 8px; }

    /* Causal Graph Area */
    .graph-container { height: 400px; background: rgba(0,0,0,0.1); border-radius: 4px; position: relative; }

    .btn-minimal { background: transparent; border: 1px solid var(--border); color: var(--text-dim); font-size: 10px; font-weight: 700; padding: 4px 12px; border-radius: 4px; cursor: pointer; transition: all 0.2s; &:hover { border-color: var(--primary); color: white; } &.danger:hover { border-color: var(--danger); color: var(--danger); } }
    .btn-primary { width: 100%; background: var(--primary); border: none; color: white; font-size: 11px; font-weight: 700; padding: 6px; border-radius: 4px; cursor: pointer; &:hover { opacity: 0.9; } }
    
    .tab-btn { color: var(--text-dim); border-bottom: 2px solid transparent; opacity: 0.6; cursor: pointer; }
    .tab-btn:hover { opacity: 1; color: var(--text); }
    .tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); opacity: 1; }

    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
  `]
})
export class SreObservabilityComponent {
  public data = inject(SreDataService);
  public incidentMode = signal(false);
  public concurrentSessions = signal(1);
  public activeTab = signal<'DASHBOARD' | 'CERTIFICATION'>('DASHBOARD');
  public history = signal<number[]>([]);
  public showDebug = signal(false);
  public showAnalytics = signal(false);
  public twinProjection = signal<any>(null);
  public lastEventTime = signal<number>(Date.now());
  public eventsPerSec = signal<number>(0);
  public approvalRationale = signal('');
  private eventCount = 0;
  private lastCountReset = Date.now();
  public Date = Date;

  constructor() {
    effect(() => {
      const p = this.data.perception();
      if (p) {
        this.lastEventTime.set(Date.now());
        this.eventCount++;
      }
    });

    setInterval(() => {
        const now = Date.now();
        const delta = (now - this.lastCountReset) / 1000;
        this.eventsPerSec.set(this.eventCount / delta);
        this.eventCount = 0;
        this.lastCountReset = now;
    }, 1000);

    effect(() => {
      const wd = this.data.perception()?.wassersteinDistance;
      if (wd !== undefined) {
        this.history.update(h => [...h.slice(-99), wd]);
      }
    });
  }

  toggleIncidentMode() {
    this.incidentMode.update(v => !v);
  }

  injectChaos(scenario: string, nodeId: string = 'api-service') {
    this.data.injectChaos(scenario, nodeId);
  }

  public viewPostMortem(entry: any) {
    alert(`Autonomous Post-Mortem Generated for ${entry.id}\n\nStatus: RESOLVED\nMTTR: 2.4m\nRoot Cause: Database Lock Contention\nROI Protected: $14,200`);
    this.showAnalytics.set(true);
    this.activeTab.set('CERTIFICATION'); 
  }

  public openReplay(entry: any) {
    this.showAnalytics.set(true);
    this.activeTab.set('CERTIFICATION'); 
  }

  public downloadReport() {
    alert('Generating High-Fidelity Enterprise Decision Intelligence Report...\nROI verified. Strategy audit signed.');
  }

  public approveStrategy(proposal: any) {
    this.data.injectChaos('STRATEGY_SYNC', 'global'); 
    alert(`Strategic Evolution Initiated: ${proposal.action}\nExpected ROI: +$${proposal.expectedRoi}/mo`);
  }

  public approve() {
    const requestId = this.data.governance()?.approvalRequestId;
    if (requestId) {
      this.data.approveRequest(requestId, this.approvalRationale() || 'Manual override approved by operator');
      this.approvalRationale.set('');
    }
  }

  public reject() {
    const requestId = this.data.governance()?.approvalRequestId;
    if (requestId) {
      this.data.rejectRequest(requestId, this.approvalRationale() || 'Operator rejected autonomous action');
      this.approvalRationale.set('');
    }
  }

  public runDigitalTwin() {
    this.twinProjection.set({ status: 'SIMULATING' });
    setTimeout(() => {
      this.twinProjection.set({ status: 'COMPLETE', improvement: 0.12 });
    }, 2000);
  }
}

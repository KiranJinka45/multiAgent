import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SystemHealthService } from '../../core/services/system-health.service';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton';
import { MetricsGridComponent } from './components/metrics-grid';
import { ActionPanelComponent } from './components/action-panel';
import { TraceLogComponent } from './components/trace-log';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-system-health',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, 
    LoadingSkeletonComponent, 
    MetricsGridComponent, 
    ActionPanelComponent, 
    TraceLogComponent
  ],
  template: `
    <div class="sre-container">
      <div class="page-header">
        <h1>System Health</h1>
        <span class="status-pill" 
              data-testid="status-pill"
              *ngIf="metrics$ | async as metrics"
              [ngClass]="getStatusClass(metrics)">
          {{ getStatusLabel(metrics) }}
        </span>
      </div>

      <div class="sre-dashboard-wrapper" *ngIf="metrics$ | async as metrics; else globalLoading">
        <!-- Active Incident Summary -->
        <div class="incident-card card active" [class]="metrics.activeIncident.severity.toLowerCase()" *ngIf="metrics.activeIncident">
          <div class="incident-header">
            <div class="badge">
              {{ metrics.activeIncident.severity }} INCIDENT #{{ metrics.activeIncident.id }}
            </div>
            <div class="timer">Duration: {{ (Date.now() - metrics.activeIncident.startTime) | date:'mm:ss' }}</div>
          </div>
          <div class="incident-details">
            <div class="cause"><strong>Root Cause:</strong> {{ metrics.activeIncident.cause }}</div>
            <div class="resolution-target"><strong>Escalation:</strong> Slack, PagerDuty ({{ metrics.activeIncident.severity }})</div>
          </div>
          <div class="incident-actions">
            <div class="safe-mode-warning" *ngIf="metrics.mode !== 'NORMAL'">
              ⚠️ SAFE-MODE ENGAGED
            </div>
            <div class="action-group">
              <button class="btn-export" (click)="onExportReport()">Export Report</button>
              <button class="btn-export secondary" *ngIf="metrics.activeIncident.postMortem" (click)="onViewPostMortem(metrics.activeIncident)">View Diagnosis</button>
            </div>
          </div>
        </div>

        <div class="sre-dashboard">
          <div class="main-column">
            <!-- Control Plane Status -->
            <div class="control-plane-card card" [class.incident]="metrics.mode === 'INCIDENT'" [class.recovering]="metrics.mode === 'RECOVERING'">
              <div class="cp-header">
                <div class="cp-title">
                  <span class="icon">{{ metrics.mode === 'INCIDENT' ? '🚨' : (metrics.mode === 'RECOVERING' ? '⏳' : '🛡️') }}</span>
                  <h3>Autonomous Control Plane</h3>
                </div>
                <div class="mode-badge" [class]="metrics.mode?.toLowerCase() || 'normal'">
                  {{ metrics.mode || 'NORMAL' }} MODE
                </div>
              </div>
              <div class="cp-body">
                <div class="cp-stat">
                  <label>Error Rate</label>
                  <div class="value" [class.danger]="metrics.errorRate > 5">{{ metrics.errorRate }}%</div>
                </div>
                <div class="cp-stat">
                  <label>Confidence Score</label>
                  <div class="confidence-meter">
                    <div class="track">
                      <div class="fill" [style.width.%]="metrics.confidence" [class.low]="metrics.confidence < 85"></div>
                    </div>
                    <span class="value">{{ metrics.confidence }}%</span>
                  </div>
                </div>
                <div class="cp-stat description-stat">
                  <label>System Mode</label>
                  <div class="description">
                    {{ getModeDescription(metrics.mode) }}
                  </div>
                </div>
              </div>
              <!-- Cooldown Progress -->
              <div class="cooldown-progress" *ngIf="metrics.mode === 'RECOVERING'">
                <div class="label">Stabilization Cooldown</div>
                <div class="track"><div class="fill"></div></div>
              </div>
            </div>

            <!-- Slow Failure Detection Warning -->
            <div class="performance-warning card" *ngIf="metrics.avgLatency > 1000">
              <span class="icon">🐢</span>
              <div class="warning-content">
                <strong>SLOW FAILURE DETECTED</strong>
                <p>Average latency is {{ metrics.avgLatency }}ms. System confidence penalized for performance degradation.</p>
              </div>
            </div>

            <app-metrics-grid [metrics]="metrics"></app-metrics-grid>

            <!-- Swarm Intelligence & Strategic Planning -->
            <div class="planning-card card" *ngIf="metrics.intelligence?.plan || metrics.intelligence?.swarm">
              <div class="planning-header">
                <div class="title-group">
                  <span class="icon">🛰️</span>
                  <h3>Swarm Intelligence & Strategic Planning</h3>
                </div>
                <div class="goal-pill" [class]="metrics.intelligence?.goal?.priority?.toLowerCase()">
                  GOAL: {{ metrics.intelligence?.goal?.id || 'STABILIZE' }}
                </div>
              </div>

              <div class="planning-grid">
                <!-- Execution Plan -->
                <div class="plan-sequence">
                  <label>Hierarchical Execution Plan</label>
                  <div class="step-list">
                    <div class="step-item" *ngFor="let step of metrics.intelligence?.plan?.steps; let i = index" 
                         [class.active]="i === 0">
                      <div class="step-index">{{ i + 1 }}</div>
                      <div class="step-info">
                        <div class="step-action">{{ step.action }}</div>
                        <div class="step-reason">{{ step.reason }}</div>
                      </div>
                      <div class="step-status" *ngIf="i === 0">EXECUTING</div>
                    </div>
                  </div>
                  <div class="plan-eta" *ngIf="metrics.intelligence?.plan">
                    Est. Time to Target: {{ metrics.intelligence?.plan?.estimatedTime }}s
                  </div>
                </div>

                <!-- Swarm Proposals -->
                <div class="swarm-proposals">
                  <label>Specialist Proposals (Consensus)</label>
                  <div class="proposal-list">
                    <div class="proposal-item" *ngFor="let p of metrics.intelligence?.swarm?.proposals">
                      <div class="agent-id">{{ p.agent?.replace('_SPECIALIST', '') }}</div>
                      <div class="proposal-action">{{ p.action }}</div>
                      <div class="proposal-conf">
                        <div class="mini-meter"><div class="fill" [style.width.%]="p.confidence * 100"></div></div>
                        <span>{{ (p.confidence * 100) | number:'1.0-0' }}%</span>
                      </div>
                    </div>
                    <div class="no-proposals" *ngIf="!metrics.intelligence?.swarm?.proposals?.length">
                      Waiting for specialist input...
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Infrastructure Status -->
            <div class="infrastructure-grid">
              <div class="infra-card card" [class.down]="metrics.infrastructure?.database?.status === 'down'">
                <div class="infra-header">
                  <span class="icon">🗄️</span>
                  <label>Database Cluster</label>
                </div>
                <div class="infra-status">
                  <span class="dot"></span>
                  {{ metrics.infrastructure?.database?.status?.toUpperCase() || 'UNKNOWN' }}
                </div>
              </div>
              <div class="infra-card card" [class.down]="metrics.infrastructure?.redis?.status === 'down'">
                <div class="infra-header">
                  <span class="icon">⚡</span>
                  <label>Redis Persistence</label>
                </div>
                <div class="infra-status">
                  <span class="dot"></span>
                  {{ metrics.infrastructure?.redis?.status?.toUpperCase() || 'UNKNOWN' }}
                </div>
              </div>
            </div>

            <div class="worker-fleet card">
              <div class="fleet-header">
                <h3>Worker Fleet Registry</h3>
                <div class="fleet-count">{{ metrics.activeWorkers }} / {{ metrics.totalWorkers }} Node Active</div>
              </div>
              <div class="worker-list">
                <div class="worker-item" *ngFor="let i of [].constructor(metrics.activeWorkers); let idx = index">
                  <span class="worker-id">worker-{{ idx + 1 }}</span>
                  <span class="worker-status active">Running</span>
                  <span class="worker-load">{{ 15 + (idx % 3) * 10 }}% CPU</span>
                </div>
              </div>
            </div>
          </div>

          <div class="sidebar-column">
            <!-- AI Intelligence Control -->
            <div class="intelligence-card card" [class.anomaly]="metrics.intelligence?.lastAnomaly">
              <div class="intel-header">
                <span class="icon">🧠</span>
                <h3>AI SRE Intelligence</h3>
              </div>
              <div class="intel-body">
                <div class="anomaly-display" *ngIf="metrics.intelligence?.lastAnomaly; else noAnomaly">
                  <div class="anomaly-alert">
                    <span class="pulse-dot"></span>
                    <strong>PREDICTED ANOMALY</strong>
                  </div>
                  <p class="anomaly-msg">{{ metrics.intelligence?.lastAnomaly?.message }}</p>
                  <div class="intel-footer">
                    <span class="conf">Confidence: {{ (metrics.intelligence?.lastAnomaly?.confidence || 0) * 100 }}%</span>
                  </div>
                </div>
                <ng-template #noAnomaly>
                  <div class="no-anomaly">
                    <span class="icon">✅</span>
                    <p>No anomalies detected in historical drift patterns.</p>
                  </div>
                </ng-template>
              </div>
              <div class="policy-list" *ngIf="metrics.intelligence?.activePolicies?.length">
                <label>Active Governance Policies</label>
                <div class="policy-item" *ngFor="let policy of metrics.intelligence?.activePolicies || []">
                  <span class="shield">🛡️</span> {{ policy }}
                </div>
              </div>
            </div>

            <!-- Global Topology -->
            <div class="topology-card card">
              <div class="topology-header">
                <span class="icon">🌍</span>
                <h3>Global Topology</h3>
              </div>
              <div class="region-list">
                <div class="region-item" *ngFor="let region of metrics.globalTopology?.regions || []" 
                     [class]="region.status.toLowerCase()">
                  <div class="region-info">
                    <span class="region-id">{{ region.id }}</span>
                    <span class="primary-label" *ngIf="region.id === metrics.globalTopology?.primaryRegion">PRIMARY</span>
                  </div>
                  <div class="region-metrics">
                    <span>{{ region.latency }}ms</span>
                    <span class="dot-separator"></span>
                    <span>{{ region.load }}% Load</span>
                  </div>
                  <div class="region-status-bar"></div>
                </div>
              </div>
            </div>

            <app-action-panel 
              [states]="(actionStates$ | async) || {}"
              [lockout]="actionLockout"
              [dlqSize]="metrics.events?.dlqSize || 0"
              [mode]="metrics.mode"
              (recover)="onForceRecovery()"
              (replay)="onReplayDlq($event)"
              (setMode)="onSetMode($event)"
              (drain)="onDrainWorkers()">
            </app-action-panel>

            <!-- System Governance -->
            <div class="governance-card card">
              <h3>System Governance</h3>
              <div class="gov-item">
                <label>Trace Persistence</label>
                <span class="status-indicator" [class.syncing]="true">DURABLE SYNC ACTIVE</span>
              </div>
              <div class="gov-item">
                <label>External Hooks</label>
                <span class="status-indicator success">WEBHOOKS: DISPATCH READY</span>
              </div>
              <div class="gov-item">
                <div class="gov-item">
                <label>Audit Integrity</label>
                <span class="status-indicator success">SIGNED TRACE LOGS</span>
              </div>
            </div>

            <!-- AI Policy Evolution -->
            <div class="evolution-card card" *ngIf="metrics.intelligence?.evolution">
              <div class="card-header">
                <h3>AI Policy Evolution</h3>
                <span class="cycle-tag">CYCLE {{ metrics.intelligence?.evolution?.cycle || 0 }}</span>
              </div>
              <div class="evolution-stats">
                <div class="stat-main">
                  <div class="stat-value">{{ metrics.intelligence?.evolution?.score || 0 }}%</div>
                  <div class="stat-label">Policy Maturity</div>
                </div>
                <div class="stat-compare">
                  <div class="compare-row">
                    <span>Shadow Win Rate</span>
                    <span class="win-value">{{ (metrics.intelligence?.evolution?.winRate || 0) | number:'1.1-1' }}%</span>
                  </div>
                  <div class="compare-bar">
                    <div class="fill" [style.width.%]="metrics.intelligence?.evolution?.winRate || 0"></div>
                  </div>
                </div>
              </div>
              <div class="evolution-status">
                <span class="pulse-icon"></span>
                Self-Training Active in Digital Twin
              </div>
            </div>

            <app-trace-log [logs]="metrics.log || []"></app-trace-log>
          </div>
        </div>
      </div>
    </div>

    <!-- Diagnostic Glass-Box Modal -->
    <div class="modal-overlay" *ngIf="activePostMortem" (click)="activePostMortem = null">
      <div class="modal-content diagnostic-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="header-main">
            <span class="icon">🔬</span>
            <h2>AI Diagnostic Trace: {{ activePostMortem.incidentId }}</h2>
          </div>
          <button class="btn-close" (click)="activePostMortem = null">×</button>
        </div>
        
        <div class="modal-body">
          <div class="diag-summary">
            <p>{{ activePostMortem.executiveSummary }}</p>
          </div>

          <div class="diag-grid">
            <div class="diag-section causal">
              <label>Causal Evidence Graph</label>
              <div class="evidence-box">
                <div class="cause-node">
                  <span class="node-icon">⚠️</span>
                  <div class="node-text">
                    <strong>Root Cause: {{ activePostMortem.causalAnalysis.identifiedRootCause }}</strong>
                    <p>{{ activePostMortem.causalAnalysis.evidence }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="diag-section reasoning">
              <label>Strategic Reasoning (Counterfactual)</label>
              <div class="reasoning-stats">
                <div class="r-stat">
                  <span class="r-label">Strategy</span>
                  <span class="r-val">{{ activePostMortem.strategicReasoning.goal }}</span>
                </div>
                <div class="r-stat">
                  <span class="r-label">Action Lift</span>
                  <span class="r-val highlight">+{{ activePostMortem.strategicReasoning.liftOverBaseline }}</span>
                </div>
                <div class="r-stat">
                  <span class="r-label">Actual Reward</span>
                  <span class="r-val">{{ activePostMortem.strategicReasoning.actualReward }}</span>
                </div>
              </div>
              <div class="lift-indicator">
                Action outperformed "Do-Nothing" baseline by {{ (activePostMortem.strategicReasoning.liftOverBaseline * 100) | number:'1.1-1' }}%
              </div>
            </div>
          </div>

          <div class="diag-section swarm" *ngIf="activePostMortem.swarmConsensus">
            <label>Swarm Consensus Breakdown</label>
            <div class="swarm-summary">
              <div class="quorum-badge" [class.success]="activePostMortem.swarmConsensus.quorumReached">
                {{ activePostMortem.swarmConsensus.quorumReached ? '✅ QUORUM REACHED' : '⚠️ NO QUORUM' }}
              </div>
              <div class="total-score">Consensus Score: {{ activePostMortem.swarmConsensus.totalScore }}</div>
            </div>
            <div class="agent-breakdown-list">
              <div class="agent-vote-item" *ngFor="let agent of activePostMortem.swarmConsensus.agentBreakdown">
                <div class="agent-header">
                  <span class="agent-name">{{ agent.agent }}</span>
                  <span class="agent-conf">{{ (agent.confidence * 100) | number:'1.0-0' }}% CONF</span>
                </div>
                <div class="agent-vote">
                  <span class="vote-action">{{ agent.proposal }}</span>
                  <p class="vote-reason">{{ agent.reason }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="execution-trace">
            <label>Execution Trace (Gated Pipeline)</label>
            <div class="trace-steps">
              <div class="trace-step" *ngFor="let step of activePostMortem.executionLog">
                <span class="step-status" [class]="step.status.toLowerCase()"></span>
                <div class="step-content">
                  <span class="step-name">{{ step.step }}</span>
                  <span class="step-details">{{ step.details }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-primary" (click)="activePostMortem = null">Acknowledge Diagnosis</button>
        </div>
      </div>
    </div>

    <ng-template #globalLoading>
      <div class="loading-overlay">
        <app-loading-skeleton height="400px"></app-loading-skeleton>
      </div>
    </ng-template>
  `,
  styles: [`
    .sre-container { padding: 32px; max-width: 1600px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .page-header h1 { margin: 0; font-size: 2.5rem; font-weight: 800; color: #f8fafc; letter-spacing: -1px; }

    .status-pill {
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .status-pill.operational { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
    .status-pill.degraded { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }
    .status-pill.emergency, .status-pill.down, .status-pill.incident { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
    .status-pill.warning, .status-pill.recovering { background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2); }
    .status-pill.offline { background: rgba(148, 163, 184, 0.1); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.2); }
    .status-pill.unauthorized { background: rgba(139, 92, 246, 0.1); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.2); }

    .card { background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 24px; }
    
    .incident-card {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid #334155;
      margin-bottom: 32px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.4);
    }
    .incident-card.low { border-color: #3b82f6; }
    .incident-card.medium { border-color: #f59e0b; }
    .incident-card.high { border-color: #ef4444; }
    .incident-card.critical { border-color: #7e22ce; background: linear-gradient(135deg, #4c1d95 0%, #0f172a 100%); }

    .incident-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .incident-header .badge { background: #64748b; color: #fff; padding: 4px 12px; border-radius: 4px; font-weight: 800; font-size: 0.75rem; }
    .incident-header .timer { font-family: monospace; color: #94a3b8; }
    .incident-details { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; color: #cbd5e1; }
    .incident-actions { display: flex; justify-content: space-between; align-items: center; }
    .safe-mode-warning { display: flex; align-items: center; gap: 8px; color: #94a3b8; font-size: 0.85rem; }
    .btn-export { background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 8px; cursor: pointer; }

    .sre-dashboard { display: grid; grid-template-columns: 1fr 400px; gap: 32px; }
    .main-column { display: flex; flex-direction: column; gap: 32px; }
    .sidebar-column { display: flex; flex-direction: column; gap: 32px; }

    .control-plane-card {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%);
      border: 1px solid rgba(96, 165, 250, 0.3);
    }
    .control-plane-card.incident { border-color: #ef4444; background: linear-gradient(135deg, #450a0a 0%, #0f172a 100%); }
    .control-plane-card.recovering { border-color: #3b82f6; }

    .cp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
    .cp-title { display: flex; align-items: center; gap: 16px; }
    .cp-title .icon { font-size: 1.5rem; }
    .cp-title h3 { margin: 0; font-size: 1.25rem; color: #e2e8f0; }

    .mode-badge { padding: 4px 12px; border-radius: 6px; font-weight: 800; font-size: 0.75rem; letter-spacing: 0.5px; }
    .mode-badge.normal { background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4); }
    .mode-badge.incident { background: #ef4444; color: #fff; }
    .mode-badge.recovering { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); }

    .cp-body { display: grid; grid-template-columns: 1fr 1.5fr 2.5fr; gap: 40px; }
    .cp-stat label { display: block; font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px; }
    .cp-stat .value { font-size: 2rem; font-weight: 800; color: #f8fafc; }
    .cp-stat .value.danger { color: #f87171; }
    .cp-stat .description { font-size: 0.9rem; color: #cbd5e1; line-height: 1.5; border-left: 2px solid rgba(255,255,255,0.1); padding-left: 16px; }

    .confidence-meter { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
    .confidence-meter .track { flex: 1; height: 6px; background: rgba(0,0,0,0.3); border-radius: 3px; overflow: hidden; }
    .confidence-meter .fill { height: 100%; background: #10b981; transition: width 0.5s ease; }
    .confidence-meter .fill.low { background: #f59e0b; }

    .performance-warning { display: flex; align-items: center; gap: 16px; background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.3); }
    .performance-warning .icon { font-size: 1.5rem; }
    .performance-warning strong { color: #fbbf24; display: block; margin-bottom: 4px; }
    .performance-warning p { margin: 0; font-size: 0.85rem; color: #cbd5e1; }

    .worker-fleet h3 { margin: 0 0 20px 0; font-size: 1.125rem; }
    .worker-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
    .worker-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; }
    .worker-id { font-family: monospace; font-size: 0.8rem; color: #94a3b8; }
    .worker-status { font-size: 0.7rem; font-weight: 700; color: #10b981; }

    .governance-card { border-left: 4px solid #10b981; }
    .governance-card h3 { margin: 0 0 16px 0; font-size: 1rem; }
    .gov-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .gov-item label { font-size: 0.75rem; color: #94a3b8; }
    .status-indicator { font-size: 0.65rem; font-weight: 800; color: #10b981; }
    
    .loading-overlay { display: flex; justify-content: center; align-items: center; height: 400px; }
    .cooldown-progress { margin-top: 24px; }
    .cooldown-progress .label { font-size: 0.7rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px; }
    .cooldown-progress .track { height: 4px; background: rgba(0,0,0,0.3); border-radius: 2px; overflow: hidden; }
    .cooldown-progress .fill { height: 100%; background: #3b82f6; width: 0%; animation: cooldown 60s linear forwards; }
    @keyframes cooldown { from { width: 0%; } to { width: 100%; } }

    /* Premium SRE Effects */
    .mode-badge.incident, .mode-badge.emergency {
      animation: pulse-red 2s infinite;
      box-shadow: 0 0 15px rgba(239, 68, 68, 0.4);
    }
    .mode-badge.recovering {
      animation: glow-blue 3s infinite;
    }

    @keyframes pulse-red {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.05); box-shadow: 0 0 25px rgba(239, 68, 68, 0.6); }
      100% { opacity: 1; transform: scale(1); }
    }

    @keyframes glow-blue {
      0% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.2); }
      50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }
      100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.2); }
    }

    .infrastructure-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .infra-card { padding: 16px; border-left: 3px solid #10b981; }
    .infra-card.down { border-left-color: #ef4444; background: rgba(239, 68, 68, 0.05); }
    .infra-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .infra-header label { font-size: 0.75rem; color: #94a3b8; font-weight: 600; }
    .infra-status { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 700; color: #f8fafc; }
    .infra-status .dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; }
    .infra-card.down .infra-status .dot { background: #ef4444; animation: pulse-red 1s infinite; }

    .worker-item.placeholder { opacity: 0.4; border-style: dashed; border-color: rgba(255,255,255,0.1); }
    .worker-status.offline { color: #64748b; }

    /* AI Intelligence & Global Topology Styles */
    .intelligence-card.anomaly { border-color: #f59e0b; background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(15, 23, 42, 0.95) 100%); }
    .intel-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .intel-header h3 { margin: 0; font-size: 1rem; color: #e2e8f0; }
    
    .anomaly-alert { display: flex; align-items: center; gap: 8px; color: #f59e0b; margin-bottom: 12px; }
    .pulse-dot { width: 8px; height: 8px; background: #f59e0b; border-radius: 50%; animation: pulse-red 1.5s infinite; }
    .anomaly-msg { font-size: 0.85rem; color: #cbd5e1; line-height: 1.4; margin-bottom: 16px; }
    .intel-footer { font-size: 0.75rem; }
    .diag-section.swarm { margin-top: 32px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px; }
    .swarm-summary { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .quorum-badge { padding: 4px 12px; border-radius: 4px; font-size: 0.75rem; font-weight: 800; background: rgba(239, 68, 68, 0.1); color: #f87171; }
    .quorum-badge.success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
    .agent-breakdown-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .agent-vote-item { padding: 16px; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); }
    .agent-header { display: flex; justify-content: space-between; margin-bottom: 12px; }
    .agent-name { font-size: 0.65rem; color: #94a3b8; font-weight: 800; }
    .agent-conf { font-size: 0.65rem; color: #a78bfa; font-weight: 800; }
    .vote-action { display: block; font-size: 0.9rem; font-weight: 700; color: #f8fafc; margin-bottom: 4px; }
    .vote-reason { font-size: 0.75rem; color: #cbd5e1; line-height: 1.4; margin: 0; }

    .execution-trace { margin-top: 32px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px; }
    
    .no-anomaly { text-align: center; padding: 20px 0; color: #94a3b8; }
    .no-anomaly .icon { font-size: 1.5rem; margin-bottom: 8px; display: block; }
    .no-anomaly p { margin: 0; font-size: 0.85rem; }

    .policy-list { margin-top: 24px; }
    .policy-list label { display: block; font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; margin-bottom: 12px; }
    .policy-item { display: flex; align-items: center; gap: 10px; font-size: 0.8rem; color: #f8fafc; padding: 8px 12px; background: rgba(0,0,0,0.2); border-radius: 6px; margin-bottom: 8px; }

    .topology-card { border-left: 4px solid #3b82f6; }
    .topology-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .topology-header h3 { margin: 0; font-size: 1rem; }
    
    .region-list { display: flex; flex-direction: column; gap: 12px; }
    .region-item { padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid transparent; }
    .region-item.healthy { border-color: rgba(16, 185, 129, 0.2); }
    .region-item.degraded { border-color: rgba(245, 158, 11, 0.2); }
    .region-item.failing { border-color: rgba(239, 68, 68, 0.2); }
    
    .region-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .region-id { font-family: monospace; font-weight: 700; color: #e2e8f0; }
    .primary-label { font-size: 0.6rem; background: #3b82f6; color: #fff; padding: 2px 6px; border-radius: 4px; }
    
    .region-metrics { display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: #94a3b8; }
    .dot-separator { width: 3px; height: 3px; background: #475569; border-radius: 50%; }
    
    .region-status-bar { height: 3px; background: #334155; border-radius: 2px; margin-top: 10px; overflow: hidden; position: relative; }
    .region-status-bar::after { content: ''; position: absolute; left: 0; top: 0; height: 100%; width: 100%; transition: background 0.3s; }
    .healthy .region-status-bar::after { background: #10b981; }
    .degraded .region-status-bar::after { background: #f59e0b; }
    .failing .region-status-bar::after { background: #ef4444; animation: pulse-red 1s infinite; }

    /* Planning & Swarm UI */
    .planning-card { border-top: 4px solid #a78bfa; }
    .planning-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .title-group { display: flex; align-items: center; gap: 12px; }
    .title-group .icon { font-size: 1.5rem; }
    .title-group h3 { margin: 0; font-size: 1rem; color: #e2e8f0; }

    .goal-pill { padding: 4px 12px; border-radius: 4px; font-size: 0.7rem; font-weight: 800; background: rgba(167, 139, 250, 0.1); color: #a78bfa; border: 1px solid rgba(167, 139, 250, 0.3); }
    .goal-pill.critical { background: rgba(239, 68, 68, 0.1); color: #f87171; border-color: rgba(239, 68, 68, 0.3); }
    .goal-pill.high { background: rgba(245, 158, 11, 0.1); color: #fbbf24; border-color: rgba(245, 158, 11, 0.3); }

    .planning-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 32px; }
    .planning-grid label { display: block; font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; margin-bottom: 16px; font-weight: 600; }

    .step-list { display: flex; flex-direction: column; gap: 12px; }
    .step-item { display: flex; align-items: center; gap: 16px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); }
    .step-item.active { border-color: #a78bfa; background: rgba(167, 139, 250, 0.05); }
    
    .step-index { width: 24px; height: 24px; border-radius: 50%; background: #334155; display: flex; justify-content: center; align-items: center; font-size: 0.75rem; font-weight: 800; color: #cbd5e1; }
    .step-item.active .step-index { background: #a78bfa; color: #1e1b4b; }
    
    .step-info { flex: 1; }
    .step-action { font-size: 0.85rem; font-weight: 700; color: #f8fafc; }
    .step-reason { font-size: 0.75rem; color: #94a3b8; }
    .step-status { font-size: 0.65rem; font-weight: 800; color: #a78bfa; animation: blink 1s infinite; }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

    .plan-eta { margin-top: 16px; font-size: 0.75rem; color: #94a3b8; font-style: italic; }

    .proposal-list { display: flex; flex-direction: column; gap: 10px; }
    .proposal-item { display: grid; grid-template-columns: 100px 1fr 80px; align-items: center; gap: 12px; padding: 10px; background: rgba(0,0,0,0.1); border-radius: 6px; }
    .agent-id { font-size: 0.65rem; font-weight: 800; color: #60a5fa; text-transform: uppercase; }
    .proposal-action { font-size: 0.8rem; color: #cbd5e1; }
    .proposal-conf { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .proposal-conf span { font-size: 0.65rem; color: #94a3b8; }
    
    .mini-meter { width: 40px; height: 3px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; }
    .mini-meter .fill { height: 100%; background: #60a5fa; }

    /* Evolution UI */
    .evolution-card { background: linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9)); border-left: 4px solid #10b981; }
    .cycle-tag { font-size: 0.6rem; background: #1e293b; padding: 2px 8px; border-radius: 4px; color: #94a3b8; border: 1px solid rgba(255,255,255,0.05); }
    
    .evolution-stats { margin: 20px 0; }
    .stat-main { text-align: center; margin-bottom: 20px; }
    .stat-main .stat-value { font-size: 2.5rem; font-weight: 800; color: #10b981; line-height: 1; text-shadow: 0 0 20px rgba(16, 185, 129, 0.3); }
    .stat-main .stat-label { font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px; }

    .stat-compare { background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; }
    .compare-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.75rem; color: #e2e8f0; }
    .win-value { color: #10b981; font-weight: 700; }
    
    .compare-bar { width: 100%; height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; }
    .compare-bar .fill { height: 100%; background: #10b981; box-shadow: 0 0 10px rgba(16, 185, 129, 0.5); }

    .evolution-status { display: flex; align-items: center; gap: 8px; font-size: 0.7rem; color: #94a3b8; margin-top: 16px; }
    .pulse-icon { width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block; animation: pulse-green 2s infinite; }
    @keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
    .modal-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);
      display: flex; justify-content: center; align-items: center; z-index: 1000;
      animation: fade-in 0.3s ease;
    }
    .modal-content {
      background: #0f172a; border: 1px solid rgba(255,255,255,0.1);
      width: 900px; max-height: 90vh; border-radius: 16px; overflow: hidden;
      box-shadow: 0 24px 64px rgba(0,0,0,0.6);
    }
    .diagnostic-modal { border-top: 4px solid #3b82f6; }
    
    .modal-header { padding: 24px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; }
    .header-main { display: flex; align-items: center; gap: 16px; }
    .header-main h2 { margin: 0; font-size: 1.25rem; color: #f8fafc; }
    .btn-close { background: none; border: none; color: #94a3b8; font-size: 2rem; cursor: pointer; }
    
    .modal-body { padding: 32px; overflow-y: auto; max-height: calc(90vh - 140px); }
    .diag-summary { background: rgba(59, 130, 246, 0.1); padding: 16px 24px; border-radius: 12px; margin-bottom: 32px; border-left: 4px solid #3b82f6; }
    .diag-summary p { margin: 0; color: #cbd5e1; font-size: 1rem; line-height: 1.6; }

    .diag-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
    .diag-section label { display: block; font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; margin-bottom: 16px; font-weight: 700; }
    
    .evidence-box { background: rgba(0,0,0,0.2); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); }
    .cause-node { display: flex; gap: 16px; }
    .node-icon { font-size: 1.5rem; }
    .node-text strong { color: #f87171; display: block; margin-bottom: 4px; }
    .node-text p { margin: 0; font-size: 0.85rem; color: #94a3b8; line-height: 1.5; }

    .reasoning-stats { display: flex; flex-direction: column; gap: 12px; }
    .r-stat { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 6px; }
    .r-label { font-size: 0.75rem; color: #64748b; }
    .r-val { font-size: 0.9rem; font-weight: 700; color: #f8fafc; }
    .r-val.highlight { color: #10b981; }

    .lift-indicator { margin-top: 16px; font-size: 0.75rem; color: #10b981; font-style: italic; display: flex; align-items: center; gap: 8px; }
    .lift-indicator::before { content: '🚀'; }

    .execution-trace { margin-top: 32px; }
    .trace-steps { display: flex; flex-direction: column; gap: 16px; padding-left: 20px; border-left: 2px solid rgba(255,255,255,0.05); }
    .trace-step { display: flex; align-items: center; gap: 20px; position: relative; }
    .trace-step::before { content: ''; position: absolute; left: -21px; top: 10px; width: 2px; height: 36px; background: rgba(255,255,255,0.05); }
    .trace-step:last-child::before { display: none; }
    
    .step-status { width: 10px; height: 10px; border-radius: 50%; background: #64748b; position: relative; left: -25px; z-index: 2; border: 2px solid #0f172a; }
    .step-status.complete, .step-status.success { background: #10b981; box-shadow: 0 0 10px rgba(16, 185, 129, 0.4); }
    .step-status.failed { background: #ef4444; }
    
    .step-content { flex: 1; }
    .step-name { font-size: 0.85rem; font-weight: 700; color: #f1f5f9; display: block; }
    .step-details { font-size: 0.75rem; color: #64748b; }

    .modal-footer { padding: 24px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: flex-end; }
    .btn-primary { background: #3b82f6; color: #fff; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: transform 0.2s; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4); }

    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class SystemHealthComponent {
  private health = inject(SystemHealthService);
  metrics$ = this.health.metrics$;
  actionStates$ = this.health.actionStates$;
  actionLockout = 0;
  activePostMortem: any = null;
  Date = Date;
  Math = Math;
  private lockoutTimer: any;

  ngOnDestroy() {
    if (this.lockoutTimer) clearInterval(this.lockoutTimer);
  }

  onViewPostMortem(incident: any) {
    this.activePostMortem = incident.postMortem;
  }

  private startLockout() {
    this.actionLockout = 10;
    if (this.lockoutTimer) clearInterval(this.lockoutTimer);
    this.lockoutTimer = setInterval(() => {
      this.actionLockout--;
      if (this.actionLockout <= 0) {
        clearInterval(this.lockoutTimer);
      }
    }, 1000);
  }

  onForceRecovery() {
    const impact = this.health.getImpactSummary('RECOVER');
    if (confirm(`${impact}\n\nAre you sure you want to force system recovery?`)) {
      this.startLockout();
      this.health.forceRecovery();
    }
  }

  onSetMode(mode: string) {
    const impact = this.health.getImpactSummary('SHIELD');
    if (confirm(`${impact}\n\nManually switch system to ${mode} mode?`)) {
      this.startLockout();
      this.health.setMode(mode);
    }
  }

  onDrainWorkers() {
    const impact = this.health.getImpactSummary('DRAIN');
    const confirmation = prompt(`${impact}\n\nCRITICAL ACTION: Type "DRAIN" to confirm fleet-wide operation:`);
    
    if (confirmation === 'DRAIN') {
      this.startLockout();
      this.health.drainFleet();
    } else if (confirmation !== null) {
      alert('Confirmation failed. Operation cancelled.');
    }
  }

  onReplayDlq(dryRun: boolean = false) {
    const impact = this.health.getImpactSummary('REPLAY');
    const msg = dryRun 
      ? 'Perform a safe verification of DLQ contents? No events will be re-injected.' 
      : `${impact}\n\nTrigger safe REPLAY of DLQ events? This will process batches with 1s delays.`;

    if (confirm(msg)) {
      if (!dryRun) this.startLockout();
      this.health.replayDlq(dryRun);
    }
  }

  onExportReport() {
    this.health.exportIncidentReport();
  }

  getModeDescription(mode?: string): string {
    switch (mode) {
      case 'RECOVERING': return 'System is stabilizing. Cooldown active to prevent flapping.';
      case 'INCIDENT': return 'System is in an active incident state. Multiple SLO breaches detected.';
      case 'EMERGENCY': return 'Traffic is entirely rejected to prevent cascading total system collapse.';
      case 'PROTECT': return 'Only critical tenant missions are accepted. Low-priority traffic is shed.';
      case 'DEGRADED': return 'System is experiencing stress. Retries are throttled and batching is increased.';
      case 'DOWN': return 'System is currently unavailable. No API or WebSocket connection.';
      case 'UNAUTHORIZED': return 'CRITICAL: Authentication failed between control plane services.';
      default: return 'System is healthy and operating within nominal SLO parameters.';
    }
  }

  getStatusClass(metrics: any): string {
    if (!metrics) return 'offline';
    const mode = metrics.mode || 'NORMAL';
    const modeClass = mode.toLowerCase();
    
    if (mode === 'NORMAL') return 'operational normal';
    if (mode === 'INCIDENT') return 'emergency incident';
    if (mode === 'EMERGENCY') return 'emergency emergency';
    if (mode === 'DOWN') return 'down emergency';
    if (mode === 'UNAUTHORIZED') return 'emergency unauthorized';
    if (mode === 'RECOVERING') return 'warning recovering';
    if (mode === 'DEGRADED') return 'degraded';
    
    return modeClass;
  }

  getStatusLabel(metrics: any): string {
    if (!metrics) return 'Loading...';
    if (metrics.mode === 'RECOVERING') return 'Recovering';
    if (metrics.mode === 'INCIDENT') return 'Incident Active';
    if (metrics.mode === 'EMERGENCY') return 'Emergency';
    if (metrics.mode === 'PROTECT') return 'Protect';
    if (metrics.mode === 'DEGRADED') return 'Degraded';
    if (metrics.mode === 'DOWN') return 'Down';
    if (metrics.mode === 'UNAUTHORIZED') return 'Auth Blocked';
    return 'Operational';
  }
}

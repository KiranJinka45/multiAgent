import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ZtanService } from '../../core/services/ztan.service';
import { interval, Subscription, switchMap, startWith } from 'rxjs';
import { 
  ShieldCheck, 
  Server, 
  Lock, 
  Clock, 
  Activity,
  UserCheck,
  CheckCircle2,
  HardDrive
} from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-stewardship-hub',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="stewardship-container" *ngIf="metrics">
      <!-- Institutional Header -->
      <div class="steward-header">
        <div class="title-group">
          <h1>STEWARDSHIP HUB</h1>
          <p class="subtitle">Architecture State: <span class="state-freeze">FROZEN (2026-LTS.1)</span></p>
        </div>
        <div class="operational-mode">
          <lucide-icon [name]="ShieldCheck" class="mode-icon"></lucide-icon>
          <span>OPERATIONAL STABILITY MODE ACTIVE</span>
        </div>
      </div>

      <!-- Core Stability Pillars -->
      <div class="pillars-grid">
        <div class="op-card pillar">
          <div class="pillar-header">
            <lucide-icon [name]="Lock" class="pillar-icon"></lucide-icon>
            <h3>Cryptographic Integrity</h3>
          </div>
          <div class="pillar-stat">
            <span class="value">100%</span>
            <span class="label">Proof Verification Rate</span>
          </div>
          <div class="pillar-footer">
            <span class="status healthy">NOMINAL</span>
          </div>
        </div>

        <div class="op-card pillar">
          <div class="pillar-header">
            <lucide-icon [name]="UserCheck" class="pillar-icon"></lucide-icon>
            <h3>Governance Consensus</h3>
          </div>
          <div class="pillar-stat">
            <span class="value">2/3</span>
            <span class="label">Signing Threshold (m/n)</span>
          </div>
          <div class="pillar-footer">
            <span class="status healthy">THRESHOLD INTACT</span>
          </div>
        </div>

        <div class="op-card pillar">
          <div class="pillar-header">
            <lucide-icon [name]="HardDrive" class="pillar-icon"></lucide-icon>
            <h3>Infrastructure Aging</h3>
          </div>
          <div class="pillar-stat">
            <span class="value">184d</span>
            <span class="label">Median Component Age</span>
          </div>
          <div class="pillar-footer">
            <span class="status warning">DURABILITY WATCH</span>
          </div>
        </div>

        <div class="op-card pillar">
          <div class="pillar-header">
            <lucide-icon [name]="Activity" class="pillar-icon"></lucide-icon>
            <h3>Recovery Reliability</h3>
          </div>
          <div class="pillar-stat">
            <span class="value">99.8%</span>
            <span class="label">Auto-Heal Success</span>
          </div>
          <div class="pillar-footer">
            <span class="status healthy">RELIABLE</span>
          </div>
        </div>
      </div>

      <div class="hub-layout">
        <!-- Validator Network Registry -->
        <div class="op-card validator-registry">
          <div class="card-header">
            <div class="header-left">
              <lucide-icon [name]="Server" class="header-icon"></lucide-icon>
              <h2>Validator Network Registry</h2>
            </div>
            <span class="count-tag">{{ metrics.totalNodes }} Nodes</span>
          </div>
          <div class="validator-list">
            <div class="validator-item" *ngFor="let node of metrics.nodes">
              <div class="node-main">
                <span class="node-name">{{ node.name }}</span>
                <span class="node-id mono">{{ node.id }}</span>
              </div>
              <div class="node-meta">
                <span class="node-version mono">v1.4.2</span>
                <span class="node-status" [class.online]="node.status === 'ONLINE'">
                  {{ node.status }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Governance Protocols -->
        <div class="op-card protocols-panel">
          <div class="card-header">
            <div class="header-left">
              <lucide-icon [name]="CheckCircle2" class="header-icon"></lucide-icon>
              <h2>Governance Protocols</h2>
            </div>
          </div>
          <div class="protocol-list">
            <div class="protocol-item">
              <span class="p-title">Institutional Replayability</span>
              <p>All operational mutations are captured in a cryptographically linked ledger with 180-day mandatory retention.</p>
            </div>
            <div class="protocol-item">
              <span class="p-title">Determinism Enforcement</span>
              <p>System state convergence must be verified by at least 2 independent validator nodes before finality.</p>
            </div>
            <div class="protocol-item">
              <span class="p-title">Maintenance Windowing</span>
              <p>Strict architecture freeze in effect. Refinements limited to security remediation and durability fixes.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stewardship-container {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    .steward-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid hsl(var(--border-muted));
    }
    .title-group h1 { margin: 0; font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em; }
    .subtitle { margin: 0.25rem 0 0; font-size: 0.8125rem; color: hsl(var(--text-dim)); font-weight: 700; }
    .state-freeze { color: hsl(var(--status-recovering)); }

    .operational-mode {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 1rem;
      background: hsl(var(--bg-elevated));
      border: 1px solid hsl(var(--status-healthy) / 0.3);
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 800;
      color: hsl(var(--status-healthy));
    }
    .mode-icon { width: 16px; height: 16px; }

    .pillars-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
    }
    .pillar { display: flex; flex-direction: column; gap: 1.5rem; }
    .pillar-header { display: flex; align-items: center; gap: 0.75rem; color: hsl(var(--text-muted)); }
    .pillar-icon { width: 18px; height: 18px; }
    .pillar-header h3 { margin: 0; font-size: 0.875rem; font-weight: 700; }
    
    .pillar-stat { display: flex; flex-direction: column; gap: 0.25rem; }
    .pillar-stat .value { font-size: 2rem; font-weight: 800; color: hsl(var(--text-main)); }
    .pillar-stat .label { font-size: 0.65rem; font-weight: 700; color: hsl(var(--text-dim)); text-transform: uppercase; }

    .pillar-footer .status {
      font-size: 0.65rem;
      font-weight: 800;
      padding: 0.125rem 0.5rem;
      border-radius: 2px;
      background: hsl(var(--bg-elevated));
    }
    .status.healthy { color: hsl(var(--status-healthy)); background: hsl(var(--status-healthy) / 0.1); }
    .status.warning { color: hsl(var(--status-warning)); background: hsl(var(--status-warning) / 0.1); }

    .hub-layout {
      display: grid;
      grid-template-columns: 1fr 400px;
      gap: 2rem;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .header-left { display: flex; align-items: center; gap: 0.75rem; }
    .header-icon { width: 20px; height: 20px; color: hsl(var(--text-dim)); }
    .card-header h2 { margin: 0; font-size: 1rem; font-weight: 700; }
    .count-tag { font-size: 0.65rem; font-weight: 700; color: hsl(var(--text-dim)); background: hsl(var(--bg-elevated)); padding: 0.25rem 0.5rem; border-radius: 2px; }

    .validator-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .validator-item {
      display: flex;
      justify-content: space-between;
      padding: 1rem;
      background: hsl(var(--bg-elevated) / 0.3);
      border-radius: 4px;
      border: 1px solid hsl(var(--border-muted));
    }
    .node-main { display: flex; flex-direction: column; gap: 0.25rem; }
    .node-name { font-size: 0.875rem; font-weight: 700; color: hsl(var(--text-main)); }
    .node-id { font-size: 0.75rem; color: hsl(var(--text-dim)); }
    
    .node-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; }
    .node-version { font-size: 0.65rem; color: hsl(var(--text-muted)); }
    .node-status { font-size: 0.65rem; font-weight: 800; color: hsl(var(--text-dim)); }
    .node-status.online { color: hsl(var(--status-healthy)); }

    .protocol-list { display: flex; flex-direction: column; gap: 1.5rem; }
    .protocol-item .p-title { display: block; font-size: 0.8125rem; font-weight: 800; color: hsl(var(--text-main)); margin-bottom: 0.5rem; }
    .protocol-item p { margin: 0; font-size: 0.8125rem; color: hsl(var(--text-muted)); line-height: 1.5; }
  `]
})
export class StewardshipHubComponent implements OnInit, OnDestroy {
  ztan = inject(ZtanService);
  metrics: any = null;
  private sub: Subscription | null = null;

  readonly ShieldCheck = ShieldCheck;
  readonly Server = Server;
  readonly Lock = Lock;
  readonly Clock = Clock;
  readonly Activity = Activity;
  readonly UserCheck = UserCheck;
  readonly CheckCircle2 = CheckCircle2;
  readonly HardDrive = HardDrive;

  ngOnInit() {
    this.sub = interval(10000).pipe(
      startWith(0),
      switchMap(() => this.ztan.getMetrics())
    ).subscribe({
      next: (data) => this.metrics = data,
      error: (err) => console.error('Stewardship Hub Error:', err)
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ZtanService } from '../../../core/services/ztan.service';
import { interval, Subscription, switchMap, startWith } from 'rxjs';

@Component({
  selector: 'app-ztan-trust-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="trust-container">
      <div class="header">
        <div class="title-group">
          <span class="badge">LIVE AUDIT NETWORK</span>
          <h1>ZTAN Public Trust Dashboard</h1>
          <p>Real-time cryptographic proof of system integrity and financial oversight.</p>
        </div>
        <div class="network-status" [class.online]="metrics?.status === 'OPERATIONAL'">
          <span class="pulse"></span>
          {{ metrics?.status || 'CONNECTING...' }}
        </div>
      </div>

      <div class="metrics-grid">
        <div class="metric-card glass">
          <label>Total Verified Proofs</label>
          <div class="value">{{ metrics?.totalProofs || 0 }}</div>
          <div class="sub-label">Immutable Audit Trail</div>
        </div>
        <div class="metric-card glass">
          <label>Active Ceremonies</label>
          <div class="value">{{ metrics?.activeCeremonies || 0 }}</div>
          <div class="sub-label">MPC Consensus in Progress</div>
        </div>
        <div class="metric-card glass">
          <label>Validator Nodes</label>
          <div class="value">{{ metrics?.totalNodes || 0 }}</div>
          <div class="sub-label">Decentralized Trust Root</div>
        </div>
        <div class="metric-card glass">
          <label>Protocol Version</label>
          <div class="value">v1.4</div>
          <div class="sub-label">RFC-001 Hardened</div>
        </div>
      </div>

      <div class="main-content">
        <div class="ceremony-feed glass">
          <h3>Live Proof Registry</h3>
          <div class="proof-list">
            <div class="proof-item" *ngFor="let proof of metrics?.recentProofs">
              <div class="proof-header">
                <span class="proof-id">{{ proof.id.substring(0, 12) }}...</span>
                <span class="proof-time">{{ proof.timestamp | date:'shortTime' }}</span>
              </div>
              <div class="proof-body">
                <div class="proof-type">{{ proof.type }}</div>
                <div class="proof-status verified">VERIFIED</div>
              </div>
              <div class="proof-hash">{{ proof.hash.substring(0, 48) }}...</div>
            </div>
            <div class="empty-state" *ngIf="!metrics?.recentProofs?.length">
              <span class="icon">🔍</span>
              Waiting for cryptographic events...
            </div>
          </div>
        </div>

        <div class="node-registry glass">
          <h3>Validator Network</h3>
          <div class="node-grid">
            <div class="node-item" *ngFor="let node of metrics?.nodes" [class.active]="node.status === 'ONLINE'">
              <div class="node-icon">🛡️</div>
              <div class="node-info">
                <div class="node-name">{{ node.name }}</div>
                <div class="node-id">{{ node.id }}</div>
              </div>
              <div class="node-status-dot"></div>
            </div>
          </div>
          <div class="trust-disclaimer">
            <span class="icon">ℹ️</span>
            All signing ceremonies require a 2/3 threshold consensus.
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .trust-container {
      padding: 40px;
      max-width: 1400px;
      margin: 0 auto;
      color: #f8fafc;
      font-family: 'Inter', sans-serif;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 48px;
    }

    .badge {
      background: rgba(167, 139, 250, 0.1);
      color: #a78bfa;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 1px;
      margin-bottom: 12px;
      display: inline-block;
      border: 1px solid rgba(167, 139, 250, 0.3);
    }

    h1 {
      font-size: 2.5rem;
      font-weight: 800;
      margin: 0 0 8px 0;
      letter-spacing: -1px;
      background: linear-gradient(135deg, #fff 0%, #94a3b8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .network-status {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(0,0,0,0.3);
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      color: #94a3b8;
      border: 1px solid rgba(255,255,255,0.05);
    }

    .network-status.online {
      color: #10b981;
      border-color: rgba(16, 185, 129, 0.2);
    }

    .pulse {
      width: 8px; height: 8px;
      background: #475569;
      border-radius: 50%;
    }

    .online .pulse {
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { transform: scale(0.95); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.7; }
      100% { transform: scale(0.95); opacity: 1; }
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
      margin-bottom: 48px;
    }

    .glass {
      background: rgba(30, 41, 59, 0.4);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 24px;
      transition: transform 0.3s ease, border-color 0.3s ease;
    }

    .glass:hover {
      transform: translateY(-4px);
      border-color: rgba(167, 139, 250, 0.3);
    }

    .metric-card label {
      font-size: 0.75rem;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .metric-card .value {
      font-size: 2.5rem;
      font-weight: 800;
      margin: 8px 0;
      color: #f8fafc;
    }

    .metric-card .sub-label {
      font-size: 0.7rem;
      color: #64748b;
    }

    .main-content {
      display: grid;
      grid-template-columns: 1fr 400px;
      gap: 32px;
    }

    h3 {
      font-size: 1.1rem;
      margin: 0 0 24px 0;
      color: #e2e8f0;
      font-weight: 700;
    }

    .proof-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .proof-item {
      padding: 16px;
      background: rgba(0,0,0,0.2);
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.03);
    }

    .proof-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .proof-id {
      font-family: 'Roboto Mono', monospace;
      font-size: 0.75rem;
      color: #a78bfa;
    }

    .proof-time {
      font-size: 0.7rem;
      color: #64748b;
    }

    .proof-body {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .proof-type {
      font-weight: 600;
      font-size: 0.9rem;
    }

    .proof-status.verified {
      font-size: 0.65rem;
      font-weight: 800;
      color: #10b981;
      background: rgba(16, 185, 129, 0.1);
      padding: 2px 8px;
      border-radius: 4px;
    }

    .proof-hash {
      font-family: 'Roboto Mono', monospace;
      font-size: 0.65rem;
      color: #475569;
      word-break: break-all;
    }

    .node-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .node-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px;
      background: rgba(0,0,0,0.2);
      border-radius: 10px;
      opacity: 0.5;
      transition: opacity 0.3s ease;
    }

    .node-item.active {
      opacity: 1;
      background: rgba(16, 185, 129, 0.05);
      border: 1px solid rgba(16, 185, 129, 0.1);
    }

    .node-icon { font-size: 1.25rem; }

    .node-info { flex: 1; }
    .node-name { font-size: 0.85rem; font-weight: 700; color: #f1f5f9; }
    .node-id { font-size: 0.7rem; color: #64748b; font-family: monospace; }

    .node-status-dot {
      width: 6px; height: 6px;
      background: #475569;
      border-radius: 50%;
    }

    .active .node-status-dot {
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }

    .trust-disclaimer {
      margin-top: 24px;
      font-size: 0.75rem;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 8px;
      font-style: italic;
    }

    .empty-state {
      text-align: center;
      padding: 48px 0;
      color: #475569;
    }

    .empty-state .icon {
      font-size: 2rem;
      display: block;
      margin-bottom: 12px;
    }
  `]
})
export class ZtanTrustDashboardComponent implements OnInit, OnDestroy {
  metrics: any = null;
  private sub: Subscription | null = null;

  constructor(private ztan: ZtanService) {}

  ngOnInit() {
    this.sub = interval(5000).pipe(
      startWith(0),
      switchMap(() => this.ztan.getMetrics())
    ).subscribe({
      next: (data) => this.metrics = data,
      error: (err) => console.error('Trust Dashboard Error:', err)
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}

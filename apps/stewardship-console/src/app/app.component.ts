import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { StewardshipService } from './stewardship.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="institutional-shell">
      <!-- GLOBAL CONTEXT HEADER (Institutional Heartbeat) -->
      <header class="global-header">
        <div class="brand">
          <span class="logo">NEXUS ZTAN</span>
          <span class="env-tag">LTS.2026</span>
        </div>
        
        <div class="global-metrics">
          <!-- Real-Time Operator Latency Indicator -->
          <div class="g-metric drill-timer" *ngIf="(state$ | async)?.activeDrill !== 'NONE'">
            <label class="flashing-label">⚠️ OPERATOR LATENCY MEASUREMENT</label>
            <span class="v timer-val">{{ (state$ | async)?.currentRunningLatency }}s</span>
          </div>

          <div class="g-metric" *ngIf="(state$ | async)?.operatorReactionTime !== null && (state$ | async)?.activeDrill === 'NONE'">
            <label class="success-label">✓ LAST REACTION KPI</label>
            <span class="v kpi-val">{{ (state$ | async)?.operatorReactionTime }}s</span>
          </div>

          <div class="g-metric">
            <label>EPISTEMIC STATUS</label>
            <span [class]="'v ' + (state$ | async)?.trustLevel">
              {{ (state$ | async)?.trustLevel }}
            </span>
          </div>
          <div class="g-metric">
            <label>ACTIVE EPOCH</label>
            <span class="v">{{ (state$ | async)?.epoch }}</span>
          </div>
          <div class="g-metric">
            <label>SAFE_MODE</label>
            <span [class]="'v ' + ((state$ | async)?.isSafeMode ? 'ACTIVE' : 'INACTIVE')">
              {{ (state$ | async)?.isSafeMode ? 'ACTIVE' : 'INACTIVE' }}
            </span>
          </div>
          <div class="g-metric">
            <label>ACCOUNTABILITY</label>
            <span class="v" [class.supervisor]="(state$ | async)?.escalationTier !== 'OPERATOR'">
              {{ (state$ | async)?.escalationTier }}
            </span>
          </div>
          <div class="g-metric">
            <label>UTC CLOCK</label>
            <span class="v clock">{{ clock }}</span>
          </div>
        </div>
      </header>

      <div class="degraded-authority-banner" *ngIf="(state$ | async)?.isOfflineMode">
        <span class="banner-icon">⚠️</span>
        <span class="banner-text"><strong>DEGRADED AUTHORITY / OFFLINE SIMULATION ACTIVE</strong> — Epistemic state is running locally. Connection to the authoritative backend ZTAN ledger has eroded.</span>
      </div>

      <div class="main-body">
        <!-- LEFT OPERATIONAL NAVIGATION -->
        <nav class="side-nav">
          <section class="nav-section">
            <label>OPERATIONAL POSTURE</label>
            <a routerLink="/home" routerLinkActive="active" class="nav-item">Console Home</a>
          </section>

          <section class="nav-section">
            <label>DETECTION & TRIAGE</label>
            <a routerLink="/incidents" routerLinkActive="active" class="nav-item">
              Incident Center
              <span class="badge" *ngIf="((state$ | async)?.activeIncidents?.length ?? 0) > 0">
                {{ (state$ | async)?.activeIncidents?.length }}
              </span>
            </a>
          </section>

          <section class="nav-section">
            <label>RECOVERY & REPLAY</label>
            <a routerLink="/replay" routerLinkActive="active" class="nav-item">Replay Explorer</a>
            <a routerLink="/recovery" routerLinkActive="active" class="nav-item" [class.dangerous-highlight]="(state$ | async)?.isSafeMode">Recovery Console</a>
          </section>

          <section class="nav-section">
            <label>STEWARDSHIP</label>
            <a routerLink="/stewardship" routerLinkActive="active" class="nav-item">Stewardship Hub</a>
          </section>

          <section class="nav-section">
            <label>GOVERNANCE</label>
            <a routerLink="/governance" routerLinkActive="active" class="nav-item">Epoch Registry</a>
          </section>
        </nav>

        <!-- MODULE SURFACE -->
        <section class="module-surface">
          <router-outlet></router-outlet>
        </section>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --bg-header: #0b0f19;
      --bg-sidebar: #020617;
      --bg-surface: #030712;
      --text-label: #64748b;
      --text-v: #cbd5e1;
      --accent-green: #10b981;
      --accent-amber: #f59e0b;
      --accent-red: #ef4444;
      display: block;
      height: 100vh;
      background: var(--bg-surface);
      color: var(--text-v);
      font-family: 'Inter', sans-serif;
    }

    .institutional-shell { display: flex; flex-direction: column; height: 100%; }

    .global-header {
      height: 54px;
      background: var(--bg-header);
      border-bottom: 1px solid #1f2937;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 1.5rem;
      flex-shrink: 0;
    }

    .brand { display: flex; align-items: baseline; gap: 0.75rem; }
    .logo { font-weight: 800; font-size: 0.95rem; letter-spacing: -0.02em; color: #f3f4f6; }
    .env-tag { font-size: 0.6rem; font-weight: 700; color: var(--accent-amber); border: 1px solid var(--accent-amber); padding: 1px 4px; border-radius: 2px; }

    .global-metrics { display: flex; gap: 2.5rem; align-items: center; }
    .g-metric { display: flex; flex-direction: column; }
    .g-metric label { font-size: 0.55rem; font-weight: 800; color: var(--text-label); letter-spacing: 0.05em; margin-bottom: 2px; }
    .g-metric .v { font-size: 0.75rem; font-family: 'JetBrains Mono', monospace; font-weight: 600; }
    
    .v.VERIFIED { color: var(--accent-green); }
    .v.DEGRADED { color: var(--accent-amber); }
    .v.UNTRUSTED { color: var(--accent-red); }
    .v.ACTIVE { color: var(--accent-amber); font-weight: 800; animation: flash 1s infinite alternate; }
    .v.INACTIVE { color: var(--text-label); }
    .v.supervisor { color: var(--accent-amber); }
    .v.clock { color: var(--text-label); }

    .drill-timer { border-left: 2px solid var(--accent-red); padding-left: 0.75rem; }
    .flashing-label { color: var(--accent-red) !important; animation: flash 0.6s infinite alternate; }
    .timer-val { color: var(--accent-red); font-size: 0.85rem !important; }

    .success-label { color: var(--accent-green) !important; }
    .kpi-val { color: var(--accent-green) !important; }

    .main-body { display: flex; flex: 1; overflow: hidden; }

    .side-nav {
      width: 240px;
      background: var(--bg-sidebar);
      border-right: 1px solid #111827;
      padding: 1.5rem 0;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      overflow-y: auto;
    }

    .nav-section { display: flex; flex-direction: column; gap: 0.25rem; }
    .nav-section label { font-size: 0.6rem; font-weight: 800; color: var(--text-label); padding: 0 1.5rem; margin-bottom: 0.5rem; letter-spacing: 0.05em; }

    .nav-item {
      padding: 0.5rem 1.5rem;
      font-size: 0.8rem;
      font-weight: 500;
      color: #9ca3af;
      text-decoration: none;
      border-left: 3px solid transparent;
      transition: all 0.2s;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .nav-item:hover { background: #111827; color: #f3f4f6; }
    .nav-item.active { background: #111827; color: #f3f4f6; border-left-color: var(--accent-green); }
    
    .dangerous-highlight {
      border-left-color: var(--accent-red) !important;
      color: #fca5a5 !important;
      background: rgba(239, 68, 68, 0.05);
    }
    
    .badge {
      background: var(--accent-red);
      color: white;
      font-size: 0.6rem;
      font-weight: 800;
      padding: 1px 5px;
      border-radius: 99px;
    }

    .module-surface { flex: 1; overflow: hidden; background: var(--bg-surface); }

    .degraded-authority-banner {
      background: linear-gradient(90deg, #78350f 0%, #451a03 100%);
      border-bottom: 1px solid #b45309;
      color: #fef3c7;
      padding: 0.5rem 1.5rem;
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      animation: alertPulse 2s infinite alternate;
      font-family: 'JetBrains Mono', monospace;
      flex-shrink: 0;
    }
    .banner-icon {
      font-size: 0.95rem;
    }
    .banner-text strong {
      color: #fbbf24;
      letter-spacing: 0.05em;
    }

    @keyframes flash {
      from { opacity: 0.4; }
      to { opacity: 1; }
    }
    @keyframes alertPulse {
      from { background: linear-gradient(90deg, #78350f 0%, #451a03 100%); }
      to { background: linear-gradient(90deg, #92400e 0%, #78350f 100%); }
    }
  `]
})
export class AppComponent {
  private stewardship = inject(StewardshipService);
  state$ = this.stewardship.state$;
  clock = '';

  constructor() {
    setInterval(() => {
      this.clock = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    }, 1000);
  }
}

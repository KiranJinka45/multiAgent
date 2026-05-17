import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StewardshipService } from '../../stewardship.service';

@Component({
  selector: 'app-governance-registry',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <header class="page-header">
        <h1>Institutional Epoch & Governance Registry</h1>
        <p>Continuous audit of consensus rotations, constitutional ceremonies, and sociotechnical approvals.</p>
      </header>

      <div class="governance-layout">
        
        <!-- TIMELINE PANELS (Left) -->
        <section class="timeline-panel">
          <h3>CONSTITUTIONAL TIMELINE (ARCHIVAL LEDGER)</h3>
          
          <div class="timeline">
            <div *ngFor="let epoch of (state$ | async)?.governanceHistory" 
                 class="timeline-item" 
                 [class.active]="epoch.status === 'ACTIVE'"
                 [class.failed]="epoch.status === 'FAILED'">
              <div class="t-marker"></div>
              <div class="t-content">
                <div class="t-header">
                  <span class="epoch-id">EPOCH {{ epoch.id }}</span>
                  <span class="status-tag" [class]="epoch.status">{{ epoch.status }}</span>
                </div>
                <div class="t-desc">{{ epoch.desc }}</div>
                <div class="t-meta">HSM PUBLIC KEY BINDING: 0x{{ epoch.id }}E3B9F2... | DATE: {{ epoch.timestamp }}</div>
              </div>
            </div>
          </div>
        </section>

        <!-- AUDIT PANELS (Right) -->
        <section class="audit-panel">
          <div class="audit-header">
            <h3>CEREMONY RITUAL HEALTH</h3>
            <span class="audit-tag" 
                  [class.ok]="((state$ | async)?.ritualIntegrity ?? 100) > 75"
                  [class.warn]="((state$ | async)?.ritualIntegrity ?? 100) <= 75">
              {{ ((state$ | async)?.ritualIntegrity ?? 100) > 75 ? 'NOMINAL' : 'DECAYED' }}
            </span>
          </div>

          <!-- Rubber-Stamping Alert Banner -->
          <div class="decay-warning flash-border" *ngIf="(state$ | async)?.ritualDecayed">
            <h4>⚠️ RITUAL DECAY WARNING</h4>
            <p>Approval metrics indicate severe rubber-stamping behaviors. Narrative lengths have plummeted and ceremony delays are dangerously brief.</p>
          </div>

          <p class="audit-desc">Audits operator narrative lengths, signature repetitions, and cooling durations to verify qualitative human participation.</p>
          
          <div class="audit-metrics">
            <div class="a-metric">
              <label>RITUAL INTEGRITY BASELINE</label>
              <span class="v" [class.danger]="((state$ | async)?.ritualIntegrity ?? 100) <= 75">
                {{ (state$ | async)?.ritualIntegrity }}%
              </span>
            </div>

            <div class="a-metric">
              <label>APPROVAL NARRATIVE LENGTH</label>
              <span class="v" [class.danger]="((state$ | async)?.approvalNarrativeLengthAvg ?? 0) < 50">
                {{ (state$ | async)?.approvalNarrativeLengthAvg }} chars avg
              </span>
            </div>

            <div class="a-metric">
              <label>AVERAGE CEREMONY DURATION</label>
              <span class="v" [class.danger]="((state$ | async)?.ceremonyDurationAvg ?? 0) < 10">
                {{ (state$ | async)?.ceremonyDurationAvg }} seconds
              </span>
            </div>

            <div class="a-metric">
              <label>REPEATED APPROVERS</label>
              <span class="v" [class.danger]="((state$ | async)?.repeatedApproversCount ?? 0) > 2">
                {{ (state$ | async)?.repeatedApproversCount }} operators
              </span>
            </div>
          </div>

          <div class="audit-ledger">
            <label>RECENT AUDIT CERTIFICATES</label>
            <div class="audit-row" *ngIf="!(state$ | async)?.ritualDecayed">
              <span class="time">Just now</span>
              <span class="event">Ceremony verified: Operator justification exceeded min character limits.</span>
            </div>
            <div class="audit-row warning" *ngIf="(state$ | async)?.ritualDecayed">
              <span class="time">Active</span>
              <span class="event">Ritual erosion: approvals authorized in &lt; 2 seconds.</span>
            </div>
            <div class="audit-row">
              <span class="time">1d ago</span>
              <span class="event">HSM Key Rotation Ceremony: Multi-party keys validated.</span>
            </div>
            <div class="audit-row">
              <span class="time">3d ago</span>
              <span class="event">Epoch 101 Transition audit: Baseline alignment passed.</span>
            </div>
          </div>
        </section>

      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 2rem; height: 100%; overflow-y: auto; box-sizing: border-box; }
    .page-header { margin-bottom: 2rem; }
    h1 { font-size: 1.3rem; font-weight: 800; margin: 0 0 0.5rem 0; color: #f3f4f6; }
    p { font-size: 0.85rem; color: #9ca3af; margin: 0; }

    .governance-layout { display: grid; grid-template-columns: 1fr 320px; gap: 1.5rem; }
    h3 { font-size: 0.7rem; font-weight: 800; color: #9ca3af; margin: 0 0 1.25rem 0; letter-spacing: 0.05em; text-transform: uppercase; }

    .timeline-panel { background: #090d16; border: 1px solid #111827; padding: 2rem; border-radius: 8px; }
    .timeline { display: flex; flex-direction: column; gap: 2rem; padding-left: 1rem; border-left: 2px solid #1f2937; margin-top: 1rem; }
    .timeline-item { position: relative; }
    .t-marker { position: absolute; left: -1.45rem; top: 4px; width: 10px; height: 10px; border-radius: 50%; background: #374151; border: 2px solid #090d16; }
    .active .t-marker { background: #10b981; box-shadow: 0 0 8px #10b981; }
    .failed .t-marker { background: #ef4444; box-shadow: 0 0 8px #ef4444; }

    .t-header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
    .epoch-id { font-family: 'JetBrains Mono'; font-weight: 800; font-size: 0.85rem; color: #f3f4f6; }
    .status-tag { font-size: 0.55rem; font-weight: 900; padding: 2px 6px; border-radius: 2px; }
    .status-tag.ACTIVE { background: #064e3b; color: #10b981; }
    .status-tag.FAILED { background: #7f1d1d; color: #fca5a5; }
    .status-tag.ARCHIVED { background: #1f2937; color: #9ca3af; }
    .t-desc { font-size: 0.8rem; color: #cbd5e1; margin-bottom: 0.5rem; }
    .t-meta { font-size: 0.65rem; color: #4b5563; font-family: 'JetBrains Mono'; }

    .audit-panel { background: #090d16; border: 1px solid #111827; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; border-radius: 8px; }
    .audit-header { display: flex; justify-content: space-between; align-items: baseline; }
    .audit-tag { font-size: 0.6rem; font-weight: 900; padding: 2px 6px; border-radius: 2px; }
    .audit-tag.ok { color: #10b981; border: 1px solid #064e3b; background: rgba(16, 185, 129, 0.05); }
    .audit-tag.warn { color: #ef4444; border: 1px solid #7f1d1d; background: rgba(239, 68, 68, 0.05); animation: flash 1s infinite alternate; }
    .audit-desc { font-size: 0.7rem; color: #64748b; line-height: 1.4; margin: 0; }

    .decay-warning { background: rgba(239, 68, 68, 0.05); border: 1px solid #7f1d1d; padding: 1rem; border-radius: 6px; }
    .decay-warning h4 { font-size: 0.75rem; font-weight: 900; color: #ef4444; margin: 0 0 0.25rem 0; }
    .decay-warning p { font-size: 0.7rem; color: #fca5a5; margin: 0; line-height: 1.4; }

    .audit-metrics { display: flex; flex-direction: column; gap: 1rem; border-bottom: 1px solid #1f2937; padding-bottom: 1.25rem; }
    .a-metric { display: flex; flex-direction: column; gap: 0.25rem; }
    .a-metric label { font-size: 0.55rem; font-weight: 800; color: #4b5563; }
    .a-metric .v { font-size: 0.85rem; font-family: 'JetBrains Mono'; font-weight: 700; color: #cbd5e1; }
    .a-metric .v.danger { color: #ef4444; }

    .audit-ledger { display: flex; flex-direction: column; gap: 0.75rem; }
    .audit-ledger label { font-size: 0.55rem; font-weight: 800; color: #4b5563; margin-bottom: 0.25rem; }
    .audit-row { font-size: 0.65rem; color: #9ca3af; display: flex; gap: 0.75rem; padding-bottom: 0.5rem; border-bottom: 1px solid #1f2937; }
    .audit-row .time { color: #4b5563; font-weight: 700; flex-shrink: 0; }
    .audit-row.warning { color: #fca5a5; }

    .flash-border { animation: borderFlash 1.5s infinite alternate; }

    @keyframes flash {
      from { opacity: 0.4; }
      to { opacity: 1; }
    }
    @keyframes borderFlash {
      from { border-color: #111827; }
      to { border-color: #ef4444; }
    }
  `]
})
export class GovernanceRegistryComponent {
  private stewardship = inject(StewardshipService);
  state$ = this.stewardship.state$;
}

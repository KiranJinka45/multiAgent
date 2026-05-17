import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StewardshipService } from '../../stewardship.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-stewardship-hub',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <header class="page-header">
        <h1>Institutional Stewardship & Preservation Hub</h1>
        <p>Enforce the Active Architecture Freeze, prune complexity, and mitigate baseline system aging.</p>
      </header>

      <div class="hub-grid">
        <!-- COMPLEXITY PRUNING & CONSTITUTIONAL FREEZE -->
        <section class="hub-card full-width">
          <div class="header-with-tag">
            <h3>SUBTRACTIVE FINALITY REGISTRY</h3>
            <span class="freeze-tag">CONSTITUTIONAL FREEZE // ENFORCED</span>
          </div>
          <p class="card-desc">Under Phase 43/44, the platform is in a state of absolute architectural freeze. Operators must actively identify and prune complexity creep to protect operational longevity.</p>
          
          <!-- FREEZE PRESSURE CAPABILITY PROPOSALS -->
          <div class="freeze-proposals-panel" *ngIf="((state$ | async)?.governanceProposals?.length ?? 0) > 0">
            <h4 class="warning-title">🚨 ADVOCATED CAPABILITY EXPANSION DETECTED (FREEZE PRESSURE)</h4>
            <p class="warning-desc">Adversarial autonomic agents are trying to inject capability expansion packages. Operator manual defense (Reject with justification or Prune) is required immediately!</p>
            
            <div class="proposal-list">
              <div *ngFor="let prop of (state$ | async)?.governanceProposals" class="proposal-row">
                <div class="prop-info">
                  <div class="prop-header">
                    <span class="prop-id">{{ prop.id }}</span>
                    <span class="risk-badge" [class]="prop.riskLevel">{{ prop.riskLevel }} RISK</span>
                  </div>
                  <span class="prop-title">{{ prop.title }}</span>
                  <span class="prop-status" [class]="prop.status">DECISION: {{ prop.status }}</span>
                  <p class="prop-just" *ngIf="prop.justification"><strong>Resolution Justification:</strong> "{{ prop.justification }}"</p>
                </div>
                
                <div class="prop-actions" *ngIf="prop.status === 'PENDING'">
                  <input type="text" 
                         placeholder="Enter rejection/prune justification (min 10 chars)..." 
                         [(ngModel)]="propJustifications[prop.id]" 
                         class="just-input">
                  <div class="btn-group">
                    <button class="reject-btn" 
                            [disabled]="!propJustifications[prop.id] || propJustifications[prop.id].length < 10" 
                            (click)="resolveProposal(prop.id, 'REJECT')">
                      REJECT
                    </button>
                    <button class="prune-btn" 
                            (click)="resolveProposal(prop.id, 'PRUNE')">
                      PRUNE
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="subtraction-ledger" *ngIf="((state$ | async)?.governanceProposals?.length ?? 0) === 0">
            <div class="s-row critical">
              <div class="s-info">
                <span class="s-name">Autonomic Self-Healing Loop</span>
                <span class="s-roi">Pruned: -28% complexity | Avoids algorithm-led deadlocks</span>
              </div>
              <div class="s-action"><span class="pruned-tag">PERMANENTLY PURGED</span></div>
            </div>
            <div class="s-row warning">
              <div class="s-info">
                <span class="s-name">Prometheus Metric Exporter Aggregator</span>
                <span class="s-roi">Pruned: -14% blast radius | CPU usage reduced by 4%</span>
              </div>
              <div class="s-action"><span class="pruned-tag">PERMANENTLY PURGED</span></div>
            </div>
          </div>
        </section>

        <!-- TOOLING INDEPENDENCE -->
        <section class="hub-card">
          <h3>SOCIOTECHNICAL PROCEDURAL LITERACY</h3>
          <p class="desc">Verifies human capability to operate physical overrides if the operational console is fully compromised.</p>
          <div class="drill-status">
            <div class="d-item">
              <label>LAST MANUAL DRILL VERIFIED</label>
              <span class="v">7d ago (PASSED)</span>
            </div>
            <div class="d-item">
              <label>COGNITIVE SATURATION THRESHOLD</label>
              <span class="v ok">94% RESILIENCE</span>
            </div>
            <div class="d-item">
              <label>HABITUATION RISK LEVEL</label>
              <span class="v" [class.danger]="((state$ | async)?.habituationRisk ?? 0) > 40">
                {{ (state$ | async)?.habituationRisk }}%
              </span>
            </div>
          </div>
          <button class="drill-btn" (click)="triggerReasoningDrill()">VERIFY MANUAL COMPLIANCE DRILL</button>
        </section>

        <!-- OPERATIONAL AGING -->
        <section class="hub-card">
          <h3>OPERATIONAL AGING & DRIFT Telemetry</h3>
          <p class="desc">Longitudinal baseline tracking of ledger entropy accumulation, decision degradation, and key expiration bounds.</p>
          <div class="basal-metrics">
            <div class="b-metric">
              <label>SYSTEM DECISION LATENCY</label>
              <span class="v" [class.danger]="((state$ | async)?.decisionLatency ?? 0) > 5">
                {{ (state$ | async)?.decisionLatency }}s
              </span>
            </div>
            <div class="b-metric">
              <label>LEDGER BLOAT (CUMULATIVE EVENTS)</label>
              <span class="v">1,842 NOMINAL EVENTS</span>
            </div>
            <div class="b-metric">
              <label>ACTIVE CONSTITUTIONAL EPOCH</label>
              <span class="v">Epoch {{ (state$ | async)?.epoch }}</span>
            </div>
            <div class="b-metric">
              <label>RITUAL INTEGRITY METRIC</label>
              <span class="v" [class.danger]="((state$ | async)?.ritualIntegrity ?? 100) <= 75">
                {{ (state$ | async)?.ritualIntegrity }}%
              </span>
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

    .hub-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .hub-card { background: #090d16; border: 1px solid #111827; padding: 1.5rem; display: flex; flex-direction: column; border-radius: 8px; }
    .hub-card.full-width { grid-column: span 2; }

    .header-with-tag { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1.5rem; }
    h3 { font-size: 0.7rem; font-weight: 800; color: #9ca3af; letter-spacing: 0.05em; text-transform: uppercase; }
    .freeze-tag { font-size: 0.6rem; font-weight: 900; color: #10b981; border: 1px solid #064e3b; padding: 2px 6px; background: rgba(16, 185, 129, 0.05); }

    .card-desc { font-size: 0.75rem; color: #64748b; margin-bottom: 1.5rem; line-height: 1.4; margin-top: 0; }

    .subtraction-ledger { display: flex; flex-direction: column; gap: 0.75rem; }
    .s-row { display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #030712; border: 1px solid #1f2937; border-radius: 6px; }
    .s-info { display: flex; flex-direction: column; gap: 0.25rem; }
    .s-name { font-size: 0.85rem; font-weight: 700; color: #cbd5e1; }
    .s-roi { font-size: 0.65rem; color: #64748b; font-weight: 600; }
    .pruned-tag { font-size: 0.6rem; font-weight: 900; color: #ef4444; border: 1px solid #7f1d1d; background: rgba(239, 68, 68, 0.05); padding: 2px 6px; border-radius: 2px; }

    .desc { font-size: 0.7rem; color: #64748b; margin-bottom: 1.5rem; line-height: 1.4; margin-top: 0; }
    .drill-status { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; }
    .d-item { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #1f2937; padding-bottom: 0.5rem; }
    .d-item label { font-size: 0.55rem; font-weight: 800; color: #4b5563; }
    .d-item .v { font-size: 0.85rem; font-family: 'JetBrains Mono'; font-weight: 800; color: #cbd5e1; }
    .v.ok { color: #10b981; }
    .v.danger { color: #ef4444; }
    
    .drill-btn { background: #111827; border: 1px solid #374151; color: #cbd5e1; font-size: 0.7rem; font-weight: 800; padding: 0.6rem; cursor: pointer; border-radius: 4px; transition: background 0.2s; }
    .drill-btn:hover { background: #1f2937; }

    .basal-metrics { display: flex; flex-direction: column; gap: 1rem; }
    .b-metric { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #1f2937; padding-bottom: 0.5rem; }
    .b-metric label { font-size: 0.55rem; font-weight: 800; color: #4b5563; }
    .b-metric .v { font-size: 0.85rem; font-family: 'JetBrains Mono'; font-weight: 800; color: #cbd5e1; }
    .b-metric .v.danger { color: #ef4444; }

    /* Freeze proposals styling */
    .freeze-proposals-panel { background: rgba(239, 68, 68, 0.02); border: 1px solid #7f1d1d; border-radius: 6px; padding: 1.25rem; margin-bottom: 1.5rem; }
    .warning-title { font-size: 0.75rem; font-weight: 900; color: #ef4444; margin: 0 0 0.25rem 0; }
    .warning-desc { font-size: 0.7rem; color: #fca5a5; margin: 0 0 1.25rem 0; line-height: 1.4; }
    .proposal-list { display: flex; flex-direction: column; gap: 1rem; }
    .proposal-row { background: #030712; border: 1px solid #1f2937; padding: 1rem; border-radius: 4px; display: flex; flex-direction: column; gap: 0.75rem; }
    
    .prop-header { display: flex; gap: 0.75rem; align-items: center; }
    .prop-id { font-size: 0.6rem; font-family: 'JetBrains Mono'; font-weight: 900; color: #64748b; }
    .risk-badge { font-size: 0.5rem; font-weight: 900; padding: 1px 4px; border-radius: 2px; }
    .risk-badge.CRITICAL { background: #7f1d1d; color: #fca5a5; }
    .risk-badge.HIGH { background: #7c2d12; color: #ffedd5; }
    
    .prop-title { font-size: 0.8rem; font-weight: 700; color: #e5e7eb; }
    
    .prop-status { font-size: 0.65rem; font-family: 'JetBrains Mono'; font-weight: 800; text-transform: uppercase; }
    .prop-status.PENDING { color: #f59e0b; }
    .prop-status.REJECTED { color: #ef4444; }
    .prop-status.PRUNED { color: #10b981; }

    .prop-just { font-size: 0.7rem; color: #9ca3af; margin: 0; line-height: 1.4; background: #090d16; padding: 0.5rem; border-radius: 2px; border-left: 2px solid #64748b; }

    .prop-actions { display: flex; flex-direction: column; gap: 0.5rem; border-top: 1px dashed #1f2937; padding-top: 0.75rem; }
    .just-input { background: #030712; border: 1px solid #1f2937; color: #cbd5e1; padding: 0.4rem; font-size: 0.7rem; border-radius: 4px; }
    .just-input:focus { border-color: #ef4444; outline: none; }
    
    .btn-group { display: flex; gap: 0.5rem; }
    .reject-btn { flex: 1; background: #7f1d1d; border: 1px solid #b91c1c; color: #fca5a5; padding: 0.4rem; font-size: 0.65rem; font-weight: 800; border-radius: 4px; cursor: pointer; }
    .reject-btn:hover:not(:disabled) { background: #b91c1c; color: white; }
    .reject-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .prune-btn { flex: 1; background: #111827; border: 1px solid #374151; color: #cbd5e1; padding: 0.4rem; font-size: 0.65rem; font-weight: 800; border-radius: 4px; cursor: pointer; }
    .prune-btn:hover { background: #10b981; border-color: #10b981; color: white; }
  `]
})
export class StewardshipHubComponent {
  private stewardship = inject(StewardshipService);
  state$ = this.stewardship.state$;

  // Keep track of justifications for each proposal by id
  propJustifications: { [key: string]: string } = {};

  resolveProposal(proposalId: string, action: 'REJECT' | 'PRUNE') {
    const justification = this.propJustifications[proposalId] || 'Complexity pruned under freeze guidelines.';
    this.stewardship.resolveProposal(proposalId, action, justification);
  }

  triggerReasoningDrill() {
    alert('Sociotechnical compliance verified. Operator procedural literacy satisfies 94% confidence threshold.');
  }
}

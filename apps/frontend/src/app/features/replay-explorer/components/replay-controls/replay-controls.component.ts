import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SreDataService } from '../../core/services/sre-data.service';
import { RollbackImpactPanelComponent } from '../rollback-impact-panel/rollback-impact-panel.component';
import { RollbackImpactAssessment } from '@packages/contracts';

@Component({
  selector: 'app-replay-controls',
  standalone: true,
  imports: [CommonModule, RollbackImpactPanelComponent],
  template: `
    <div class="replay-controls-host">
      <div class="control-header">
        <span class="label">Replay Controller</span>
        <span class="mode-badge">Deterministic</span>
      </div>

      <div class="traversal-unit">
        <div class="unit-label">Sequence Traversal</div>
        <div class="button-group">
          <button class="traversal-btn" title="Previous Entry">←</button>
          <button class="traversal-btn" title="Next Entry">→</button>
        </div>
      </div>

      <div class="safety-checkpoint">
        <div class="checkpoint-label">Rollback Boundary</div>
        <div class="checkpoint-card" [class.unstable]="isTrustDegraded()">
          <div class="dim">Target Entry:</div>
          <div class="value mono">#452 (Verified)</div>
          
          <div class="safety-metrics">
            <div class="safety-row">
              <span class="dim">Blast Radius:</span>
              <span class="value">Isolated</span>
            </div>
            <div class="safety-row">
              <span class="dim">Authority State:</span>
              <span class="value" [class.degraded]="isTrustDegraded()">
                {{ getAuthorityReason() }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Phase 5: Impact Assessment Panel -->
      <app-rollback-impact-panel [impact]="impactAssessment()"></app-rollback-impact-panel>

      <div class="action-zone">
        <button 
          class="op-button primary full-width" 
          [class.prohibited]="isRestorationProhibited()"
          [disabled]="isRestorationProhibited()">
          {{ getActionLabel() }}
        </button>
        <div class="safety-hint" [class.warning]="isTrustDegraded()">
          {{ getSafetyHint() }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .replay-controls-host {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .control-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .control-header .label {
      font-size: 0.6875rem;
      font-weight: 800;
      color: hsl(var(--text-dim));
      text-transform: uppercase;
    }

    .mode-badge {
      font-size: 0.5625rem;
      font-weight: 700;
      padding: 0.125rem 0.375rem;
      background: hsl(var(--status-recovering) / 0.1);
      color: hsl(var(--status-recovering));
      border: 1px solid hsl(var(--status-recovering) / 0.2);
      border-radius: 2px;
      text-transform: uppercase;
    }

    .traversal-unit {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .unit-label, .checkpoint-label {
      font-size: 0.625rem;
      font-weight: 700;
      color: hsl(var(--text-dim));
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .button-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }

    .traversal-btn {
      background: hsl(var(--bg-elevated));
      border: 1px solid hsl(var(--border-muted));
      color: hsl(var(--text-main));
      padding: 0.75rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1.25rem;
    }

    .checkpoint-card {
      margin-top: 0.75rem;
      padding: 0.75rem;
      background: hsl(var(--bg-app));
      border: 1px solid hsl(var(--border-muted));
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .checkpoint-card.unstable { border-color: hsl(var(--trust-untrusted) / 0.5); }

    .checkpoint-card .value { font-size: 0.8125rem; }

    .safety-metrics {
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid hsl(var(--border-muted) / 0.5);
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .safety-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.625rem;
    }

    .safety-row .degraded { color: hsl(var(--trust-untrusted)); }

    .full-width { width: 100%; }

    .safety-hint {
      margin-top: 0.75rem;
      font-size: 0.625rem;
      color: hsl(var(--text-dim));
      font-style: italic;
      text-align: center;
      line-height: 1.4;
    }

    .safety-hint.warning { color: hsl(var(--trust-untrusted)); }
  `]
})
export class ReplayControlsComponent {
  private sre = inject(SreDataService);

  public metrics = computed(() => this.sre.evidenceChain()?.metrics);
  public verificationState = computed(() => this.sre.evidenceChain()?.verificationState || 'unknown');
  public impactAssessment = signal<RollbackImpactAssessment | null>(null);

  isTrustDegraded() {
    const state = this.verificationState();
    return state === 'untrusted' || state === 'degraded';
  }

  isEvidenceIncomplete() {
    const m = this.metrics();
    return m && m.evidenceCompleteness < 1.0;
  }

  isRestorationProhibited() {
    const impact = this.impactAssessment();
    return this.verificationState() === 'untrusted' || 
           (impact && !impact.isSafe) || 
           !this.sre.evidenceChain();
  }

  getAuthorityReason() {
    const state = this.verificationState();
    if (state === 'degraded') return 'Signer Revoked';
    if (state === 'untrusted') return 'Integrity Failure';
    if (this.isEvidenceIncomplete()) return 'Partial Evidence';
    return 'Authorized';
  }

  getActionLabel() {
    if (this.isRestorationProhibited()) return 'Restoration Prohibited';
    if (this.isEvidenceIncomplete()) return 'Conditional Restoration';
    return 'Propose Restoration';
  }

  getSafetyHint() {
    const state = this.verificationState();
    if (state === 'untrusted') return 'Forensic chain corruption detected. Rollback disabled.';
    if (state === 'degraded') return 'Recovery blocked pending governance re-attestation.';
    if (this.isEvidenceIncomplete()) return 'Recovery confidence reduced due to incomplete dependency evidence.';
    return 'Restoration requires N=3 consensus and active trust epoch validation.';
  }
}

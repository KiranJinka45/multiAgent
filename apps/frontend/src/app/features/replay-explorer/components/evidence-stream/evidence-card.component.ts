import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvidenceEntry, EventCategory } from '@packages/contracts';

@Component({
  selector: 'app-evidence-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="evidence-card" [class]="entry.integrity.verificationState">
      <div class="card-header-internal">
        <div class="left">
          <span class="category-badge">{{ entry.category }}</span>
          <span class="seq mono">#{{ entry.sequence }}</span>
        </div>
        <div class="right">
          <span class="timestamp mono">{{ entry.timestamp | date:'HH:mm:ss.SSS' }}</span>
          <div class="verification-pill" [attr.data-state]="entry.integrity.verificationState">
            {{ entry.integrity.verificationState }}
          </div>
        </div>
      </div>

      <div class="card-body">
        <div class="confidence-surface">
          <div class="conf-item" [class.warn]="entry.integrity.verificationState !== 'verified'">
            <span class="label">Structure</span>
            <span class="dot"></span>
          </div>
          <div class="conf-item" [class.warn]="entry.integrity.verificationState === 'degraded'">
            <span class="label">Authority</span>
            <span class="dot"></span>
          </div>
          <div class="conf-item" [class.warn]="entry.payload?.dependency_health === 'MISSING'">
            <span class="label">Completeness</span>
            <span class="dot"></span>
          </div>
        </div>

        <div class="description" [class.dim]="entry.payload?.dependency_health === 'MISSING'">
          <span *ngIf="entry.payload?.dependency_health === 'MISSING'">[Partial Telemetry] </span>
          {{ getSummary() }}
        </div>

        <div class="causal-lineage" *ngIf="entry.causality">
          <span class="dim">Linked to:</span>
          <span class="link-id mono">{{ entry.causality.parentEventId | slice:0:8 }}</span>
          <span class="link-type">[{{ entry.causality.linkType }}]</span>
        </div>
      </div>

      <div class="card-footer-internal">
        <div class="attribution">
          <span class="dim">Signer:</span>
          <span class="value" [class.revoked]="entry.integrity.verificationState === 'degraded'">
            {{ entry.integrity.signature?.signerId || 'Unknown' }}
            <span *ngIf="entry.integrity.verificationState === 'degraded'">(Revoked)</span>
          </span>
        </div>
        <div class="integrity-meta">
          <span class="dim">Hash:</span>
          <span class="value mono">{{ entry.integrity.hash | slice:0:12 }}...</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .evidence-card {
      background: hsl(var(--bg-surface));
      border: 1px solid hsl(var(--border-muted));
      border-left: 4px solid transparent;
      margin-bottom: 0.75rem;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .evidence-card.verified { border-left-color: hsl(var(--trust-verified)); }
    .evidence-card.degraded { border-left-color: hsl(var(--trust-partial)); }
    .evidence-card.untrusted { border-left-color: hsl(var(--trust-untrusted)); }

    .card-header-internal {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .card-header-internal .left, .card-header-internal .right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .category-badge {
      font-size: 0.625rem;
      font-weight: 800;
      color: hsl(var(--text-main));
      background: hsl(var(--bg-elevated));
      padding: 0.125rem 0.375rem;
      border-radius: 2px;
      text-transform: uppercase;
    }

    .seq {
      font-size: 0.6875rem;
      color: hsl(var(--text-dim));
    }

    .timestamp {
      font-size: 0.6875rem;
      color: hsl(var(--text-dim));
    }

    .verification-pill {
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.125rem 0.375rem;
      border-radius: 2px;
    }

    .verification-pill[data-state="verified"] { color: hsl(var(--trust-verified)); }
    .verification-pill[data-state="degraded"] { color: hsl(var(--trust-partial)); }
    .verification-pill[data-state="untrusted"] { color: hsl(var(--trust-untrusted)); }

    .confidence-surface {
      display: flex;
      gap: 1rem;
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid hsl(var(--border-muted) / 0.3);
    }

    .conf-item {
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    .conf-item .label {
      font-size: 0.5625rem;
      font-weight: 700;
      color: hsl(var(--text-dim));
      text-transform: uppercase;
    }

    .conf-item .dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: hsl(var(--trust-verified));
    }

    .conf-item.warn .dot { background: hsl(var(--trust-partial)); }
    .conf-item.warn .label { color: hsl(var(--text-main)); }

    .card-body .description {
      font-size: 0.875rem;
      color: hsl(var(--text-main));
      line-height: 1.4;
    }

    .card-body .description.dim { color: hsl(var(--text-dim)); font-style: italic; }

    .causal-lineage {
      margin-top: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.6875rem;
      background: hsl(var(--bg-app));
      padding: 0.375rem 0.625rem;
      border-radius: 2px;
    }

    .link-id { color: hsl(var(--primary)); }
    .link-type { color: hsl(var(--text-dim)); font-weight: 600; text-transform: uppercase; }

    .card-footer-internal {
      display: flex;
      justify-content: space-between;
      padding-top: 0.5rem;
      border-top: 1px solid hsl(var(--border-muted) / 0.5);
    }

    .attribution, .integrity-meta {
      display: flex;
      gap: 0.375rem;
      font-size: 0.625rem;
    }

    .attribution .value, .integrity-meta .value {
      color: hsl(var(--text-dim));
    }

    .attribution .value.revoked { color: hsl(var(--trust-partial)); font-weight: 600; }
  `]
})
export class EvidenceCardComponent {
  @Input() entry!: EvidenceEntry;

  getSummary() {
    // Dynamic summary based on category
    if (this.entry.category === EventCategory.HEAL) {
      return `Recovery initiated: ${this.entry.payload['action'] || 'Unknown Remediation'}`;
    }
    if (this.entry.category === EventCategory.DECISION) {
      return `Governance decision: ${this.entry.payload['decision'] || 'System Consensus'}`;
    }
    return this.entry.payload['summary'] || 'Standard operational observation recorded.';
  }
}

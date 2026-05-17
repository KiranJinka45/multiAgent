import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-trust-rail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="trust-rail" [class.untrusted]="state === 'untrusted'">
      <div class="trust-identity">
        <span class="institutional-label">Forensic Reality Status</span>
        <div class="trust-badge" [attr.data-state]="state">
          {{ state | uppercase }}
        </div>
      </div>

      <div class="trust-metrics" *ngIf="metrics">
        <div class="metric">
          <span class="label">Chain Integrity</span>
          <span class="value">{{ (metrics.chainIntegrityRate * 100).toFixed(0) }}%</span>
        </div>
        <div class="metric">
          <span class="label">Authority Health</span>
          <span class="value" [class.degraded]="metrics.epochTrustValidity < 1.0">
            {{ (metrics.epochTrustValidity * 100).toFixed(0) }}%
          </span>
        </div>
        <div class="metric">
          <span class="label">Quorum</span>
          <span class="value">{{ governance()?.quorum || 'Pending' }}</span>
        </div>
        <div class="metric">
          <span class="label">Epoch</span>
          <span class="value mono">{{ governance()?.epoch || 'Unknown' }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .trust-rail {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.25rem;
      background: hsl(var(--bg-elevated));
      border-bottom: 2px solid hsl(var(--border-strong));
      height: 48px;
    }

    .trust-identity {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .institutional-label {
      font-size: 0.625rem;
      font-weight: 800;
      color: hsl(var(--text-dim));
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .trust-badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.75rem;
      border-radius: 2px;
      letter-spacing: 0.05em;
    }

    .trust-badge[data-state="verified"] {
      background: hsl(var(--trust-verified) / 0.15);
      color: hsl(var(--trust-verified));
      border: 1px solid hsl(var(--trust-verified) / 0.3);
    }

    .trust-badge[data-state="degraded"] {
      background: hsl(var(--trust-partial) / 0.15);
      color: hsl(var(--trust-partial));
      border: 1px solid hsl(var(--trust-partial) / 0.3);
    }

    .trust-badge[data-state="untrusted"] {
      background: hsl(var(--trust-untrusted) / 0.15);
      color: hsl(var(--trust-untrusted));
      border: 1px solid hsl(var(--trust-untrusted) / 0.3);
    }

    .trust-metrics {
      display: flex;
      gap: 2rem;
    }

    .metric {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .metric .label {
      font-size: 0.5625rem;
      font-weight: 600;
      color: hsl(var(--text-dim));
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }

    .metric .value {
      font-size: 0.75rem;
      font-weight: 500;
      color: hsl(var(--text-main));
    }

    .metric .value.degraded { color: hsl(var(--trust-partial)); }
  `]
})
export class TrustRailComponent {
  private sre = inject(SreDataService);

  @Input() state: string = 'unknown';
  @Input() metrics: any = null;

  public governance = this.sre.governanceContext;
}

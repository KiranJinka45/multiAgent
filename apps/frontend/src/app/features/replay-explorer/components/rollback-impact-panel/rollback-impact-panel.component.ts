import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RollbackImpactAssessment } from '@packages/contracts';

@Component({
  selector: 'app-rollback-impact-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="impact-panel" *ngIf="impact">
      <div class="panel-header">
        <span class="title">Restoration Impact Assessment</span>
        <span class="status-badge" [attr.data-recommendation]="impact.recommendation">
          {{ impact.recommendation }}
        </span>
      </div>

      <div class="impact-body">
        <div class="violation-list" *ngIf="impact.violatedInvariants.length > 0">
          <div class="section-title">Safety Violations</div>
          <div class="violation-item" *ngFor="let v of impact.violatedInvariants">
            <span class="icon">⚠️</span>
            <span class="text">{{ v }}</span>
          </div>
        </div>

        <div class="dependency-grid">
          <div class="section-title">Dependency Health</div>
          <div class="dep-item" *ngFor="let dep of objectKeys(impact.dependencyHealth)">
            <span class="dep-name">{{ dep }}</span>
            <span class="dep-status" [attr.data-status]="impact.dependencyHealth[dep]">
              {{ impact.dependencyHealth[dep] }}
            </span>
          </div>
        </div>

        <div class="blast-radius">
          <div class="section-title">Impacted Nodes (Blast Radius)</div>
          <div class="node-list">
            <span class="node-tag" *ngFor="let node of impact.blastRadiusNodes">{{ node }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .impact-panel {
      background: hsl(var(--bg-card));
      border: 1px solid hsl(var(--border-strong));
      border-radius: 4px;
      padding: 1rem;
      margin-top: 1rem;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid hsl(var(--border-muted));
    }

    .panel-header .title {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: hsl(var(--text-main));
    }

    .status-badge {
      font-size: 0.625rem;
      font-weight: 800;
      padding: 0.25rem 0.5rem;
      border-radius: 2px;
    }

    .status-badge[data-recommendation="PROHIBITED"] {
      background: hsl(var(--trust-untrusted) / 0.15);
      color: hsl(var(--trust-untrusted));
    }

    .status-badge[data-recommendation="PROCEED"] {
      background: hsl(var(--trust-verified) / 0.15);
      color: hsl(var(--trust-verified));
    }

    .section-title {
      font-size: 0.625rem;
      font-weight: 700;
      color: hsl(var(--text-dim));
      text-transform: uppercase;
      margin-bottom: 0.5rem;
      margin-top: 1rem;
    }

    .violation-item {
      display: flex;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: hsl(var(--trust-untrusted));
      margin-bottom: 0.25rem;
    }

    .dependency-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }

    .dep-item {
      display: flex;
      justify-content: space-between;
      padding: 0.375rem;
      background: hsl(var(--bg-main));
      border-radius: 2px;
      font-size: 0.6875rem;
    }

    .dep-status[data-status="HEALTHY"] { color: hsl(var(--trust-verified)); }
    .dep-status[data-status="MISSING"] { color: hsl(var(--trust-partial)); }

    .node-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    .node-tag {
      font-size: 0.625rem;
      font-family: var(--font-mono);
      padding: 0.125rem 0.375rem;
      background: hsl(var(--bg-elevated));
      border: 1px solid hsl(var(--border-muted));
      border-radius: 2px;
      color: hsl(var(--text-dim));
    }
  `]
})
export class RollbackImpactPanelComponent {
  @Input() impact: RollbackImpactAssessment | null = null;

  objectKeys(obj: any) {
    return Object.keys(obj);
  }
}

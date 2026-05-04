import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScalingDecision } from '../../../core/services/admin.service';
import { LucideAngularModule, Info, ArrowUpRight, Clock } from 'lucide-angular';

@Component({
  selector: 'app-decision-explainability',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="explain-card glass" *ngIf="decision">
      <div class="explain-header">
        <lucide-icon name="info" class="icon-primary"></lucide-icon>
        <h4>Decision Analysis</h4>
      </div>
      <div class="reason-text">
        {{ decision.reason }}
      </div>
      <div class="metrics-grid" *ngIf="decision.metrics">
        <div class="metric-box">
          <span class="m-label">Velocity</span>
          <span class="m-val">+{{ decision.metrics.velocity | number:'1.1-1' }}/s</span>
        </div>
        <div class="metric-box">
          <span class="m-label">Accel</span>
          <span class="m-val">{{ decision.metrics.acceleration | number:'1.1-1' }}</span>
        </div>
        <div class="metric-box highlight">
          <span class="m-label">SLA Risk</span>
          <span class="m-val">{{ decision.metrics.predictedBreachS | number:'1.0-0' }}s</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .explain-card { padding: 1.5rem; border-radius: 16px; margin-top: 1rem; }
    .explain-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
    h4 { margin: 0; font-size: 0.9rem; color: #909094; text-transform: uppercase; }
    .reason-text { font-size: 0.9rem; color: #fff; line-height: 1.4; margin-bottom: 1.5rem; }
    .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
    .metric-box { display: flex; flex-direction: column; background: rgba(255, 255, 255, 0.03); padding: 0.8rem; border-radius: 8px; }
    .metric-box.highlight { background: rgba(0, 227, 253, 0.05); border: 1px solid rgba(0, 227, 253, 0.2); }
    .m-label { font-size: 0.7rem; color: #666; text-transform: uppercase; }
    .m-val { font-size: 1rem; font-weight: 700; color: #fff; margin-top: 0.2rem; }
    .highlight .m-val { color: #00e3fd; }
  `]
})
export class DecisionExplainabilityComponent {
  @Input() decision!: ScalingDecision;
}

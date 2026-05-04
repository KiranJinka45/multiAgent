import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-metrics-grid',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="metrics-grid" *ngIf="metrics">
      <div class="metric-card card">
        <label>Active Workers</label>
        <div class="value-container">
          <div class="value" [class.text-warning]="metrics.activeWorkers >= metrics.totalWorkers">
            {{ metrics.activeWorkers }} / {{ metrics.totalWorkers }}
          </div>
        </div>
        <div class="progress-bar">
          <div class="fill" [style.width.%]="(metrics.activeWorkers / metrics.totalWorkers) * 100"></div>
        </div>
        <div class="slo-target">Target: < 90% utilization</div>
      </div>

      <div class="metric-card card">
        <label>Event Backbone PEL</label>
        <div class="value-container">
          <div class="value" [class.text-danger]="(metrics.events?.pelSize || 0) > 50">
            {{ metrics.events?.pelSize || 0 }}
          </div>
        </div>
        <div class="subtitle">Pending group messages</div>
        <div class="slo-target">SLA: < 25 events</div>
      </div>

      <div class="metric-card card">
        <label>E2E Event Latency</label>
        <div class="value-container">
          <div class="value" [class.text-warning]="(metrics.events?.latencyMs || 0) > 1000">
            {{ metrics.events?.latencyMs || 0 }}ms
          </div>
        </div>
        <div class="subtitle">Stream head to consumer</div>
        <div class="slo-target">SLA: < 500ms</div>
      </div>

      <div class="metric-card card">
        <label>DLQ Volume</label>
        <div class="value-container">
          <div class="value" [class.text-danger]="(metrics.events?.dlqSize || 0) > 0">
            {{ metrics.events?.dlqSize || 0 }}
          </div>
        </div>
        <div class="subtitle">Poison messages isolated</div>
        <div class="slo-target">GOAL: 0 messages</div>
      </div>
    </div>
  `,
  styles: [`
    .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
    .metric-card { padding: 24px; position: relative; overflow: hidden; background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; transition: all 0.3s ease; }
    .metric-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.3); border-color: rgba(255,255,255,0.15); }
    .metric-card label { display: block; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: #94a3b8; margin-bottom: 12px; }
    .metric-card .value { font-size: 1.75rem; font-weight: 700; color: #f8fafc; }
    .metric-card .subtitle { font-size: 0.8rem; color: #64748b; margin-top: 4px; }
    .value-container { display: flex; align-items: baseline; gap: 12px; }
    .slo-target { margin-top: 16px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; }
    .progress-bar { height: 6px; background: rgba(15,23,42,0.6); border-radius: 3px; margin-top: 16px; overflow: hidden; }
    .progress-bar .fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #60a5fa); border-radius: 3px; transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
    .text-danger { color: #f87171 !important; text-shadow: 0 0 10px rgba(239,68,68,0.3); }
    .text-warning { color: #fbbf24 !important; text-shadow: 0 0 10px rgba(251,191,36,0.3); }
  `]
})
export class MetricsGridComponent {
  @Input() metrics: any;
}

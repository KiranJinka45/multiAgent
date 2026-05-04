import { Component, computed, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'sre-post-action-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="panel-card" *ngIf="lastAction">
      <div class="panel-header">
        <label>POST-ACTION VERIFICATION</label>
        <div class="verification-badge" [class.verified]="verified">
          {{ verified ? 'REALITY CONVERGED' : 'DIVERGENCE PERSISTS' }}
        </div>
      </div>

      <div class="action-summary">
        <div class="action-type">{{ lastAction?.type }}</div>
        <div class="action-time">{{ lastAction?.timestamp | date:'HH:mm:ss' }}</div>
      </div>

      <div class="divergence-metric">
        <label>POST-ACTION DIVERGENCE</label>
        <div class="divergence-value" [class.critical]="divergenceMs > 60000">
          {{ (divergenceMs / 1000).toFixed(1) }}s
        </div>
      </div>

      <div class="rollback-status" *ngIf="rollbackTriggered">
        <span class="rollback-icon">🔄</span>
        <div class="rollback-details">
          <div class="rollback-title">AUTONOMOUS ROLLBACK TRIGGERED</div>
          <div class="rollback-reason">Persistent epistemic divergence detected (>60s).</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .panel-card {
      background: rgba(15, 23, 42, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 24px;
      margin-top: 24px;
    }
    .verification-badge {
      font-size: 10px;
      padding: 4px 10px;
      border-radius: 100px;
      background: rgba(239, 68, 68, 0.1);
      color: #fca5a5;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    .verification-badge.verified {
      background: rgba(16, 185, 129, 0.1);
      color: #6ee7b7;
      border-color: rgba(16, 185, 129, 0.2);
    }
    .action-summary { display: flex; justify-content: space-between; margin: 16px 0; }
    .action-type { font-weight: 700; font-size: 14px; font-family: 'JetBrains Mono', monospace; }
    .action-time { font-size: 12px; color: rgba(255, 255, 255, 0.4); }
    .divergence-value { font-size: 24px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
    .divergence-value.critical { color: #ef4444; animation: blink 1s infinite; }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .rollback-status { margin-top: 24px; padding: 16px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.2); display: flex; gap: 12px; }
    .rollback-icon { font-size: 20px; }
    .rollback-title { font-weight: 700; font-size: 12px; color: #fca5a5; }
    .rollback-reason { font-size: 11px; color: rgba(252, 165, 165, 0.6); margin-top: 4px; }
  `]
})
export class PostActionPanelComponent {
  @Input() lastAction: any = null;
  @Input() verified = false;
  @Input() divergenceMs = 0;
  @Input() rollbackTriggered = false;
}



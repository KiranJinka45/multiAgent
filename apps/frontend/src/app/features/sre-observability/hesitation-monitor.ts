import { Component, computed, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'sre-hesitation-monitor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="monitor-card" 
         [class.halting]="isHalted()" 
         [class.stabilizing]="isStabilizing()"
         [class.stuck]="isStuck()">
      
      <div class="status-header">
        <div class="pulse-indicator"></div>
        <div class="status-info">
          <span class="status-text">{{ mode.toUpperCase() }}</span>
          <span class="reason-type" *ngIf="isHalted()">{{ reasonType }}</span>
        </div>
      </div>

      <div class="reason-container">
        <label>HESTITATION REASON</label>
        <p class="reason-text">{{ reason || 'Monitoring nominal propagation...' }}</p>
      </div>

      <div class="metrics-grid">
        <div class="metric">
          <label>HOLD DURATION</label>
          <span class="value" [class.warning]="isStuck()">{{ formattedHoldTime() }}</span>
        </div>
        <div class="metric">
          <label>EXPECTED TTAC</label>
          <span class="value secondary">{{ (expectedTTAC / 1000).toFixed(0) }}s</span>
        </div>
      </div>

      <div class="progress-container">
        <div class="progress-bg">
          <div class="progress-bar" [style.width.%]="ttacProgress()"></div>
        </div>
      </div>

      <div class="epistemic-alert" *ngIf="isStuck()">
        <span class="alert-icon">⚠️</span>
        <div class="alert-content">
          <div class="alert-title">CRITICAL: EPISTEMIC STALL</div>
          <div class="alert-desc">Hold duration ({{ formattedHoldTime() }}) exceeds expected TTAC window. Manual intervention or escalation required.</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .monitor-card {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 24px;
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
    }
    .monitor-card.halting {
      border-color: rgba(245, 158, 11, 0.5);
      box-shadow: 0 0 20px rgba(245, 158, 11, 0.1);
    }
    .monitor-card.stabilizing {
      border-color: rgba(79, 70, 229, 0.5);
    }
    .status-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    .pulse-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #10b981;
    }
    .halting .pulse-indicator {
      background: #f59e0b;
      animation: pulse-amber 2s infinite;
    }
    @keyframes pulse-amber {
      0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); }
      100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
    }
    .status-text {
      font-weight: 700;
      letter-spacing: 0.1em;
      font-family: 'JetBrains Mono', monospace;
    }
    .reason-container { margin-bottom: 24px; }
    label { display: block; font-size: 10px; color: rgba(255, 255, 255, 0.4); margin-bottom: 8px; letter-spacing: 0.05em; }
    .reason-text { font-size: 14px; color: rgba(255, 255, 255, 0.9); font-weight: 500; }
    .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .value { font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 600; }
    .progress-bg { height: 4px; background: rgba(255, 255, 255, 0.05); border-radius: 2px; }
    .progress-bar { height: 100%; background: #4f46e5; border-radius: 2px; transition: width 0.3s ease; }
    .epistemic-alert { margin-top: 24px; padding: 12px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.2); color: #fca5a5; font-size: 12px; display: flex; gap: 10px; align-items: center; }
    
    .monitor-card.stuck { border-color: rgba(239, 68, 68, 0.5); background: rgba(69, 10, 10, 0.2); }
    .status-info { display: flex; flex-direction: column; }
    .reason-type { font-size: 10px; color: rgba(255, 255, 255, 0.4); font-family: 'JetBrains Mono', monospace; }
    .value.warning { color: #f87171; }
    .value.secondary { color: rgba(255, 255, 255, 0.4); }
    .progress-container { margin-top: 16px; }
    .alert-content { display: flex; flex-direction: column; gap: 2px; }
    .alert-title { font-weight: 700; color: #fca5a5; }
    .alert-desc { font-size: 11px; color: rgba(252, 165, 165, 0.7); }
  `]
})
export class HesitationMonitorComponent {
  @Input() mode: 'STABLE' | 'HALTED' | 'HEALING' | 'CHAOS_TEST' = 'STABLE';
  @Input() reason = '';
  @Input() reasonType: 'NO_QUORUM' | 'NO_DIVERSITY' | 'UNSTABLE_QUORUM' | 'LOW_CONFIDENCE' | 'POST_ACTION_DIVERGENCE' | 'NONE' = 'NONE';
  @Input() holdTimeMs = 0;
  @Input() expectedTTAC = 15000;

  isHalted = computed(() => this.mode === 'HALTED');
  isStabilizing = computed(() => this.mode === 'HEALING');
  isStuck = computed(() => this.holdTimeMs > this.expectedTTAC + 5000);

  formattedHoldTime() {
    const seconds = (this.holdTimeMs / 1000).toFixed(1);
    return `${seconds}s`;
  }

  ttacProgress() {
    return Math.min(100, (this.holdTimeMs / this.expectedTTAC) * 100);
  }
}



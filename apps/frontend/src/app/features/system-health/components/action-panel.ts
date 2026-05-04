import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-action-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="action-panel card">
      <div class="panel-header">
        <h3>Control Actions</h3>
        <span class="lockout-timer" *ngIf="lockout > 0">Locked: {{ lockout }}s</span>
      </div>
      <div class="action-grid">
        <button class="btn-action primary" (click)="recover.emit()" [disabled]="lockout > 0">
          <span class="icon">{{ states['RECOVER'] === 'DISPATCHED' ? '⏳' : '🔄' }}</span>
          {{ getActionLabel('RECOVER', states['RECOVER']) }}
        </button>
        <button class="btn-action secondary" (click)="replay.emit(false)" [disabled]="lockout > 0 || dlqSize === 0">
          <span class="icon">{{ states['REPLAY'] === 'DISPATCHED' ? '⏳' : '📤' }}</span>
          {{ getActionLabel('REPLAY', states['REPLAY']) }}
        </button>
        <button class="btn-action warning" (click)="setMode.emit('PROTECT')" [disabled]="lockout > 0 || mode === 'PROTECT' || mode === 'INCIDENT'">
          <span class="icon">{{ states['MODE'] === 'DISPATCHED' ? '⏳' : '🛡️' }}</span>
          {{ getActionLabel('MODE', states['MODE'], 'Shield Mode') }}
        </button>
        <button class="btn-action danger" (click)="drain.emit()" [disabled]="lockout > 0 || mode === 'INCIDENT'">
          <span class="icon">{{ states['DRAIN'] === 'DISPATCHED' ? '⏳' : '⚠️' }}</span>
          {{ getActionLabel('DRAIN', states['DRAIN'], 'Drain Fleet') }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .action-panel { padding: 24px; border-top: 4px solid #3b82f6; background: rgba(30, 41, 59, 0.4); border-radius: 12px; }
    .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .panel-header h3 { margin: 0; font-size: 1.125rem; font-weight: 600; color: #e2e8f0; }
    .lockout-timer { font-size: 0.75rem; color: #f87171; font-weight: 800; font-family: monospace; }
    .action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .btn-action { display: flex; align-items: center; justify-content: center; gap: 8px; background: #3b82f6; color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 12px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-action:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
    .btn-action:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(1); }
    .btn-action.secondary { background: rgba(255,255,255,0.05); color: #e2e8f0; }
    .btn-action.warning { background: #f59e0b; }
    .btn-action.danger { background: #ef4444; }
  `]
})
export class ActionPanelComponent {
  @Input() states: Record<string, string> = {};
  @Input() lockout = 0;
  @Input() dlqSize = 0;
  @Input() mode = 'NORMAL';

  @Output() recover = new EventEmitter<void>();
  @Output() replay = new EventEmitter<boolean>();
  @Output() setMode = new EventEmitter<string>();
  @Output() drain = new EventEmitter<void>();

  getActionLabel(key: string, state?: string, defaultLabel?: string): string {
    if (state === 'DISPATCHED') return 'Dispatching...';
    if (state === 'SUCCESS') return '✅ Completed';
    if (state === 'ERROR') return '❌ Failed';
    
    switch (key) {
      case 'RECOVER': return 'Force Recovery';
      case 'REPLAY': return 'Replay DLQ';
      default: return defaultLabel || 'Action';
    }
  }
}

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SreDataService } from '../../../core/services/sre-data.service';

@Component({
  selector: 'sre-operator-actions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-panel action-container">
      <label>OPERATOR ACTION LAYER</label>
      
      <div class="action-grid">
        <button class="action-btn" [class.pending]="pendingAction() === 'FORCE_HOLD'" (click)="onAction('FORCE_HOLD')">
          <span class="key">F1</span>
          <span class="label">FORCE HOLD</span>
        </button>
        
        <button class="action-btn" [class.pending]="pendingAction() === 'FORCE_RECONCILE'" (click)="onAction('FORCE_RECONCILE')">
          <span class="key">F2</span>
          <span class="label">RECONCILE</span>
        </button>
        
        <button class="action-btn warn" [class.pending]="pendingAction() === 'FREEZE_ADAPTATION'" (click)="onAction('FREEZE_ADAPTATION')">
          <span class="key">F3</span>
          <span class="label">FREEZE ADAPT</span>
        </button>
        
        <button class="action-btn critical" [class.pending]="pendingAction() === 'HALT_SYSTEM'" (click)="onAction('HALT_SYSTEM')">
          <span class="key">ESC</span>
          <span class="label">HARD HALT</span>
        </button>
      </div>

      <div class="audit-hint">
        All actions are audit-logged and broadcasted.
      </div>
    </div>
  `,
  styles: [`
    .action-container {
      padding: 24px;
      label { display: block; font-size: 10px; font-weight: 800; opacity: 0.4; letter-spacing: 0.1em; margin-bottom: 20px; }
    }
    .action-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      
      .key { font-family: 'JetBrains Mono'; font-size: 10px; opacity: 0.3; margin-bottom: 4px; }
      .label { font-size: 11px; font-weight: 800; }
      
      &:hover {
        background: rgba(255,255,255,0.08);
        border-color: rgba(255,255,255,0.2);
        transform: translateY(-1px);
      }
      
      &.pending {
        background: hsl(var(--primary) / 0.2);
        border-color: hsl(var(--primary));
        pointer-events: none;
      }
      
      &.warn:hover { border-color: hsl(var(--color-warning)); color: hsl(var(--color-warning)); }
      &.critical:hover { border-color: hsl(var(--color-critical)); color: hsl(var(--color-critical)); }
    }
    .audit-hint {
      margin-top: 20px;
      font-size: 9px;
      opacity: 0.3;
      text-align: center;
      font-style: italic;
    }
  `]
})
export class OperatorActions {
  private data = inject(SreDataService);
  public pendingAction = signal<string | null>(null);

  onAction(type: string) {
    if (this.pendingAction()) return;
    
    if (confirm(`Confirm Operator Intervention: ${type}?`)) {
      this.pendingAction.set(type);
      this.data.tune({ [type]: true } as any);
      console.log(`[SRE] Operator intervention: ${type}`);
      
      // Auto-reset pending state after 1s (Debounce/Visual Feedback)
      setTimeout(() => this.pendingAction.set(null), 1000);
    }
  }
}

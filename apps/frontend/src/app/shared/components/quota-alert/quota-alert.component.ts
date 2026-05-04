import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-quota-alert',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" *ngIf="show">
      <div class="quota-card">
        <div class="icon-header">
          <div class="warning-icon">⚡</div>
        </div>
        
        <h2>Daily Limit Reached</h2>
        <p class="reason">{{ reason || 'You\\'ve reached your daily mission quota.' }}</p>
        
        <div class="reset-timer" *ngIf="resetInMs">
          <span class="label">Resets in:</span>
          <span class="time">{{ formattedTime }}</span>
        </div>

        <div class="actions">
          <button class="btn-upgrade" (click)="onUpgrade()">Upgrade to Pro</button>
          <button class="btn-dismiss" (click)="onDismiss()">Maybe Later</button>
        </div>
        
        <p class="support-link" *ngIf="suggestedAction === 'SUPPORT'">
          Need help? <a href="#">Contact Support</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.3s ease-out;
    }

    .quota-card {
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      padding: 40px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      position: relative;
    }

    .icon-header {
      margin-bottom: 24px;
      display: flex;
      justify-content: center;
    }

    .warning-icon {
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      box-shadow: 0 0 20px rgba(217, 119, 6, 0.4);
    }

    h2 {
      color: #fff;
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 12px;
    }

    .reason {
      color: #94a3b8;
      font-size: 1rem;
      margin-bottom: 24px;
      line-height: 1.5;
    }

    .reset-timer {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 32px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .reset-timer .label {
      font-size: 0.75rem;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .reset-timer .time {
      font-size: 1.25rem;
      font-weight: 600;
      color: #fff;
      font-family: monospace;
    }

    .actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .btn-upgrade {
      background: linear-gradient(135deg, #8b5cf6, #6d28d9);
      color: #fff;
      border: none;
      padding: 14px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-upgrade:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(139, 92, 246, 0.4);
    }

    .btn-dismiss {
      background: transparent;
      color: #64748b;
      border: none;
      padding: 8px;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .btn-dismiss:hover {
      color: #94a3b8;
    }

    .support-link {
      margin-top: 24px;
      font-size: 0.875rem;
      color: #64748b;
    }

    .support-link a {
      color: #60a5fa;
      text-decoration: none;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class QuotaAlertComponent {
  @Input() show = false;
  @Input() reason = '';
  @Input() resetInMs?: number;
  @Input() suggestedAction?: string;
  
  @Output() dismiss = new EventEmitter<void>();
  @Output() upgrade = new EventEmitter<void>();

  get formattedTime(): string {
    if (!this.resetInMs) return '24h';
    const hours = Math.floor(this.resetInMs / (1000 * 60 * 60));
    const minutes = Math.floor((this.resetInMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  onDismiss() {
    this.dismiss.emit();
  }

  onUpgrade() {
    this.upgrade.emit();
  }
}

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-trace-log',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="event-log-card card">
      <div class="panel-header">
        <h3>System Trace Log</h3>
        <span class="log-count">{{ logs?.length || 0 }} events</span>
      </div>
      <div class="log-container">
        <div class="log-entry" *ngFor="let entry of logs" [class]="entry.type.toLowerCase()">
          <div class="entry-meta">
            <span class="time">{{ entry.timestamp | date:'HH:mm:ss' }}</span>
            <span class="type">{{ entry.type }}</span>
          </div>
          <div class="entry-msg">{{ entry.message }}</div>
        </div>
        <div class="empty-log" *ngIf="!logs?.length">
          Waiting for system events...
        </div>
      </div>
    </div>
  `,
  styles: [`
    .event-log-card { display: flex; flex-direction: column; max-height: 800px; overflow: hidden; background: rgba(30, 41, 59, 0.4); border-radius: 12px; }
    .panel-header { display: flex; justify-content: space-between; align-items: center; padding: 24px; }
    .panel-header h3 { margin: 0; font-size: 1.125rem; font-weight: 600; color: #e2e8f0; }
    .log-count { font-size: 0.75rem; color: #64748b; font-weight: 600; }
    .log-container { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; background: rgba(15, 23, 42, 0.4); border-radius: 8px; margin: 0 16px 16px 16px; }
    .log-entry { padding: 12px; border-radius: 8px; border-left: 3px solid transparent; background: rgba(255, 255, 255, 0.03); font-size: 0.85rem; }
    .log-entry.info { border-left-color: #3b82f6; }
    .log-entry.warning { border-left-color: #fbbf24; background: rgba(251, 191, 36, 0.05); }
    .log-entry.error { border-left-color: #ef4444; background: rgba(239, 68, 68, 0.05); }
    .log-entry.critical { border-left-color: #7f1d1d; background: rgba(127, 29, 29, 0.1); }
    .log-entry.incident { border-left-color: #ef4444; background: rgba(239, 68, 68, 0.1); }
    .log-entry.success { border-left-color: #10b981; background: rgba(16, 185, 129, 0.05); }
    .entry-meta { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .entry-meta .time { font-family: monospace; color: #64748b; font-size: 0.75rem; }
    .entry-meta .type { font-weight: 800; font-size: 0.7rem; text-transform: uppercase; }
    .entry-msg { color: #e2e8f0; line-height: 1.4; }
    .empty-log { color: #64748b; text-align: center; padding: 20px; font-style: italic; }
  `]
})
export class TraceLogComponent {
  @Input() logs: any[] = [];
}

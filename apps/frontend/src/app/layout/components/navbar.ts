import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SystemHealthService } from '../../core/services/system-health.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="navbar">
      <div class="logo">
        <span class="icon">⚡</span>
        <span class="brand">MultiAgent Control Plane</span>
      </div>
      <div class="actions">
        <div class="status-indicator" 
             *ngIf="health.metrics$ | async as metrics"
             [class]="metrics.mode?.toLowerCase() || 'normal'">
          <span class="dot" [class.pulse]="metrics.mode === 'NORMAL' || metrics.mode === 'RECOVERING'"></span>
          <span>{{ getStatusLabel(metrics) }}</span>
        </div>
        <div class="user-avatar">
          <span>OP</span>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .navbar {
      height: 64px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 24px;
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1.25rem;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.5px;
    }
    .brand {
      background: linear-gradient(90deg, #60a5fa, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.75rem;
      font-weight: 700;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.03);
      padding: 6px 12px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .status-indicator.normal .dot { background: #10b981; }
    .status-indicator.degraded .dot { background: #f59e0b; }
    .status-indicator.incident .dot { background: #ef4444; }
    .status-indicator.emergency .dot { background: #ef4444; }
    .status-indicator.recovering .dot { background: #3b82f6; }
    
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .pulse {
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
      70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      color: #fff;
      border: 2px solid rgba(255, 255, 255, 0.1);
      cursor: pointer;
      transition: transform 0.2s;
    }
    .user-avatar:hover {
      transform: scale(1.05);
    }
  `]
})
export class NavbarComponent {
  health = inject(SystemHealthService);

  getStatusLabel(metrics: any): string {
    if (metrics.mode === 'NORMAL') return 'SYSTEM NOMINAL';
    if (metrics.mode === 'RECOVERING') return 'STABILIZING';
    return `SYSTEM ${metrics.mode}`;
  }
}

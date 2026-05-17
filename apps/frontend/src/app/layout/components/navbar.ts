import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SystemHealthService } from '../../core/services/system-health.service';
import { Shield, Bell, Settings, Search, ChevronDown } from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <header class="navbar op-panel">
      <div class="navbar-left">
        <div class="context-item status-item" 
             *ngIf="health.metrics$ | async as metrics"
             [class]="(metrics.mode || 'normal').toLowerCase()">
          <span class="context-label">SYSTEM STATE</span>
          <div class="status-badge" [ngClass]="getStatusClass(metrics.mode)">
            <span class="dot"></span>
            {{ getStatusLabel(metrics) }}
          </div>
        </div>

        <div class="context-item">
          <span class="context-label">TIME (UTC)</span>
          <span class="context-value mono">{{ health.currentTime$ | async }}</span>
        </div>

        <div class="context-item">
          <span class="context-label">UPTIME</span>
          <span class="context-value mono">63d 18h 22m</span>
        </div>

        <div class="context-item">
          <span class="context-label">ARCHITECTURE</span>
          <span class="context-value mono">ZTAN v2.6.1</span>
        </div>

        <div class="context-item">
          <span class="context-label">ENVIRONMENT</span>
          <span class="context-value">Production</span>
        </div>
      </div>

      <div class="navbar-right">
        <div class="global-search">
          <lucide-icon [name]="Search" class="search-icon"></lucide-icon>
          <input type="text" placeholder="Search operational history..." class="search-input">
        </div>
        
        <div class="actions">
          <button class="icon-button"><lucide-icon [name]="Bell"></lucide-icon><span class="badge">3</span></button>
          <button class="icon-button"><lucide-icon [name]="Settings"></lucide-icon></button>
          <div class="user-profile">
            <span class="avatar">AO</span>
            <lucide-icon [name]="ChevronDown" class="chevron"></lucide-icon>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .navbar {
      height: 48px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 1rem;
      border-bottom: 1px solid hsl(var(--border-muted));
      background: hsl(var(--bg-surface));
    }
    .navbar-left, .navbar-right {
      display: flex;
      align-items: center;
      gap: 2rem;
    }

    .context-item {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
    .context-label {
      font-size: 0.625rem;
      font-weight: 700;
      color: hsl(var(--text-dim));
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .context-value {
      font-size: 0.75rem;
      font-weight: 600;
      color: hsl(var(--text-main));
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.125rem 0.5rem;
      border-radius: 2px;
      font-size: 0.6875rem;
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .status-badge.healthy { background: hsl(var(--status-healthy) / 0.1); color: hsl(var(--status-healthy)); }
    .status-badge.warning { background: hsl(var(--status-warning) / 0.1); color: hsl(var(--status-warning)); }
    .status-badge.critical { background: hsl(var(--status-critical) / 0.1); color: hsl(var(--status-critical)); }
    .status-badge.recovering { background: hsl(var(--status-recovering) / 0.1); color: hsl(var(--status-recovering)); }

    .global-search {
      position: relative;
      width: 240px;
    }
    .search-icon {
      position: absolute;
      left: 0.625rem;
      top: 50%;
      transform: translateY(-50%);
      width: 14px;
      height: 14px;
      color: hsl(var(--text-dim));
    }
    .search-input {
      width: 100%;
      background: hsl(var(--bg-app));
      border: 1px solid hsl(var(--border-muted));
      border-radius: 4px;
      padding: 0.375rem 0.75rem 0.375rem 2rem;
      color: hsl(var(--text-main));
      font-size: 0.75rem;
      outline: none;
    }

    .actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .icon-button {
      position: relative;
      background: none;
      border: none;
      color: hsl(var(--text-muted));
      cursor: pointer;
      padding: 0.25rem;
      display: flex;
      align-items: center;
    }
    .icon-button lucide-icon { width: 18px; height: 18px; }
    .icon-button:hover { color: hsl(var(--text-main)); }
    
    .badge {
      position: absolute;
      top: -2px;
      right: -2px;
      background: hsl(var(--status-critical));
      color: white;
      font-size: 0.625rem;
      font-weight: 800;
      padding: 0.125rem 0.25rem;
      border-radius: 999px;
      line-height: 1;
    }

    .user-profile {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding-left: 1rem;
      border-left: 1px solid hsl(var(--border-muted));
      cursor: pointer;
    }
    .user-profile .avatar {
      width: 24px;
      height: 24px;
      background: hsl(var(--border-strong));
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.6875rem;
      font-weight: 800;
      color: hsl(var(--text-main));
    }
    .user-profile .chevron { width: 14px; height: 14px; color: hsl(var(--text-dim)); }
  `]
})
export class NavbarComponent {
  health = inject(SystemHealthService);
  readonly Shield = Shield;
  readonly Bell = Bell;
  readonly Settings = Settings;
  readonly Search = Search;
  readonly ChevronDown = ChevronDown;

  getStatusLabel(metrics: any): string {
    if (metrics.mode === 'NORMAL') return 'OPERATIONAL';
    if (metrics.mode === 'RECOVERING') return 'RECOVERING';
    return metrics.mode || 'UNKNOWN';
  }

  getStatusClass(mode: string): string {
    const m = (mode || '').toUpperCase();
    if (m === 'NORMAL') return 'healthy';
    if (m === 'RECOVERING') return 'recovering';
    if (m === 'DEGRADED') return 'warning';
    return 'critical';
  }
}


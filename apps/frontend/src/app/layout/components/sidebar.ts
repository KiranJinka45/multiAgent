import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="sidebar">
      <ul class="nav-links">
        <li>
          <a routerLink="/missions" routerLinkActive="active">
            <span class="icon">🚀</span>
            <span class="label">Missions</span>
          </a>
        </li>
        <li>
          <a routerLink="/timeline" routerLinkActive="active">
            <span class="icon">🕒</span>
            <span class="label">Timeline</span>
          </a>
        </li>
        <li>
          <a routerLink="/health" routerLinkActive="active">
            <span class="icon">🏥</span>
            <span class="label">System Health</span>
          </a>
        </li>
        <li>
          <a routerLink="/usage" routerLinkActive="active">
            <span class="icon">📊</span>
            <span class="label">Usage</span>
          </a>
        </li>
        <li>
          <a routerLink="/pricing" routerLinkActive="active">
            <span class="icon">💎</span>
            <span class="label">Pricing</span>
          </a>
        </li>
        <li class="nav-divider"></li>
        <li>
          <a routerLink="/ztan/trust" routerLinkActive="active">
            <span class="icon">🛡️</span>
            <span class="label">Trust Dashboard</span>
          </a>
        </li>
        <li>
          <a routerLink="/audit" routerLinkActive="active">
            <span class="icon">🔍</span>
            <span class="label">Audit Verifier</span>
          </a>
        </li>
        <li>
          <a routerLink="/demo/financial-approval" routerLinkActive="active">
            <span class="icon">💰</span>
            <span class="label">Finance Demo</span>
          </a>
        </li>
        <li class="nav-divider"></li>
        <li>
          <a routerLink="/admin" routerLinkActive="active">
            <span class="icon">🕹️</span>
            <span class="label">Cockpit</span>
          </a>
        </li>
        <li>
          <a routerLink="/console" routerLinkActive="active">
            <span class="icon">💻</span>
            <span class="label">Dev Console</span>
          </a>
        </li>
        <li>
          <a href="mailto:support@multiagent.io?subject=Beta%20Feedback">
            <span class="icon">💬</span>
            <span class="label">Feedback</span>
          </a>
        </li>
      </ul>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 240px;
      height: calc(100vh - 64px);
      background: rgba(255, 255, 255, 0.02);
      border-right: 1px solid rgba(255, 255, 255, 0.05);
      padding: 24px 0;
    }
    .nav-links {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .nav-links li {
      margin-bottom: 4px;
    }
    .nav-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.05);
      margin: 12px 24px !important;
    }
    .nav-links a {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 24px;
      color: rgba(255, 255, 255, 0.6);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s ease;
      border-left: 3px solid transparent;
    }
    .nav-links a:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.05);
    }
    .nav-links a.active {
      color: #60a5fa;
      background: rgba(96, 165, 250, 0.1);
      border-left-color: #60a5fa;
    }
    .icon {
      font-size: 1.1rem;
    }
  `]
})
export class SidebarComponent {}

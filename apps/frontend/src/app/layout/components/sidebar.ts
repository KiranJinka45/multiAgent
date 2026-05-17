import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { 
  LayoutDashboard, 
  AlertCircle, 
  History, 
  RotateCcw, 
  ShieldCheck, 
  Wrench,
  ChevronRight,
  Shield,
  Bell,
  Settings,
  BookOpen
} from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <aside class="sidebar op-panel">
      <div class="sidebar-header">
        <div class="brand-box">
          <lucide-icon [name]="Shield" class="brand-icon"></lucide-icon>
          <div class="brand-text">
            <span class="brand-name">NEXUS ZTAN</span>
            <span class="brand-sub">2026-LTS.1</span>
          </div>
        </div>
      </div>
      
      <div class="nav-container">
        <ul class="nav-links">
          <li>
            <a routerLink="/console" routerLinkActive="active">
              <lucide-icon [name]="LayoutDashboard" class="icon"></lucide-icon>
              <span class="label">Console Home</span>
            </a>
          </li>

          <li class="nav-section">Detection & Triage</li>
          <li>
            <a routerLink="/incidents" routerLinkActive="active">
              <lucide-icon [name]="AlertCircle" class="icon"></lucide-icon>
              <span class="label">Incident Center</span>
            </a>
          </li>
          <li>
            <a routerLink="/alerts" routerLinkActive="active">
              <lucide-icon [name]="Bell" class="icon"></lucide-icon>
              <span class="label">Alerts & Blast Radius</span>
            </a>
          </li>

          <li class="nav-section">Recovery & Replay</li>
          <li>
            <a routerLink="/replay" routerLinkActive="active">
              <lucide-icon [name]="History" class="icon"></lucide-icon>
              <span class="label">Replay Explorer</span>
            </a>
          </li>
          <li>
            <a routerLink="/recovery" routerLinkActive="active">
              <lucide-icon [name]="RotateCcw" class="icon"></lucide-icon>
              <span class="label">Recovery Console</span>
            </a>
          </li>

          <li class="nav-section">Stewardship</li>
          <li>
            <a routerLink="/stewardship" routerLinkActive="active">
              <lucide-icon [name]="Wrench" class="icon"></lucide-icon>
              <span class="label">Stewardship Hub</span>
            </a>
          </li>
          <li>
            <a routerLink="/audit" routerLinkActive="active">
              <lucide-icon [name]="ShieldCheck" class="icon"></lucide-icon>
              <span class="label">Audit & Governance</span>
            </a>
          </li>

          <li class="nav-section">System Admin</li>
          <li>
            <a routerLink="/config" routerLinkActive="active">
              <lucide-icon [name]="Settings" class="icon"></lucide-icon>
              <span class="label">Configuration</span>
            </a>
          </li>
          <li>
            <a routerLink="/docs" routerLinkActive="active">
              <lucide-icon [name]="BookOpen" class="icon"></lucide-icon>
              <span class="label">Documentation</span>
            </a>
          </li>
        </ul>
      </div>

      <div class="sidebar-footer">
        <div class="operator-id">
          <div class="avatar">AO</div>
          <div class="details">
            <span class="name">Senior SRE</span>
            <span class="status">Live • UTC</span>
          </div>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      display: flex;
      flex-direction: column;
      width: 260px;
      height: 100vh;
    }
    .sidebar-header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid hsl(var(--border-muted));
    }
    .brand-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .brand-icon {
      width: 24px;
      height: 24px;
      color: hsl(var(--primary));
    }
    .brand-text {
      display: flex;
      flex-direction: column;
    }
    .brand-name {
      font-size: 0.8125rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: hsl(var(--text-main));
    }
    .brand-sub {
      font-size: 0.625rem;
      font-weight: 600;
      color: hsl(var(--text-dim));
      letter-spacing: 0.05em;
    }
    .nav-container {
      flex: 1;
      overflow-y: auto;
    }
    .nav-links {
      list-style: none;
      padding: 1rem 0;
      margin: 0;
    }
    .nav-section {
      padding: 1.25rem 1.5rem 0.5rem;
      font-size: 0.625rem;
      font-weight: 700;
      color: hsl(var(--text-dim));
      text-transform: uppercase;
      letter-spacing: 0.075em;
    }
    .nav-links li a {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 0.75rem 1.5rem;
      color: hsl(var(--text-muted));
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      border-left: 2px solid transparent;
      transition: all 0.1s ease;
    }
    .nav-links li a:hover {
      color: hsl(var(--text-main));
      background: hsl(var(--bg-elevated) / 0.5);
    }
    .nav-links li a.active {
      color: hsl(var(--primary));
      background: hsl(var(--primary) / 0.05);
      border-left-color: hsl(var(--primary));
    }
    .icon {
      width: 18px;
      height: 18px;
      opacity: 0.7;
    }
    .active .icon {
      opacity: 1;
    }
    .sidebar-footer {
      padding: 1rem;
      border-top: 1px solid hsl(var(--border-muted));
    }
    .operator-id {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem;
      background: hsl(var(--bg-elevated) / 0.3);
      border-radius: 4px;
    }
    .avatar {
      width: 32px;
      height: 32px;
      background: hsl(var(--border-strong));
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      color: hsl(var(--text-muted));
    }
    .details {
      display: flex;
      flex-direction: column;
    }
    .name {
      font-size: 0.8125rem;
      font-weight: 600;
      color: hsl(var(--text-main));
    }
    .status {
      font-size: 0.6875rem;
      color: hsl(var(--status-healthy));
    }
  `]
})
export class SidebarComponent {
  readonly LayoutDashboard = LayoutDashboard;
  readonly AlertCircle = AlertCircle;
  readonly History = History;
  readonly RotateCcw = RotateCcw;
  readonly ShieldCheck = ShieldCheck;
  readonly Wrench = Wrench;
  readonly Shield = Shield;
  readonly Bell = Bell;
  readonly Settings = Settings;
  readonly BookOpen = BookOpen;
}


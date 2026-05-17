import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from './navbar';
import { SidebarComponent } from './sidebar';
import { OfflineBannerComponent } from '../../shared/components/offline-banner';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, SidebarComponent, OfflineBannerComponent],
  template: `
    <div class="shell">
      <app-offline-banner></app-offline-banner>
      <app-navbar></app-navbar>
      <div class="main-container">
        <app-sidebar></app-sidebar>
        <main class="content">
          <div class="view-header">
            <router-outlet name="header"></router-outlet>
          </div>
          <div class="view-body">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .shell {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: hsl(var(--bg-app));
      color: hsl(var(--text-main));
      overflow: hidden;
    }
    .main-container {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      background: hsl(var(--bg-app));
    }
    .view-body {
      padding: 2rem;
      max-width: 1600px;
      width: 100%;
      margin: 0 auto;
    }
  `]
})
export class ShellComponent {}


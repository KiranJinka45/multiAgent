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
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .shell {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: #0f172a;
      overflow: hidden;
    }
    .main-container {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    .content {
      flex: 1;
      padding: 32px;
      overflow-y: auto;
      background: radial-gradient(circle at top right, rgba(96, 165, 250, 0.05), transparent 40%),
                  radial-gradient(circle at bottom left, rgba(167, 139, 250, 0.05), transparent 40%);
    }
  `]
})
export class ShellComponent {}

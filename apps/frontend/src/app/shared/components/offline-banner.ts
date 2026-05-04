import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebsocketService } from '../../core/services/websocket.service';

@Component({
  selector: 'app-offline-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="offline-banner" *ngIf="!(isConnected$ | async)">
      <span class="icon">⚠️</span>
      <span class="message">Connection to control plane lost. Reconnecting...</span>
    </div>
  `,
  styles: [`
    .offline-banner {
      background: #ef4444;
      color: #fff;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      font-size: 0.875rem;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
      z-index: 1000;
    }
    .icon { font-size: 1.1rem; }
  `]
})
export class OfflineBannerComponent {
  isConnected$ = inject(WebsocketService).isConnected$;

  constructor() {}
}

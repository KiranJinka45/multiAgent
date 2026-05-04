import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <router-outlet></router-outlet>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      background: #020617; /* Slate 950 */
      color: #f8fafc;
      font-family: 'Inter', -apple-system, sans-serif;
      overflow: hidden;
    }
    .app-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    .main-layout {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    .content-area {
      flex: 1;
      padding: 32px 48px;
      overflow-y: auto;
      background: radial-gradient(circle at top right, rgba(30, 64, 175, 0.05), transparent 40%),
                  radial-gradient(circle at bottom left, rgba(139, 92, 246, 0.05), transparent 40%);
    }
    
    /* Global scrollbar styling */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.02);
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  `]
})
export class App {}

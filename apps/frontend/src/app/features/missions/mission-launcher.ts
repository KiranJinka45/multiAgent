import { Component, ChangeDetectionStrategy, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-mission-launcher',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="launcher-card card">
      <div class="launcher-header">
        <span class="icon">🚀</span>
        <h3>Mission Launcher</h3>
      </div>
      <div class="launcher-content">
        <p class="description">Enter your autonomous mission objective. Our agents will decompose, plan, and execute it.</p>
        
        <div class="input-wrapper">
          <textarea 
            [(ngModel)]="prompt" 
            placeholder="e.g., 'Build a secure authentication system with Next.js and Supabase'"
            [disabled]="loading"
            rows="3">
          </textarea>
          <div class="input-actions">
            <button 
              class="btn-launch" 
              (click)="onLaunch()" 
              [disabled]="loading || !prompt.trim()">
              {{ loading ? 'Initializing...' : 'Launch Mission' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .launcher-card {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      margin-bottom: 32px;
    }
    .launcher-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .launcher-header h3 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: #f8fafc;
    }
    .description {
      font-size: 0.875rem;
      color: #94a3b8;
      margin-bottom: 20px;
    }
    .input-wrapper {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    textarea {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 12px;
      color: #fff;
      font-family: inherit;
      font-size: 0.9375rem;
      resize: vertical;
      transition: border-color 0.2s;
    }
    textarea:focus {
      outline: none;
      border-color: #3b82f6;
      background: rgba(0, 0, 0, 0.3);
    }
    .input-actions {
      display: flex;
      justify-content: flex-end;
    }
    .btn-launch {
      background: linear-gradient(to right, #3b82f6, #2563eb);
      color: #fff;
      border: none;
      padding: 10px 24px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn-launch:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    .btn-launch:active:not(:disabled) {
      transform: translateY(0);
    }
    .btn-launch:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class MissionLauncherComponent {
  @Input() loading = false;
  @Output() launch = new EventEmitter<string>();

  prompt = '';

  onLaunch() {
    if (this.prompt.trim()) {
      this.launch.emit(this.prompt.trim());
      this.prompt = '';
    }
  }
}

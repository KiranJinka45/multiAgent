import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-welcome-guide',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="welcome-card">
      <div class="welcome-header">
        <div class="welcome-icon">✨</div>
        <h2>Welcome to MultiAgent</h2>
        <p>You've successfully provisioned your autonomous environment. Let's start your first mission.</p>
      </div>

      <div class="steps">
        <div class="step">
          <div class="step-number">1</div>
          <div class="step-content">
            <h3>Define Your Goal</h3>
            <p>Click "New Mission" to specify what you want to build or automate.</p>
          </div>
        </div>
        <div class="step">
          <div class="step-number">2</div>
          <div class="step-content">
            <h3>Autonomous Execution</h3>
            <p>Our swarm of agents will plan, code, and verify the solution in real-time.</p>
          </div>
        </div>
        <div class="step">
          <div class="step-number">3</div>
          <div class="step-content">
            <h3>Scale & Optimize</h3>
            <p>The system learns from every mission to improve efficiency and ROI.</p>
          </div>
        </div>
      </div>

      <div class="welcome-footer">
        <button class="btn-start" (click)="start.emit()">
          Create Your First Mission
        </button>
      </div>
    </div>
  `,
  styles: [`
    .welcome-card {
      background: rgba(30, 41, 59, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 40px;
      max-width: 600px;
      margin: 40px auto;
      text-align: center;
      backdrop-filter: blur(12px);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .welcome-header h2 {
      font-size: 2rem;
      font-weight: 800;
      background: linear-gradient(to bottom right, #fff, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 16px 0 8px;
    }
    .welcome-header p {
      color: rgba(255, 255, 255, 0.6);
      font-size: 1.1rem;
      margin-bottom: 40px;
    }
    .welcome-icon {
      font-size: 3rem;
    }
    .steps {
      display: flex;
      flex-direction: column;
      gap: 24px;
      text-align: left;
      margin-bottom: 40px;
    }
    .step {
      display: flex;
      gap: 20px;
      align-items: flex-start;
    }
    .step-number {
      width: 32px;
      height: 32px;
      background: #3b82f6;
      color: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      flex-shrink: 0;
      box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
    }
    .step-content h3 {
      font-size: 1rem;
      font-weight: 600;
      color: #fff;
      margin: 0 0 4px;
    }
    .step-content p {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.5);
      margin: 0;
    }
    .btn-start {
      background: linear-gradient(to right, #3b82f6, #60a5fa);
      color: #fff;
      border: none;
      padding: 14px 32px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }
    .btn-start:hover {
      transform: translateY(-2px);
      box-shadow: 0 20px 25px -5px rgba(59, 130, 246, 0.4);
    }
  `]
})
export class WelcomeGuideComponent {
  @Output() start = new EventEmitter<void>();
}

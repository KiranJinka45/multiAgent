import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SreDataService } from '../../core/services/sre-data.service';

@Component({
  selector: 'sre-tuning-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tuning-card">
      <div class="card-header">
        <div class="title-group">
          <span class="icon">🛠️</span>
          <label>DYNAMIC GOVERNANCE TUNING</label>
        </div>
        <div class="status-pill" [class.active]="isTuning()">TUNING ACTIVE</div>
      </div>

      <div class="tuning-grid">
        <div class="tuning-item">
          <div class="label-group">
            <span class="label">Expected TTAC</span>
            <span class="value">{{ expectedTTAC }}ms</span>
          </div>
          <input type="range" min="1000" max="60000" step="1000" 
                 [(ngModel)]="expectedTTAC" (change)="apply()">
          <p class="help">Time To Actual Convergence. Adjust if propagation is consistently lagging.</p>
        </div>

        <div class="tuning-item">
          <div class="label-group">
            <span class="label">Confidence Threshold</span>
            <span class="value">{{ (confidenceThreshold * 100).toFixed(0) }}%</span>
          </div>
          <input type="range" min="0.5" max="0.99" step="0.05" 
                 [(ngModel)]="confidenceThreshold" (change)="apply()">
          <p class="help">Minimum weighted confidence required for autonomous actions.</p>
        </div>

        <div class="tuning-item">
          <div class="label-group">
            <span class="label">Min Provider Diversity</span>
            <span class="value">{{ minDiversity }}</span>
          </div>
          <input type="number" min="1" max="10" 
                 [(ngModel)]="minDiversity" (change)="apply()">
          <p class="help">Minimum unique cloud providers required for quorum.</p>
        </div>
      </div>

      <div class="card-footer">
        <button class="reset-btn" (click)="reset()">RESET TO DEFAULTS</button>
        <div class="tip">Changes apply in real-time to the Epistemic Engine.</div>
      </div>
    </div>
  `,
  styles: [`
    .tuning-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 24px;
    }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .title-group { display: flex; align-items: center; gap: 12px; }
    .title-group label { font-size: 10px; font-weight: 700; color: rgba(255, 255, 255, 0.4); letter-spacing: 0.1em; }
    .status-pill { font-size: 9px; padding: 2px 8px; border-radius: 4px; background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.3); }
    .status-pill.active { background: rgba(34, 197, 94, 0.1); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.2); }
    
    .tuning-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
    .tuning-item { display: flex; flex-direction: column; gap: 12px; }
    .label-group { display: flex; justify-content: space-between; align-items: flex-end; }
    .label { font-size: 12px; color: rgba(255, 255, 255, 0.7); }
    .value { font-family: 'JetBrains Mono', monospace; font-size: 14px; color: #818cf8; font-weight: 700; }
    
    input[type="range"] { width: 100%; accent-color: #4f46e5; }
    input[type="number"] { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 4px 8px; border-radius: 4px; font-family: inherit; }
    
    .help { font-size: 11px; color: rgba(255, 255, 255, 0.3); line-height: 1.4; }
    
    .card-footer { margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.05); display: flex; justify-content: space-between; align-items: center; }
    .reset-btn { background: none; border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.4); font-size: 10px; padding: 6px 12px; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
    .reset-btn:hover { border-color: rgba(255,255,255,0.3); color: white; }
    .tip { font-size: 10px; font-style: italic; color: rgba(255,255,255,0.2); }
  `]
})
export class TuningPanelComponent {
  private data = inject(SreDataService);
  
  public expectedTTAC = 15000;
  public confidenceThreshold = 0.8;
  public minDiversity = 3;
  
  public isTuning = signal(false);

  apply() {
    this.isTuning.set(true);
    this.data.tune({
      expectedTTAC: this.expectedTTAC,
      confidenceThreshold: this.confidenceThreshold,
      minDiversity: this.minDiversity
    });
    
    setTimeout(() => this.isTuning.set(false), 1000);
  }

  reset() {
    this.expectedTTAC = 15000;
    this.confidenceThreshold = 0.8;
    this.minDiversity = 3;
    this.apply();
  }
}

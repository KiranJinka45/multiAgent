import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'sre-stability-state-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-panel widget-container" [class]="state?.toLowerCase()">
      <div class="state-header">
        <div class="indicator" [class.pulse]="state === 'CONVERGING'" [class.flicker]="state === 'OSCILLATING'"></div>
        <span class="label">STABILITY CLASSIFICATION</span>
      </div>
      
      <div class="main-state">{{ state || 'INITIALIZING' }}</div>
      
      <div class="metrics-grid">
        <div class="metric">
          <label>CLASSIFICATION CONFIDENCE</label>
          <div class="val">{{ (confidence * 100).toFixed(0) }}%</div>
        </div>
        <div class="metric">
          <label>NEXT ACTION ETA</label>
          <div class="val text-converging" *ngIf="nextActionEta !== null">{{ nextActionEta.toFixed(1) }}s</div>
          <div class="val opacity-30" *ngIf="nextActionEta === null">--</div>
        </div>
        <div class="metric">
          <label>TUNING VELOCITY</label>
          <div class="val">{{ (velocity * 100).toFixed(2) }}% / cycle</div>
        </div>
        <div class="metric">
          <label>VELOCITY DECAY</label>
          <div class="val" [class.settling]="velocityDecay < 0">{{ (velocityDecay * 100).toFixed(2) }}%</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .widget-container {
      padding: 20px;
      position: relative;
      overflow: hidden;
      min-width: 280px;
      
      &.stable { border-left: 4px solid hsl(var(--color-stable)); }
      &.converging { border-left: 4px solid hsl(var(--color-converging)); }
      &.oscillating { border-left: 4px solid hsl(var(--color-critical)); }
      &.drift_risk { border-left: 4px solid hsl(var(--color-warning)); }
    }

    .state-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
      .indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
      }
      .label {
        font-size: 10px;
        letter-spacing: 0.1em;
        opacity: 0.5;
        font-weight: 600;
      }
    }

    .main-state {
      font-size: 28px;
      font-weight: 800;
      font-family: 'Outfit', sans-serif;
      margin-bottom: 20px;
      letter-spacing: -0.01em;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      
      .metric label {
        display: block;
        font-size: 8px;
        opacity: 0.4;
        margin-bottom: 4px;
        white-space: nowrap;
      }
      .val {
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        font-weight: 600;
        &.settling { color: hsl(var(--color-stable)); }
      }
    }

    .text-converging { color: hsl(var(--color-converging)); }

    /* State-specific colors */
    .stable { .main-state, .indicator { color: hsl(var(--color-stable)); } }
    .converging { .main-state, .indicator { color: hsl(var(--color-converging)); } }
    .oscillating { .main-state, .indicator { color: hsl(var(--color-critical)); } }
    .drift_risk { .main-state, .indicator { color: hsl(var(--color-warning)); } }
  `]
})
export class StabilityStateWidget {
  @Input() state?: 'INITIALIZING' | 'CONVERGING' | 'OSCILLATING' | 'FORMALLY_STABLE';
  @Input() velocity = 0;
  @Input() velocityDecay = 0;
  @Input() confidence = 0;
  @Input() nextActionEta: number | null = null;
}

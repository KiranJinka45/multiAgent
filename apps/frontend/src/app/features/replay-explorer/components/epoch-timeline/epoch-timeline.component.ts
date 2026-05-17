import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvidenceChain } from '@packages/contracts';

@Component({
  selector: 'app-epoch-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="epoch-timeline-container">
      <div class="macro-ruler">
        <div class="epoch-segment active">
          <div class="boundary-label">GOV-ROTATION-03 (ACTIVE)</div>
          <div class="segment-fill"></div>
        </div>
      </div>

      <div class="marker-overlay" *ngIf="chain">
        <div class="marker incident-start" [style.left.%]="10">
          <div class="marker-dot"></div>
          <span class="marker-label">Incident Start</span>
        </div>
        
        <div class="marker recovery-pivot" [style.left.%]="65">
          <div class="marker-dot"></div>
          <span class="marker-label">Recovery Pivot</span>
        </div>

        <div class="marker current-head" [style.left.%]="98">
          <div class="marker-dot"></div>
          <span class="marker-label">Live Head</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .epoch-timeline-container {
      position: relative;
      height: 60px;
      padding: 0 1rem;
      background: hsl(var(--bg-surface));
      border: 1px solid hsl(var(--border-muted));
      border-radius: 4px;
    }

    .macro-ruler {
      height: 4px;
      background: hsl(var(--bg-elevated));
      margin-top: 24px;
      position: relative;
      border-radius: 2px;
    }

    .epoch-segment.active .segment-fill {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      width: 100%;
      background: hsl(var(--epoch-boundary) / 0.3);
      border-right: 2px solid hsl(var(--epoch-boundary));
    }

    .boundary-label {
      position: absolute;
      top: -18px;
      left: 4px;
      font-size: 0.625rem;
      font-weight: 700;
      color: hsl(var(--epoch-boundary));
      text-transform: uppercase;
    }

    .marker-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .marker {
      position: absolute;
      top: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translateX(-50%);
    }

    .marker-dot {
      width: 8px;
      height: 8px;
      background: hsl(var(--text-main));
      border: 2px solid hsl(var(--bg-surface));
      border-radius: 50%;
      z-index: 2;
    }

    .marker-label {
      margin-top: 12px;
      font-size: 0.5625rem;
      font-weight: 700;
      color: hsl(var(--text-dim));
      text-transform: uppercase;
      white-space: nowrap;
    }

    .marker.incident-start .marker-dot { background: hsl(var(--status-critical)); }
    .marker.recovery-pivot .marker-dot { background: hsl(var(--status-recovering)); }
    .marker.current-head .marker-dot { background: hsl(var(--status-healthy)); }
  `]
})
export class EpochTimelineComponent {
  @Input() chain: EvidenceChain | null = null;
}

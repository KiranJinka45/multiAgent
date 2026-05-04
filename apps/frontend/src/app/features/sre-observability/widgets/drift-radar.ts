import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'sre-drift-radar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-panel radar-container" [class.critical]="wassersteinDistance > 0.05">
      <div class="header">
        <span class="label">DRIFT RADAR (WASSERSTEIN)</span>
        <div class="dist-val">{{ wassersteinDistance.toFixed(4) }}</div>
      </div>
      <div class="radar-viewport">
        <canvas #radarCanvas></canvas>
        <div class="radar-ping" *ngIf="wassersteinDistance > 0.05"></div>
      </div>
      <div class="footer">
        <div class="status-msg" *ngIf="wassersteinDistance <= 0.05">BEHAVIORAL ALIGNMENT: OPTIMAL</div>
        <div class="status-msg critical" *ngIf="wassersteinDistance > 0.05">DISTRIBUTION SHIFT DETECTED</div>
      </div>
    </div>
  `,
  styles: [`
    .radar-container {
      padding: 16px;
      height: 220px;
      display: flex;
      flex-direction: column;
      &.critical { border: 1px solid hsl(var(--color-critical) / 0.4); }
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      .label { font-size: 10px; opacity: 0.5; font-weight: 600; letter-spacing: 0.05em; }
      .dist-val { font-family: 'Outfit'; font-size: 12px; color: hsl(var(--color-converging)); }
    }
    .radar-viewport {
      flex: 1;
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    canvas { width: 100%; height: 100%; }
    .radar-ping {
      position: absolute;
      width: 100px;
      height: 100px;
      border: 2px solid hsl(var(--color-critical));
      border-radius: 50%;
      animation: state-pulse 2s infinite;
      opacity: 0.2;
    }
    .footer {
      margin-top: 12px;
      text-align: center;
      .status-msg {
        font-size: 8px;
        letter-spacing: 0.05em;
        font-weight: 700;
        opacity: 0.6;
        &.critical { color: hsl(var(--color-critical)); opacity: 1; }
      }
    }
  `]
})
export class DriftRadar implements AfterViewInit, OnChanges {
  @ViewChild('radarCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() wassersteinDistance = 0;

  ngAfterViewInit() { this.draw(); }
  ngOnChanges() { this.draw(); }

  private draw() {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.clientWidth * window.devicePixelRatio;
    canvas.height = canvas.clientHeight * window.devicePixelRatio;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.8;

    // Draw reference circles
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.setLineDash([5, 5]);
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (radius / 3) * i, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw "Deformation" representing drift
    const driftAmount = Math.min(this.wassersteinDistance * 10, 1.0); // Scaled for visual
    const color = this.wassersteinDistance > 0.05 ? '244, 63, 94' : '59, 130, 246';

    ctx.beginPath();
    for (let i = 0; i <= 360; i += 5) {
      const angle = (i * Math.PI) / 180;
      // Add noise/deformation based on drift
      const noise = Math.sin(angle * 8) * (driftAmount * 15);
      const r = radius + noise;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    
    ctx.strokeStyle = `rgb(${color})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = `rgba(${color}, 0.1)`;
    ctx.fill();
  }
}

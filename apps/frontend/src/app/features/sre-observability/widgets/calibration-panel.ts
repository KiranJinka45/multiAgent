import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'sre-calibration-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-panel cal-container">
      <div class="header">
        <span class="label">CALIBRATION (BRIER VS CONFIDENCE)</span>
        <div class="status" [class.optimal]="isOptimal()">{{ isOptimal() ? 'OPTIMAL' : 'CALIBRATING...' }}</div>
      </div>
      <div class="chart-area">
        <canvas #calCanvas></canvas>
        <div class="axis x-axis">CONFIDENCE</div>
        <div class="axis y-axis">ACCURACY</div>
      </div>
      <div class="cal-metrics">
        <div class="m-group">
          <label>AVG CONFIDENCE</label>
          <div class="v">{{ (avgConfidence * 100).toFixed(1) }}%</div>
        </div>
        <div class="m-group">
          <label>BRIER SCORE</label>
          <div class="v">{{ brierScore.toFixed(4) }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cal-container {
      padding: 16px;
      height: 240px;
      display: flex;
      flex-direction: column;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      .label { font-size: 10px; opacity: 0.5; font-weight: 600; letter-spacing: 0.05em; }
      .status { font-size: 9px; color: hsl(var(--color-warning)); &.optimal { color: hsl(var(--color-stable)); } }
    }
    .chart-area {
      flex: 1;
      position: relative;
      margin: 10px 0 20px 20px;
      canvas { width: 100%; height: 100%; }
      .axis {
        position: absolute;
        font-size: 7px;
        opacity: 0.3;
        font-weight: 700;
        &.x-axis { bottom: -15px; left: 50%; transform: translateX(-50%); }
        &.y-axis { top: 50%; left: -25px; transform: rotate(-90deg) translateX(50%); }
      }
    }
    .cal-metrics {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border-top: 1px solid rgba(255,255,255,0.05);
      padding-top: 12px;
      .m-group label { display: block; font-size: 7px; opacity: 0.4; margin-bottom: 2px; }
      .m-group .v { font-family: 'Outfit'; font-size: 13px; font-weight: 600; }
    }
  `]
})
export class CalibrationPanel implements AfterViewInit, OnChanges {
  @ViewChild('calCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() avgConfidence = 0;
  @Input() brierScore = 0;

  isOptimal() { return this.brierScore < 0.1; }

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

    const padding = 10;
    const size = Math.min(canvas.width, canvas.height) - padding * 2;

    // Draw ideal diagonal
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(padding, padding + size);
    ctx.lineTo(padding + size, padding);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw current point
    const x = padding + (this.avgConfidence * size);
    const y = padding + size - ((1 - this.brierScore) * size);

    ctx.fillStyle = this.isOptimal() ? 'hsl(var(--color-stable))' : 'hsl(var(--color-warning))';
    ctx.shadowBlur = 10;
    ctx.shadowColor = ctx.fillStyle;
    
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw crosshair
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(x, padding); ctx.lineTo(x, padding + size);
    ctx.moveTo(padding, y); ctx.lineTo(padding + size, y);
    ctx.stroke();
  }
}

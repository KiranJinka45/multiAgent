import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'sre-drift-trend',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-panel trend-container" [class.critical]="currentWD > 0.05">
      <div class="header">
        <span class="label">WASSERSTEIN DRIFT TREND</span>
        <div class="status" [class.text-critical]="currentWD > 0.05">
          {{ currentWD > 0.05 ? 'CRITICAL SHIFT' : 'NOMINAL' }}
        </div>
      </div>
      
      <div class="main-val">
        <span class="v">{{ currentWD.toFixed(4) }}</span>
        <span class="unit">WD</span>
      </div>

      <canvas #trendCanvas></canvas>
      
      <div class="threshold-label" [style.bottom.%]="(0.05 / maxRange) * 100">
        THRESHOLD 0.05
      </div>
    </div>
  `,
  styles: [`
    .trend-container {
      padding: 16px;
      height: 200px;
      display: flex;
      flex-direction: column;
      position: relative;
      &.critical { border: 2px solid hsl(var(--color-critical)); }
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      .label { font-size: 9px; opacity: 0.5; font-weight: 800; letter-spacing: 0.05em; }
      .status { font-size: 9px; font-weight: 900; }
    }
    .main-val {
      margin-bottom: 12px;
      .v { font-family: 'Outfit'; font-size: 24px; font-weight: 800; }
      .unit { font-size: 10px; opacity: 0.4; margin-left: 4px; font-weight: 700; }
    }
    canvas { flex: 1; width: 100%; image-rendering: pixelated; }
    .threshold-label {
      position: absolute;
      right: 16px;
      font-size: 7px;
      font-weight: 900;
      color: hsl(var(--color-critical));
      opacity: 0.6;
      border-bottom: 1px dashed currentColor;
      padding-bottom: 2px;
    }
    .text-critical { color: hsl(var(--color-critical)); }
  `]
})
export class DriftTrend implements AfterViewInit, OnChanges {
  @ViewChild('trendCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() history: number[] = [];
  @Input() currentWD = 0;
  
  maxRange = 0.1;

  ngAfterViewInit() { this.draw(); }
  ngOnChanges() { this.draw(); }

  private draw() {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Only resize if dimensions changed to avoid buffer reallocations
    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.floor(canvas.clientWidth * dpr);
    const targetH = Math.floor(canvas.clientHeight * dpr);
    
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Hardened circular buffer display (Capped at 100 points for durability)
    const displayHistory = this.history.length > 100 
      ? this.history.slice(-100) 
      : this.history;

    if (displayHistory.length < 2) return;

    const padding = 10 * dpr;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;
    this.maxRange = Math.max(0.1, ...displayHistory, 0.06);

    // Draw Threshold Line
    const thresholdY = padding + height - (0.05 / this.maxRange) * height;
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
    ctx.setLineDash([5 * dpr, 5 * dpr]);
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.moveTo(padding, thresholdY);
    ctx.lineTo(padding + width, thresholdY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Trend
    ctx.strokeStyle = this.currentWD > 0.05 ? 'hsl(343, 89%, 60%)' : 'hsl(217, 91%, 60%)';
    ctx.lineWidth = 3 * dpr;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    
    for (let i = 0; i < displayHistory.length; i++) {
      const x = padding + (width / (displayHistory.length - 1)) * i;
      const y = padding + height - (displayHistory[i] / this.maxRange) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    // Fill Gradient
    const grad = ctx.createLinearGradient(0, padding, 0, padding + height);
    grad.addColorStop(0, this.currentWD > 0.05 ? 'rgba(244, 63, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.lineTo(padding + width, padding + height);
    ctx.lineTo(padding, padding + height);
    ctx.fill();
  }
}

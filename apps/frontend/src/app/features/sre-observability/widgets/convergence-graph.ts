import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'sre-convergence-graph',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-panel graph-container">
      <div class="header">
        <span class="label">CONVERGENCE EXPLORER</span>
        <div class="status">SETTLING...</div>
      </div>
      <canvas #graphCanvas></canvas>
      <div class="footer">
        <span>HISTORY (LAST 50 CYCLES)</span>
        <span>VELOCITY DECAY → ZERO</span>
      </div>
    </div>
  `,
  styles: [`
    .graph-container {
      padding: 16px;
      height: 200px;
      display: flex;
      flex-direction: column;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      .label { font-size: 10px; opacity: 0.5; font-weight: 600; letter-spacing: 0.05em; }
      .status { font-size: 9px; color: hsl(var(--color-converging)); }
    }
    canvas {
      flex: 1;
      width: 100%;
      image-rendering: pixelated;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      font-size: 8px;
      opacity: 0.3;
    }
  `]
})
export class ConvergenceGraph implements AfterViewInit, OnChanges {
  @ViewChild('graphCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() history: number[] = [];

  ngAfterViewInit() {
    this.draw();
  }

  ngOnChanges() {
    this.draw();
  }

  private draw() {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set internal resolution
    canvas.width = canvas.clientWidth * window.devicePixelRatio;
    canvas.height = canvas.clientHeight * window.devicePixelRatio;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (this.history.length < 2) return;

    const padding = 20;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;

    const min = Math.min(...this.history);
    const max = Math.max(...this.history);
    const range = max - min || 1;

    // Draw grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const y = padding + (height / 4) * i;
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + width, y);
    }
    ctx.stroke();

    // Draw line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    for (let i = 0; i < this.history.length; i++) {
      const x = padding + (width / (this.history.length - 1)) * i;
      const y = padding + height - ((this.history[i] - min) / range) * height;
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw gradient fill
    const grad = ctx.createLinearGradient(0, padding, 0, padding + height);
    grad.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
    grad.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.fillStyle = grad;
    ctx.lineTo(padding + width, padding + height);
    ctx.lineTo(padding, padding + height);
    ctx.closePath();
    ctx.fill();
  }
}

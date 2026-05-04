import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SreDataService } from '../../../core/services/sre-data.service';

@Component({
  selector: 'app-validation-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="validation-panel panel">
      <div class="panel-header">
        <h3>CERTIFICATION VALIDATION (CI/CD)</h3>
        <div class="badge" [class.badge-ok]="isAllPassed()" [class.badge-fail]="!isAllPassed()">
          {{ isAllPassed() ? 'SYSTEM CERTIFIED' : 'VALIDATION PENDING' }}
        </div>
      </div>
      <div class="panel-body">
        <div class="check-item" *ngFor="let check of checks()">
          <div class="check-icon" [class.pass]="check.status === 'PASS'" [class.fail]="check.status === 'FAIL'">
            {{ check.status === 'PASS' ? '✓' : '✗' }}
          </div>
          <div class="check-details">
            <div class="check-name">{{ check.name }}</div>
            <div class="check-meta">Value: {{ check.value }} | Target: {{ check.target }}</div>
          </div>
        </div>

        <div class="pipeline-status">
          <label>LAST PIPELINE RUN</label>
          <div class="pipeline-time">2026-05-01 10:45:12 UTC</div>
          <div class="pipeline-commit">feat: hardened governance loop (sha: 7f3a1b2)</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .check-item { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding: 8px; border-radius: 4px; background: rgba(255,255,255,0.03); }
    .check-icon { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; }
    .check-icon.pass { background: rgba(16, 185, 129, 0.2); color: #10b981; }
    .check-icon.fail { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    .check-name { font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .check-meta { font-size: 9px; color: #94a3b8; margin-top: 2px; }
    .pipeline-status { margin-top: 16px; border-top: 1px solid #334155; padding-top: 12px; }
    .pipeline-status label { font-size: 8px; font-weight: 900; color: #64748b; display: block; margin-bottom: 4px; }
    .pipeline-time, .pipeline-commit { font-size: 10px; font-family: 'JetBrains Mono', monospace; color: #94a3b8; }
  `]
})
export class ValidationPanelComponent {
  public data = inject(SreDataService);

  public checks = signal([
    { name: 'Operational RCA Accuracy', status: 'PASS', value: '92%', target: '>85%' },
    { name: 'Business ROI Accuracy', status: 'PASS', value: '94%', target: '>70%' },
    { name: 'Calibration (Brier)', status: 'PASS', value: '0.185', target: '<0.25' },
    { name: 'Safety Watchdog Integ', status: 'PASS', value: 'ACTIVE', target: 'REQUIRED' }
  ]);

  public isAllPassed() {
    return this.checks().every(c => c.status === 'PASS');
  }
}

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { Observable } from 'rxjs';
import { LucideAngularModule, Bell, AlertCircle, Zap } from 'lucide-angular';

@Component({
  selector: 'app-alert-center',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="alert-card glass">
      <div class="card-header">
        <lucide-icon name="bell" class="icon-warning"></lucide-icon>
        <h3>Active Alerts & Signals</h3>
      </div>
      <div class="alert-list" *ngIf="alerts$ | async as alerts">
        <div class="empty-state" *ngIf="alerts.length === 0">
           <span>System Stable. No active signals.</span>
        </div>
        <div class="alert-item" *ngFor="let a of alerts" [class.sla]="a.action === 'SLA_GUARDRAIL_TRIGGER'">
          <div class="a-header">
            <span class="a-badge">{{ a.status || 'SIGNAL' }}</span>
            <span class="a-time">{{ a.createdAt | date:'shortTime' }}</span>
          </div>
          <div class="a-body">
            <span class="a-action">{{ a.action.replace('_', ' ') }}</span>
            <span class="a-msg">{{ a.metadata?.reason || a.resource }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .alert-card { padding: 1.5rem; border-radius: 20px; }
    .card-header { display: flex; align-items: center; gap: 0.8rem; margin-bottom: 1.5rem; }
    h3 { margin: 0; font-size: 1rem; color: #909094; text-transform: uppercase; }
    .alert-list { display: flex; flex-direction: column; gap: 0.8rem; max-height: 400px; overflow-y: auto; }
    .empty-state { padding: 2rem; text-align: center; color: #666; font-size: 0.9rem; }
    .alert-item { 
      padding: 1rem; border-radius: 12px; background: rgba(255, 180, 171, 0.03); 
      border-left: 3px solid #ffb4ab;
    }
    .alert-item.sla { background: rgba(209, 188, 255, 0.03); border-left-color: #d1bcff; }
    .a-header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
    .a-badge { 
      font-size: 0.6rem; font-weight: 800; padding: 0.2rem 0.5rem; 
      border-radius: 4px; background: #ffb4ab; color: #000;
    }
    .sla .a-badge { background: #d1bcff; }
    .a-time { font-size: 0.7rem; color: #666; }
    .a-body { display: flex; flex-direction: column; }
    .a-action { font-size: 0.85rem; font-weight: 700; color: #fff; text-transform: uppercase; }
    .a-msg { font-size: 0.8rem; color: #909094; margin-top: 0.2rem; }
  `]
})
export class AlertCenterComponent implements OnInit {
  private adminService = inject(AdminService);
  alerts$!: Observable<any[]>;

  ngOnInit() {
    this.alerts$ = this.adminService.getAlerts();
  }
}

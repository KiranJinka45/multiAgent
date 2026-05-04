import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { Observable } from 'rxjs';
import { LucideAngularModule, Users, TrendingUp, AlertTriangle } from 'lucide-angular';

@Component({
  selector: 'app-tenant-overview',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="tenant-card glass">
      <div class="card-header">
        <lucide-icon name="users" class="icon-accent"></lucide-icon>
        <h3>Top Tenants by Usage</h3>
      </div>
      <div class="tenant-list" *ngIf="tenants$ | async as tenants">
        <div class="tenant-item" *ngFor="let t of tenants">
          <div class="t-info">
            <span class="t-name">{{ t.name }}</span>
            <span class="t-id">{{ t.id | slice:0:8 }}</span>
          </div>
          <div class="t-stats">
            <div class="stat">
              <span class="s-val">{{ t.missionCount }}</span>
              <span class="s-lab">Missions</span>
            </div>
            <div class="stat cost">
              <span class="s-val">\${{ t.totalCost | number:'1.2-2' }}</span>
              <span class="s-lab">Cost</span>
            </div>
          </div>
          <!-- Noisy Neighbor Detection (Simulated) -->
          <div class="noisy-indicator" *ngIf="t.totalCost > 100">
             <lucide-icon name="alert-triangle" class="icon-xs"></lucide-icon>
             <span>Quota Pressure</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tenant-card { padding: 1.5rem; border-radius: 20px; }
    .card-header { display: flex; align-items: center; gap: 0.8rem; margin-bottom: 1.5rem; }
    h3 { margin: 0; font-size: 1rem; color: #909094; text-transform: uppercase; }
    .tenant-list { display: flex; flex-direction: column; gap: 1rem; }
    .tenant-item { 
      display: flex; justify-content: space-between; align-items: center; 
      padding: 1rem; background: rgba(255, 255, 255, 0.02); border-radius: 12px;
      transition: background 0.2s;
    }
    .tenant-item:hover { background: rgba(255, 255, 255, 0.04); }
    .t-info { display: flex; flex-direction: column; }
    .t-name { font-weight: 600; color: #fff; }
    .t-id { font-size: 0.7rem; color: #666; font-family: monospace; }
    .t-stats { display: flex; gap: 2rem; }
    .stat { display: flex; flex-direction: column; align-items: flex-end; }
    .s-val { font-weight: 700; color: #fff; font-size: 0.9rem; }
    .s-lab { font-size: 0.65rem; color: #666; text-transform: uppercase; }
    .cost .s-val { color: #2ae500; }
    .noisy-indicator { 
      display: flex; align-items: center; gap: 0.4rem; 
      color: #ffb4ab; font-size: 0.7rem; font-weight: 700;
      background: rgba(255, 180, 171, 0.1); padding: 0.3rem 0.6rem; border-radius: 4px;
    }
  `]
})
export class TenantOverviewComponent implements OnInit {
  private adminService = inject(AdminService);
  tenants$!: Observable<any[]>;

  ngOnInit() {
    this.tenants$ = this.adminService.getTenantSummary();
  }
}

import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MissionFacade } from './mission.facade';
import { StatusBadgeComponent } from '../../shared/components/status-badge';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton';
import { SystemHealthService } from '../../core/services/system-health.service';
import { map } from 'rxjs';
import { Mission } from './mission.model';
import { WelcomeGuideComponent } from '../../shared/components/welcome-guide/welcome-guide.component';
import { QuotaAlertComponent } from '../../shared/components/quota-alert/quota-alert.component';
import { MissionLauncherComponent } from './mission-launcher';

@Component({
  selector: 'app-mission-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, StatusBadgeComponent, LoadingSkeletonComponent, QuotaAlertComponent, WelcomeGuideComponent, MissionLauncherComponent],
  template: `
    <app-quota-alert 
      [show]="showQuotaAlert"
      [reason]="quotaReason"
      [resetInMs]="quotaResetInMs"
      [suggestedAction]="quotaSuggestedAction"
      (dismiss)="showQuotaAlert = false"
      (upgrade)="onUpgrade()">
    </app-quota-alert>

    <div class="page-header">
      <h1>Missions</h1>
    </div>

    <app-mission-launcher 
      [loading]="(isCreating$ | async) || false" 
      (launch)="onLaunchMission($event)">
    </app-mission-launcher>

    <div class="card table-card" *ngIf="(missions$ | async) as missions; else loading">
      <table class="mission-table" *ngIf="missions.length > 0">
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Retries</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let mission of missions; trackBy: trackById">
            <td class="id-cell">{{ mission.id.substring(0, 8) }}...</td>
            <td>
              <app-status-badge [status]="mission.status"></app-status-badge>
            </td>
            <td>{{ mission.retries }}</td>
            <td>{{ mission.createdAt | date:'short' }}</td>
            <td>
              <button class="btn-icon" [routerLink]="['/missions', mission.id]">View</button>
            </td>
          </tr>
        </tbody>
      </table>

      <app-welcome-guide 
        *ngIf="missions.length === 0" 
        (start)="onCreateMission()">
      </app-welcome-guide>
      
      <div class="table-footer" *ngIf="missions.length > 0">
        <div class="pagination">
          <button (click)="setPage(currentPage - 1)" [disabled]="currentPage === 1">Prev</button>
          <span>Page {{ currentPage }}</span>
          <button (click)="setPage(currentPage + 1)" [disabled]="missions.length <= currentPage * pageSize">Next</button>
        </div>
      </div>
    </div>

    <ng-template #loading>
      <div class="card table-card">
        <table class="mission-table">
          <tbody>
            <tr *ngFor="let i of [1,2,3,4,5]">
              <td><app-loading-skeleton width="80px"></app-loading-skeleton></td>
              <td><app-loading-skeleton width="60px"></app-loading-skeleton></td>
              <td><app-loading-skeleton width="20px"></app-loading-skeleton></td>
              <td><app-loading-skeleton width="120px"></app-loading-skeleton></td>
              <td><app-loading-skeleton width="50px"></app-loading-skeleton></td>
            </tr>
          </tbody>
        </table>
      </div>
    </ng-template>
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #fff;
    }
    .btn-primary {
      background: #3b82f6;
      color: #fff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-primary:hover {
      background: #2563eb;
    }
    .card {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      backdrop-filter: blur(8px);
      overflow: hidden;
    }
    .mission-table {
      width: 100%;
      border-collapse: collapse;
      color: #fff;
    }
    .mission-table th {
      text-align: left;
      padding: 16px 24px;
      background: rgba(255, 255, 255, 0.03);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.6;
    }
    .mission-table td {
      padding: 16px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 0.875rem;
    }
    .id-cell {
      font-family: monospace;
      color: #60a5fa;
    }
    .empty-state {
      text-align: center;
      padding: 48px !important;
      opacity: 0.5;
    }
    .btn-icon {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #fff;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 0.75rem;
      cursor: pointer;
    }
    .btn-icon:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    .table-footer {
      padding: 12px 24px;
      background: rgba(255, 255, 255, 0.02);
      display: flex;
      justify-content: flex-end;
    }
    .pagination {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 0.875rem;
      opacity: 0.8;
    }
    .pagination button {
      background: transparent;
      border: 1px solid rgba(255,255,255,0.2);
      color: #fff;
      padding: 4px 12px;
      border-radius: 4px;
      cursor: pointer;
    }
    .pagination button:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
  `]
})
export class MissionListComponent {
  private facade = inject(MissionFacade);
  private health = inject(SystemHealthService);
  private router = inject(Router);

  missions$ = this.facade.missions$;
  isCreating$ = this.facade.missions$.pipe(map(m => false)); 

  isQuotaExceeded$ = this.health.metrics$.pipe(
    map(m => m ? m.queueDepth >= 20 : false)
  );

  showQuotaAlert = false;
  quotaReason = '';
  quotaResetInMs?: number;
  quotaSuggestedAction?: string;

  pageSize = 10;
  currentPage = 1;

  constructor() { }

  get paginatedMissions$() {
    return this.missions$.pipe(
      map(missions => {
        const start = (this.currentPage - 1) * this.pageSize;
        return missions.slice(start, start + this.pageSize);
      })
    );
  }

  setPage(page: number) {
    this.currentPage = page;
  }

  trackById(index: number, item: Mission) {
    return item.id;
  }

  onLaunchMission(prompt: string) {
    const mission = {
      title: prompt.substring(0, 50),
      prompt: prompt,
      tenantId: 'test-tenant',
      projectId: 'test-project'
    };

    this.facade.createMission(mission).subscribe({
      next: (res: any) => {
        console.log('Mission launched:', res);
        if (res.id) {
          this.router.navigate(['/missions', res.id]);
        }
      },
      error: (err) => {
        if (err.status === 403 && err.error?.code === 'ENFORCEMENT_VIOLATION') {
          const enforcement = err.error.enforcement;
          this.quotaReason = err.error.reason;
          this.quotaResetInMs = enforcement?.resetInMs;
          this.quotaSuggestedAction = enforcement?.suggestedAction;
          this.showQuotaAlert = true;
        } else {
          console.error('Launch failed:', err);
        }
      }
    });
  }

  onCreateMission() {
    this.onLaunchMission('New Manual Mission');
  }

  onUpgrade() {
    console.log('Navigating to pricing page...');
    this.router.navigate(['/pricing']);
  }
}

@Component({
  selector: 'app-mission-loading',
  standalone: true,
  imports: [CommonModule, LoadingSkeletonComponent],
  template: `
    <div class="card table-card">
      <table class="mission-table">
        <tbody>
          <tr *ngFor="let i of [1,2,3,4,5]">
            <td><app-loading-skeleton width="80px"></app-loading-skeleton></td>
            <td><app-loading-skeleton width="60px"></app-loading-skeleton></td>
            <td><app-loading-skeleton width="20px"></app-loading-skeleton></td>
            <td><app-loading-skeleton width="120px"></app-loading-skeleton></td>
            <td><app-loading-skeleton width="50px"></app-loading-skeleton></td>
          </tr>
        </tbody>
      </table>
    </div>
  `
})
export class MissionLoadingComponent { }

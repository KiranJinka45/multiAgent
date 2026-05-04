import { Routes } from '@angular/router';
import { ShellComponent } from './layout/components/shell';
import { MissionListComponent } from './features/missions/mission-list';
import { MissionDetailComponent } from './features/missions/mission-detail';
import { TimelineViewComponent } from './features/timeline/timeline-view';
import { SystemHealthComponent } from './features/system-health/system-health';

export const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent)
  },
  {
    path: 'onboarding',
    loadComponent: () => import('./features/onboarding/onboarding.component').then(m => m.OnboardingComponent)
  },
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', redirectTo: 'missions', pathMatch: 'full' },
      { path: 'missions', component: MissionListComponent },
      { path: 'missions/:id', component: MissionDetailComponent },
      { path: 'timeline', component: TimelineViewComponent },
      { path: 'health', component: SystemHealthComponent },
      { path: 'usage', loadComponent: () => import('./features/usage/usage.component').then(m => m.UsageComponent) },
      { path: 'pricing', loadComponent: () => import('./features/pricing/pricing.component').then(m => m.PricingComponent) },
      { 
        path: 'sre-observability', 
        loadComponent: () => import('./features/sre-observability/sre-observability').then(m => m.SreObservabilityComponent) 
      },
      {
        path: 'audit',
        loadComponent: () => import('./features/audit/audit-verifier').then(m => m.AuditVerifierComponent)
      },
      {
        path: 'demo/financial-approval',
        loadComponent: () => import('./features/demo/financial-approval-demo.component').then(m => m.FinancialApprovalDemoComponent)
      },
      {
        path: 'ztan/trust',
        loadComponent: () => import('./features/ztan/trust-dashboard.component').then(m => m.ZtanTrustDashboardComponent)
      },
      {
        path: 'console',
        loadComponent: () => import('./console/console.component').then(m => m.ConsoleComponent)
      }
    ]
  }
];

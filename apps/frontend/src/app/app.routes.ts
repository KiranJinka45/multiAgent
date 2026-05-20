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
      { path: '', redirectTo: 'console', pathMatch: 'full' },
      {
        path: 'console',
        loadComponent: () => import('./features/console-home/console-home').then(m => m.ConsoleHomeComponent)
      },
      {
        path: 'dev-console',
        loadComponent: () => import('./console/console.component').then(m => m.ConsoleComponent)
      },
      { 
        path: 'incidents', 
        loadComponent: () => import('./features/incidents/incident-center').then(m => m.IncidentCenterComponent) 
      },
      { 
        path: 'replay', 
        loadComponent: () => import('./features/replay-explorer/replay-explorer.component').then(m => m.ReplayExplorerComponent) 
      },
      { 
        path: 'recovery', 
        loadComponent: () => import('./features/system-health/system-health').then(m => m.SystemHealthComponent) 
      },
      {
        path: 'stewardship',
        loadComponent: () => import('./features/ztan/trust-dashboard.component').then(m => m.StewardshipHubComponent)
      },
      {
        path: 'audit',
        loadComponent: () => import('./features/audit/audit-verifier').then(m => m.AuditVerifierComponent)
      },
      
      // Legacy / Feature Specific
      { path: 'missions', component: MissionListComponent },
      { path: 'missions/:id', component: MissionDetailComponent },
      { path: 'health', component: SystemHealthComponent },
      { path: 'usage', loadComponent: () => import('./features/usage/usage.component').then(m => m.UsageComponent) },
      { 
        path: 'sre-observability', 
        loadComponent: () => import('./features/sre-observability/sre-observability').then(m => m.SreObservabilityComponent) 
      },
      {
        path: 'ztan/stability',
        loadComponent: () => import('./features/ztan/trust-dashboard.component').then(m => m.StewardshipHubComponent)
      }
    ]
  }
];


import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { 
    path: 'home', 
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) 
  },
  { 
    path: 'incidents', 
    loadComponent: () => import('./pages/incidents/incident-center.component').then(m => m.IncidentCenterComponent) 
  },
  { 
    path: 'replay', 
    loadComponent: () => import('./pages/replay/replay-explorer.component').then(m => m.ReplayExplorerComponent) 
  },
  { 
    path: 'recovery', 
    loadComponent: () => import('./pages/recovery/recovery-console.component').then(m => m.RecoveryConsoleComponent) 
  },
  { 
    path: 'stewardship', 
    loadComponent: () => import('./pages/stewardship/stewardship-hub.component').then(m => m.StewardshipHubComponent) 
  },
  { 
    path: 'governance', 
    loadComponent: () => import('./pages/governance/governance-registry.component').then(m => m.GovernanceRegistryComponent) 
  }
];

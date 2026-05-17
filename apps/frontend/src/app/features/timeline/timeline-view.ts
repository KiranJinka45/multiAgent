import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SreDataService } from '../../core/services/sre-data.service';
import { SystemHealthService } from '../../core/services/system-health.service';
import { 
  History, 
  Search, 
  Filter, 
  ShieldCheck, 
  AlertTriangle, 
  Zap, 
  Database, 
  Terminal,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Lock,
  Server
} from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';
import { FormsModule } from '@angular/forms';

interface ReplayEvent {
  id: string;
  timestamp: number;
  type: 'AUDIT' | 'INFRA' | 'SECURITY' | 'LOGIC';
  source: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata?: any;
  expanded?: boolean;
}

@Component({
  selector: 'app-timeline-view',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  template: `
    <div class="replay-explorer">
      <!-- Explorer Header -->
      <div class="explorer-header">
        <div class="title-group">
          <lucide-icon [name]="History" class="header-icon"></lucide-icon>
          <div>
            <h1>Replay Explorer</h1>
            <p class="subtitle">Longitudinal Evidence Ledger • 180d Retention Active</p>
          </div>
        </div>
        
        <div class="filter-bar">
          <div class="search-input">
            <lucide-icon [name]="Search" class="search-icon"></lucide-icon>
            <input type="text" placeholder="Filter by event hash, source, or message..." [(ngModel)]="searchQuery">
          </div>
          <div class="type-filters">
            <button class="filter-chip" [class.active]="activeType === 'ALL'" (click)="activeType = 'ALL'">ALL</button>
            <button class="filter-chip" [class.active]="activeType === 'AUDIT'" (click)="activeType = 'AUDIT'">AUDIT</button>
            <button class="filter-chip" [class.active]="activeType === 'SECURITY'" (click)="activeType = 'SECURITY'">SECURITY</button>
            <button class="filter-chip" [class.active]="activeType === 'INFRA'" (click)="activeType = 'INFRA'">INFRA</button>
          </div>
        </div>
      </div>

      <!-- Replay Ledger -->
      <div class="ledger-container">
        <div class="ledger-header">
          <span class="col-timestamp">TIMESTAMP</span>
          <span class="col-type">TYPE</span>
          <span class="col-source">SOURCE</span>
          <span class="col-event">EVENT</span>
          <span class="col-actions"></span>
        </div>

        <div class="ledger-body">
          <ng-container *ngFor="let event of filteredEvents(); trackBy: trackByFn">
            <div class="event-row" [class.expanded]="event.expanded" (click)="toggleEvent(event)">
              <div class="col-timestamp mono">{{ event.timestamp | date:'HH:mm:ss.SSS' }}</div>
              <div class="col-type">
                <span class="type-tag" [class]="event.type.toLowerCase()">
                  <lucide-icon [name]="getEventIcon(event.type)" class="tag-icon"></lucide-icon>
                  {{ event.type }}
                </span>
              </div>
              <div class="col-source mono">{{ event.source }}</div>
              <div class="col-event">
                <span class="message">{{ event.message }}</span>
                <span class="hash mono" *ngIf="!event.expanded">{{ event.id.substring(0, 8) }}</span>
              </div>
              <div class="col-actions">
                <lucide-icon [name]="event.expanded ? ChevronDown : ChevronRight" class="expand-icon"></lucide-icon>
              </div>
            </div>

            <!-- Expanded Evidence Panel -->
            <div class="evidence-panel" *ngIf="event.expanded">
              <div class="panel-header">
                <h3>DETERMINISTIC EVIDENCE BUNDLE</h3>
                <span class="hash mono">{{ event.id }}</span>
              </div>
              <div class="evidence-grid">
                <div class="evidence-item">
                  <span class="label">CRITICALITY</span>
                  <span class="value" [class]="event.severity.toLowerCase()">{{ event.severity }}</span>
                </div>
                <div class="evidence-item">
                  <span class="label">SIGNING KEY</span>
                  <span class="value mono">0x72a8...3e9f</span>
                </div>
                <div class="evidence-item">
                  <span class="label">VERIFICATION</span>
                  <span class="value healthy">VALIDATED</span>
                </div>
              </div>
              <div class="raw-data">
                <div class="raw-header">
                  <span>RAW TELEMETRY</span>
                  <button class="copy-btn">Copy JSON</button>
                </div>
                <pre class="mono">{{ event.metadata | json }}</pre>
              </div>
            </div>
          </ng-container>

          <div class="empty-state" *ngIf="filteredEvents().length === 0">
            <lucide-icon [name]="Terminal" class="empty-icon"></lucide-icon>
            <p>No events match the current filter criteria.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .replay-explorer {
      display: flex;
      flex-direction: column;
      height: 100%;
      gap: 1.5rem;
    }
    .explorer-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid hsl(var(--border-muted));
    }
    .title-group { display: flex; align-items: center; gap: 1rem; }
    .header-icon { width: 32px; height: 32px; color: hsl(var(--primary)); }
    .explorer-header h1 { margin: 0; font-size: 1.5rem; font-weight: 800; }
    .subtitle { margin: 0; font-size: 0.8125rem; color: hsl(var(--text-dim)); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }

    .filter-bar { display: flex; gap: 1rem; align-items: center; }
    .search-input { position: relative; }
    .search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; color: hsl(var(--text-dim)); }
    .search-input input {
      padding: 0.5rem 0.75rem 0.5rem 2.25rem;
      background: hsl(var(--bg-elevated));
      border: 1px solid hsl(var(--border-muted));
      border-radius: 4px;
      color: hsl(var(--text-main));
      font-size: 0.875rem;
      width: 300px;
    }
    .search-input input:focus { outline: none; border-color: hsl(var(--primary)); }

    .type-filters { display: flex; gap: 0.5rem; }
    .filter-chip {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 700;
      background: hsl(var(--bg-elevated));
      border: 1px solid hsl(var(--border-muted));
      border-radius: 4px;
      color: hsl(var(--text-dim));
      cursor: pointer;
      transition: all 0.2s;
    }
    .filter-chip.active {
      background: hsl(var(--primary));
      color: white;
      border-color: hsl(var(--primary));
    }

    .ledger-container {
      display: flex;
      flex-direction: column;
      background: hsl(var(--bg-surface));
      border: 1px solid hsl(var(--border-muted));
      border-radius: 4px;
      overflow: hidden;
    }
    .ledger-header {
      display: flex;
      padding: 0.75rem 1rem;
      background: hsl(var(--bg-elevated));
      border-bottom: 1px solid hsl(var(--border-muted));
      font-size: 0.65rem;
      font-weight: 800;
      color: hsl(var(--text-dim));
      letter-spacing: 0.1em;
    }
    .ledger-body { overflow-y: auto; max-height: calc(100vh - 250px); }

    .event-row {
      display: flex;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid hsl(var(--border-muted));
      cursor: pointer;
      align-items: center;
      transition: background 0.15s;
    }
    .event-row:hover { background: hsl(var(--bg-app)); }
    .event-row.expanded { background: hsl(var(--bg-app)); border-bottom: none; }

    .col-timestamp { width: 120px; font-size: 0.8125rem; color: hsl(var(--text-dim)); }
    .col-type { width: 130px; }
    .col-source { width: 150px; font-size: 0.8125rem; color: hsl(var(--text-muted)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .col-event { flex: 1; display: flex; align-items: center; gap: 1rem; overflow: hidden; }
    .col-event .message { font-size: 0.875rem; color: hsl(var(--text-main)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .col-event .hash { font-size: 0.65rem; color: hsl(var(--text-dim)); background: hsl(var(--bg-elevated)); padding: 0.125rem 0.375rem; border-radius: 2px; }
    .col-actions { width: 40px; display: flex; justify-content: flex-end; }
    .expand-icon { width: 16px; height: 16px; color: hsl(var(--text-dim)); }

    .type-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.65rem;
      font-weight: 800;
      padding: 0.25rem 0.5rem;
      border-radius: 2px;
      background: hsl(var(--bg-elevated));
    }
    .type-tag.audit { color: hsl(var(--primary)); background: hsl(var(--primary) / 0.1); }
    .type-tag.security { color: hsl(var(--status-critical)); background: hsl(var(--status-critical) / 0.1); }
    .type-tag.infra { color: hsl(var(--status-recovering)); background: hsl(var(--status-recovering) / 0.1); }
    .type-tag.logic { color: hsl(var(--status-warning)); background: hsl(var(--status-warning) / 0.1); }
    .tag-icon { width: 10px; height: 10px; }

    .evidence-panel {
      padding: 1.5rem;
      background: hsl(var(--bg-app));
      border-bottom: 1px solid hsl(var(--border-muted));
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .panel-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .panel-header h3 { margin: 0; font-size: 0.75rem; font-weight: 800; color: hsl(var(--text-dim)); letter-spacing: 0.05em; }
    .panel-header .hash { font-size: 0.75rem; color: hsl(var(--text-muted)); }

    .evidence-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
    .evidence-item { display: flex; flex-direction: column; gap: 0.25rem; }
    .evidence-item .label { font-size: 0.6rem; font-weight: 700; color: hsl(var(--text-dim)); text-transform: uppercase; }
    .evidence-item .value { font-size: 0.875rem; font-weight: 600; }
    .evidence-item .value.critical { color: hsl(var(--status-critical)); }
    .evidence-item .value.healthy { color: hsl(var(--status-healthy)); }

    .raw-data { background: hsl(var(--bg-surface)); border: 1px solid hsl(var(--border-muted)); border-radius: 4px; overflow: hidden; }
    .raw-header { padding: 0.5rem 1rem; background: hsl(var(--bg-elevated)); display: flex; justify-content: space-between; align-items: center; font-size: 0.65rem; font-weight: 700; color: hsl(var(--text-dim)); }
    .copy-btn { background: none; border: 1px solid hsl(var(--border-muted)); color: hsl(var(--text-dim)); padding: 0.125rem 0.5rem; border-radius: 2px; cursor: pointer; font-size: 0.6rem; font-weight: 700; }
    .copy-btn:hover { background: hsl(var(--bg-app)); color: hsl(var(--text-main)); }
    pre { margin: 0; padding: 1rem; font-size: 0.75rem; color: hsl(var(--text-muted)); overflow-x: auto; }

    .empty-state { padding: 4rem; text-align: center; color: hsl(var(--text-dim)); }
    .empty-icon { width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.2; }
  `]
})
export class TimelineViewComponent {
  sre = inject(SreDataService);
  health = inject(SystemHealthService);

  searchQuery = '';
  activeType: 'ALL' | 'AUDIT' | 'SECURITY' | 'INFRA' | 'LOGIC' = 'ALL';

  readonly History = History;
  readonly Search = Search;
  readonly Filter = Filter;
  readonly Terminal = Terminal;
  readonly ChevronDown = ChevronDown;
  readonly ChevronRight = ChevronRight;

  // Mocked/Derived events based on telemetry
  events = signal<ReplayEvent[]>([
    {
      id: '72f8a9e1d3e4b5a6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
      timestamp: Date.now() - 5000,
      type: 'SECURITY',
      source: 'ztan-gate-01',
      message: 'Cryptographic binding verified for tenant 0x4492',
      severity: 'LOW',
      metadata: { tenantId: '0x4492', proofType: 'ThresholdBLS', status: 'SUCCESS' }
    },
    {
      id: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b72f8a9e1d3e4b5a6c7d8e9f0',
      timestamp: Date.now() - 120000,
      type: 'INFRA',
      source: 'kube-controller',
      message: 'Node api-service-7f4c scaled to 3 replicas',
      severity: 'MEDIUM',
      metadata: { cluster: 'prod-us-east', target: 'api-service', replicas: 3 }
    },
    {
      id: 'c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b72f8a9e1d3e4b5a6',
      timestamp: Date.now() - 600000,
      type: 'AUDIT',
      source: 'governance-svc',
      message: 'Policy update: Restricted outbound egress for worker-pool-alpha',
      severity: 'HIGH',
      metadata: { policyId: 'egress-001', actor: 'operator-12', result: 'COMMITTED' }
    }
  ]);

  filteredEvents = computed(() => {
    return this.events().filter(e => {
      const matchesSearch = this.searchQuery === '' || 
        e.message.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        e.id.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        e.source.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchesType = this.activeType === 'ALL' || e.type === this.activeType;
      
      return matchesSearch && matchesType;
    });
  });

  toggleEvent(event: ReplayEvent) {
    event.expanded = !event.expanded;
  }

  getEventIcon(type: string): any {
    switch (type) {
      case 'AUDIT': return Lock;
      case 'SECURITY': return ShieldCheck;
      case 'INFRA': return Server;
      case 'LOGIC': return Zap;
      default: return Terminal;
    }
  }

  trackByFn(index: number, item: ReplayEvent) {
    return item.id;
  }
}

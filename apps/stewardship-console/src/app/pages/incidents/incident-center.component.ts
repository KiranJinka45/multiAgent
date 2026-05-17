import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StewardshipService } from '../../stewardship.service';

@Component({
  selector: 'app-incident-center',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <header class="page-header">
        <h1>Institutional Incident & Blast Radius Center</h1>
        <p>Live situational awareness and architectural failure propagation validation.</p>
      </header>

      <div class="incident-layout">
        
        <!-- LEFT: ACTIVE INCIDENTS QUEUE -->
        <section class="incident-queue">
          <h3>ACTIVE INCIDENTS ({{ (state$ | async)?.activeIncidents?.length ?? 0 }})</h3>
          
          <!-- Empty State -->
          <div class="empty-state" *ngIf="((state$ | async)?.activeIncidents?.length ?? 0) === 0">
            <span class="icon">✓</span>
            <p>System operational calmness verified.</p>
            <span class="sub">No active adversarial attacks or institutional drift events detected. Baseline matches Epoch {{ (state$ | async)?.epoch }}.</span>
          </div>

          <!-- Incidents List -->
          <div class="incidents-list" *ngIf="((state$ | async)?.activeIncidents?.length ?? 0) > 0">
            <div *ngFor="let incident of (state$ | async)?.activeIncidents" 
                 class="incident-item" 
                 [class.selected]="selectedIncident === incident"
                 (click)="selectIncident(incident)">
              <div class="item-header">
                <span class="severity-badge" [class]="incident.severity">{{ incident.severity }}</span>
                <span class="time">{{ incident.timestamp | date:'HH:mm:ss' }} UTC</span>
              </div>
              <div class="title">{{ incident.title }}</div>
              <p class="desc">{{ incident.description }}</p>
              <div class="item-footer">
                <span class="type-tag">{{ incident.type }}</span>
                <span class="action-prompt">Click to render Blast Radius</span>
              </div>
            </div>
          </div>
        </section>

        <!-- RIGHT: BLAST RADIUS TRIAGE & TOPOLOGY MAP -->
        <section class="triage-panel">
          <h3>BLAST RADIUS TOPOLOGY TRIAGE</h3>
          
          <div class="topology-container" *ngIf="selectedIncident">
            <div class="topology-header">
              <span class="active-title">FRACTURE TOPOLOGY: {{ selectedIncident.type }}</span>
            </div>

            <!-- DYNAMIC TOPOLOGY DIAGRAM -->
            <div class="topology-nodes">
              
              <!-- Core Ledger Node -->
              <div class="node" [class.fractured]="selectedIncident.type === 'REPLAY_POISONING' || selectedIncident.type === 'TOTAL_QUORUM_FAILURE'">
                <div class="node-icon">📜</div>
                <div class="node-name">Ledger Lineage</div>
                <div class="node-status">{{ (selectedIncident.type === 'REPLAY_POISONING' || selectedIncident.type === 'TOTAL_QUORUM_FAILURE') ? 'FRACTURED' : 'STABLE' }}</div>
              </div>

              <div class="connector"></div>

              <!-- Consensus Registry Node -->
              <div class="node" [class.fractured]="selectedIncident.type === 'GOVERNANCE_COLLAPSE' || selectedIncident.type === 'TOTAL_QUORUM_FAILURE'">
                <div class="node-icon">⚖️</div>
                <div class="node-name">Consensus Registry</div>
                <div class="node-status">{{ (selectedIncident.type === 'GOVERNANCE_COLLAPSE' || selectedIncident.type === 'TOTAL_QUORUM_FAILURE') ? 'COLLAPSED' : 'STABLE' }}</div>
              </div>

              <div class="connector"></div>

              <!-- Telemetry Stream Node -->
              <div class="node" [class.fractured]="selectedIncident.type === 'TELEMETRY_EROSION' || selectedIncident.type === 'TOTAL_QUORUM_FAILURE'">
                <div class="node-icon">📡</div>
                <div class="node-name">Telemetry Stream</div>
                <div class="node-status">{{ (selectedIncident.type === 'TELEMETRY_EROSION' || selectedIncident.type === 'TOTAL_QUORUM_FAILURE') ? 'ERODED' : 'STABLE' }}</div>
              </div>

              <div class="connector"></div>

              <!-- Physical Anchor Node -->
              <div class="node" [class.fractured]="selectedIncident.type === 'TOTAL_QUORUM_FAILURE'">
                <div class="node-icon">🔐</div>
                <div class="node-name">HSM Anchor</div>
                <div class="node-status">{{ selectedIncident.type === 'TOTAL_QUORUM_FAILURE' ? 'OFFLINE' : 'STABLE' }}</div>
              </div>

            </div>

            <div class="topology-verdict">
              <label>PROPAGATION EFFECT</label>
              <p *ngIf="selectedIncident.type === 'REPLAY_POISONING'">Chain fractured. Ledger is in an <strong>UNTRUSTED</strong> state. Multi-party verification blocks automatically, preventing standard restoration pathways.</p>
              <p *ngIf="selectedIncident.type === 'TELEMETRY_EROSION'">Significant information erosion. Operators are blind to specific event sequences. Causal lineage verification is lagging.</p>
              <p *ngIf="selectedIncident.type === 'GOVERNANCE_COLLAPSE'">Epoch registry deadlocked. Safe Mode has locked standard restoration pathways. supervisor level oversight is physically mandated.</p>
              <p *ngIf="selectedIncident.type === 'RITUAL_DECAY'">No critical software fracture, but sociological warning: narratives below character limits. Approval mechanisms rubber-stamping.</p>
              <p *ngIf="selectedIncident.type === 'FREEZE_PRESSURE'">Restraint pressure test: governance proposals flood the queue. Rejecting capability extensions is required to retain focus.</p>
              <p *ngIf="selectedIncident.type === 'TOTAL_QUORUM_FAILURE'">Consensus engine and hardware anchor both offline. <strong>TOTAL PLATFORM LOCKDOWN</strong>. Requires physical manual override ceremony.</p>
            </div>
          </div>

          <div class="topology-placeholder" *ngIf="!selectedIncident">
            <div class="ph-content">
              <span class="icon">🔍</span>
              <p>Select an active incident from the queue to render real-time propagation failure topology.</p>
            </div>
          </div>

          <!-- TRIAGE METRICS -->
          <div class="triage-metrics">
            <div class="t-met">
              <label>IMPACT TIER</label>
              <span [style.color]="selectedIncident ? '#ef4444' : '#10b981'">
                {{ selectedIncident ? (selectedIncident.severity === 'CRITICAL' ? 'SEVERE CASUAL FRACTURE' : 'MODERATE COMPROMISE') : 'NOMINAL' }}
              </span>
            </div>
            <div class="t-met">
              <label>RECOVERY BLOCKING</label>
              <span>{{ (state$ | async)?.isSafeMode ? 'ACTIVE LOCKS ON RESTORATION' : 'NO LOCKS' }}</span>
            </div>
          </div>
        </section>

      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 2rem; height: 100%; overflow: hidden; display: flex; flex-direction: column; box-sizing: border-box; }
    .page-header { margin-bottom: 1.5rem; flex-shrink: 0; }
    h1 { font-size: 1.3rem; font-weight: 800; margin: 0 0 0.5rem 0; color: #f3f4f6; }
    p { font-size: 0.85rem; color: #9ca3af; margin: 0; }

    .incident-layout { display: grid; grid-template-columns: 1fr 340px; gap: 1.5rem; flex: 1; overflow: hidden; }
    h3 { font-size: 0.7rem; font-weight: 800; color: #9ca3af; margin: 0 0 1.25rem 0; letter-spacing: 0.05em; text-transform: uppercase; }

    .incident-queue { background: #090d16; border: 1px solid #111827; padding: 1.5rem; display: flex; flex-direction: column; overflow-y: auto; border-radius: 8px; }
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; flex-grow: 1; color: #4b5563; padding: 2rem; }
    .empty-state .icon { font-size: 2.5rem; margin-bottom: 0.75rem; color: #10b981; }
    .empty-state p { text-align: center; font-weight: 800; font-size: 0.95rem; max-width: 300px; color: #e5e7eb; margin: 0 0 0.5rem 0; }
    .empty-state .sub { text-align: center; font-size: 0.75rem; color: #6b7280; max-width: 280px; line-height: 1.4; }

    .incidents-list { display: flex; flex-direction: column; gap: 1rem; }
    .incident-item { background: #030712; border: 1px solid #1f2937; border-left: 4px solid #ef4444; padding: 1.25rem; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
    .incident-item:hover { border-color: #ef4444; background: rgba(239, 68, 68, 0.02); }
    .incident-item.selected { border-color: #ef4444; background: rgba(239, 68, 68, 0.04); box-shadow: 0 0 10px rgba(239, 68, 68, 0.05); }

    .item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .severity-badge { font-size: 0.55rem; font-weight: 900; padding: 2px 6px; border-radius: 2px; }
    .severity-badge.CRITICAL { background: #7f1d1d; color: #fca5a5; }
    .severity-badge.HIGH { background: #7c2d12; color: #ffedd5; }
    .severity-badge.MEDIUM { background: #78350f; color: #fef3c7; }
    
    .time { font-size: 0.65rem; color: #4b5563; font-family: 'JetBrains Mono'; font-weight: 700; }
    .title { font-size: 0.85rem; font-weight: 800; color: #f3f4f6; margin-bottom: 0.25rem; }
    .incident-item .desc { font-size: 0.75rem; color: #9ca3af; line-height: 1.4; margin-bottom: 0.75rem; }
    
    .item-footer { display: flex; justify-content: space-between; align-items: center; }
    .type-tag { font-size: 0.6rem; font-family: 'JetBrains Mono'; color: #f59e0b; background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.1); padding: 1px 4px; }
    .action-prompt { font-size: 0.6rem; color: #6b7280; font-weight: 700; }

    .triage-panel { display: flex; flex-direction: column; overflow: hidden; }
    
    .topology-container { flex: 1; background: #090d16; border: 1px solid #111827; padding: 1.25rem; border-radius: 8px; display: flex; flex-direction: column; overflow-y: auto; }
    .topology-header { border-bottom: 1px solid #111827; padding-bottom: 0.75rem; margin-bottom: 1rem; }
    .active-title { font-size: 0.65rem; font-weight: 900; font-family: 'JetBrains Mono'; color: #f59e0b; }

    /* Nodes styling */
    .topology-nodes { display: flex; flex-direction: column; gap: 0.5rem; align-items: center; padding: 1rem 0; }
    .node { display: flex; align-items: center; gap: 1rem; background: #030712; border: 1px solid #1f2937; border-left: 3px solid #10b981; padding: 0.5rem 1rem; width: 220px; border-radius: 6px; }
    .node.fractured { border-left-color: #ef4444; background: rgba(239, 68, 68, 0.02); }
    .node-icon { font-size: 1.1rem; }
    .node-name { font-size: 0.75rem; font-weight: 800; color: #cbd5e1; flex-grow: 1; }
    .node-status { font-size: 0.6rem; font-weight: 900; font-family: 'JetBrains Mono'; color: #10b981; }
    .node.fractured .node-status { color: #ef4444; }
    
    .connector { height: 16px; width: 2px; background: #1f2937; }

    .topology-verdict { margin-top: 1rem; border-top: 1px solid #111827; padding-top: 1rem; }
    .topology-verdict label { font-size: 0.55rem; font-weight: 900; color: #4b5563; display: block; margin-bottom: 0.25rem; }
    .topology-verdict p { font-size: 0.75rem; color: #9ca3af; line-height: 1.4; }

    .topology-placeholder { flex: 1; background: #090d16; border: 1px solid #111827; border-radius: 8px; display: flex; align-items: center; justify-content: center; padding: 2rem; }
    .ph-content { display: flex; flex-direction: column; align-items: center; color: #4b5563; }
    .ph-content .icon { font-size: 2rem; margin-bottom: 0.5rem; }
    .ph-content p { text-align: center; font-size: 0.75rem; color: #6b7280; line-height: 1.4; max-width: 200px; }

    .triage-metrics { display: flex; flex-direction: column; gap: 0.75rem; background: #090d16; padding: 1.25rem; border: 1px solid #111827; border-radius: 8px; margin-top: 1rem; }
    .t-met { display: flex; flex-direction: column; gap: 0.15rem; }
    .t-met label { font-size: 0.55rem; font-weight: 800; color: #4b5563; }
    .t-met span { font-size: 0.85rem; font-weight: 800; font-family: 'JetBrains Mono'; color: #e5e7eb; }
  `]
})
export class IncidentCenterComponent {
  private stewardship = inject(StewardshipService);
  state$ = this.stewardship.state$;
  selectedIncident: any = null;

  selectIncident(incident: any) {
    this.selectedIncident = this.selectedIncident === incident ? null : incident;
  }
}

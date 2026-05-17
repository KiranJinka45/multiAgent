import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StewardshipService } from '../../stewardship.service';

@Component({
  selector: 'app-replay-explorer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="grid-layout">
      <!-- LEDGER HEALTH PANEL (Left) -->
      <aside class="side-panel health-panel">
        <h3>LEDGER INTEGRITY STATE</h3>
        <p class="panel-desc">Continuous cryptographic validation of the multi-signature replay ledger.</p>
        
        <div class="metrics-stack">
          <div class="m-card">
            <label>MERKLE REPLAY INTEGRITY</label>
            <span class="m-val" [class.danger]="((state$ | async)?.replayIntegrity ?? 100) < 50">
              {{ (state$ | async)?.replayIntegrity }}%
            </span>
          </div>

          <div class="m-card">
            <label>ROOT HASH (EPOCH {{ (state$ | async)?.epoch }})</label>
            <code class="hash-code">0x74a9f933f2...</code>
          </div>

          <div class="m-card">
            <label>CHRONOLOGY INTEGRITY</label>
            <span class="m-val" [style.color]="(state$ | async)?.chronologyGaps ? '#ef4444' : '#10b981'">
              {{ (state$ | async)?.chronologyGaps ? 'FRACTURED' : 'SECURE' }}
            </span>
          </div>

          <div class="m-card">
            <label>TELEMETRY PATH</label>
            <span class="m-val" [style.color]="(state$ | async)?.telemetryEroded ? '#f59e0b' : '#10b981'">
              {{ (state$ | async)?.telemetryEroded ? 'ERODED (GAP ACTIVE)' : 'NOMINAL' }}
            </span>
          </div>
        </div>
      </aside>

      <!-- EVIDENCE VIEWER (Center) -->
      <section class="evidence-viewer">
        <div class="viewer-header">
          <div class="header-left">
            <h3>FORENSIC EVIDENCE STREAM</h3>
            <span class="count">{{ (evidence$ | async)?.length }} entries verified</span>
          </div>
          
          <div class="replay-controls">
            <button class="ctrl-btn" (click)="reconstructLedger()">RECONSTRUCT / REINDEX</button>
          </div>
        </div>

        <!-- CHAIN FRACTURE ALERT -->
        <div class="fracture-alert-bar flash-red" *ngIf="(state$ | async)?.activeDrill === 'IFD-001'">
          <div class="alert-title">⚠️ CRITICAL MERKLE CHAIN FRACTURE DETECTED</div>
          <p>Adversarial entry signature mismatch discovered at index #1005. Trust propagation blocked.</p>
        </div>
        
        <div class="evidence-list">
          <ng-container *ngFor="let entry of (evidence$ | async); let i = index">
            
            <!-- Simulated Telemetry Chronology Gap Rows -->
            <div class="chronology-gap-indicator" *ngIf="(state$ | async)?.chronologyGaps && i === 2">
              <div class="gap-label">📡 TELEMETRY GAP / FORENSIC LOG ERASURE DETECTED</div>
              <div class="gap-desc">Evidence lost between sequences #1002 and #1004. Causal timeline sequence fractured.</div>
            </div>

            <div class="evidence-entry" 
                 [class]="entry.evidence.verdict"
                 [class.selected]="selectedEntry === entry"
                 (click)="selectEntry(entry)">
              <div class="entry-meta">
                <span class="seq">#{{ entry.sequenceId }}</span>
                <span class="ts">{{ entry.timestamp | date:'HH:mm:ss.SSS' }} UTC</span>
                <span class="type" [class]="entry.type">{{ entry.type }}</span>
                <span class="verdict-tag" [class]="entry.evidence.verdict">{{ entry.evidence.verdict }}</span>
              </div>
              <div class="entry-payload">{{ entry.payload }}</div>
              <div class="entry-forensics" *ngIf="selectedEntry === entry">
                <div class="detail-grid">
                  <div class="detail-item"><label>BLOCK HASH</label><code>{{ entry.evidence.hash }}</code></div>
                  <div class="detail-item"><label>PREVIOUS BLOCK</label><code>{{ entry.evidence.prevHash }}</code></div>
                  <div class="detail-item"><label>HSM SIGNATURE</label><code>{{ entry.evidence.signature }}</code></div>
                  <div class="detail-item"><label>AUTHORITY EPOCH</label><code>{{ entry.evidence.epoch }}</code></div>
                </div>
              </div>
            </div>
          </ng-container>
        </div>
      </section>

      <!-- RESOLUTION / MITIGATION CEREMONY (Right) -->
      <aside class="side-panel resolution-panel">
        <h3>MITIGATION CEREMONY</h3>
        
        <!-- Case 1: Active Drill that needs Replay Explorer mitigation (IFD-001 or IFD-002) -->
        <div class="active-mitigation" *ngIf="(state$ | async)?.activeDrill === 'IFD-001' || (state$ | async)?.activeDrill === 'IFD-002'">
          <div class="mit-card warning-card">
            <h4>LEDGER INTERVENTION REQUIRED</h4>
            <p>The institutional ledger runtime is currently compromised. Perform a manual reindexing ceremony to recover epistemic trust.</p>
          </div>

          <div class="ceremony-form">
            <div class="form-group">
              <label>RECOVERY METHODOLOGY</label>
              <select [(ngModel)]="selectedMethod">
                <option value="rebuild">Rebuild Merkle proofs and enforce causal continuity</option>
                <option value="secondary">Sync ledger with cold-storage secondary offline node</option>
                <option value="baseline">Rotate epoch baseline keys and verify block hashes</option>
              </select>
            </div>

            <div class="form-group">
              <label>PHYSICAL ACCOUNTABILITY JUSTIFICATION</label>
              <textarea [(ngModel)]="justification" 
                        placeholder="Provide details about the physical ledger alignment (e.g. Replaced fractured blocks at indices 1004-1005 with offline cold-storage copies.)"></textarea>
            </div>

            <div class="form-group check-group">
              <input type="checkbox" id="ack1" [(ngModel)]="ackVerified">
              <label for="ack1">Verify all block payloads correspond to validated epoch signatures.</label>
            </div>

            <button class="execute-btn" 
                    [disabled]="!ackVerified || justification.length < 15"
                    (click)="submitResolution()">
              EXECUTE LEDGER REBUILD
            </button>
          </div>
        </div>

        <!-- Case 2: Nominal state -->
        <div class="nominal-state" *ngIf="(state$ | async)?.activeDrill !== 'IFD-001' && (state$ | async)?.activeDrill !== 'IFD-002'">
          <div class="state-icon">✓</div>
          <h4>Ledger Stream Stable</h4>
          <p>No active replay fractures or chronology compromises detected. Forensic auditing remains in passive monitoring mode.</p>
        </div>
      </aside>
    </main>
  `,
  styles: [`
    .grid-layout {
      display: grid;
      grid-template-columns: 240px 1fr 320px;
      height: 100%;
      overflow: hidden;
    }
    .side-panel { padding: 1.5rem; background: #020617; border-right: 1px solid #111827; overflow-y: auto; }
    .resolution-panel { border-right: 0; border-left: 1px solid #111827; }
    
    h3 { font-size: 0.7rem; font-weight: 800; letter-spacing: 0.05em; color: #64748b; margin-bottom: 1.25rem; text-transform: uppercase; }
    .panel-desc { font-size: 0.75rem; color: #6b7280; margin-bottom: 1.5rem; line-height: 1.4; }

    .metrics-stack { display: flex; flex-direction: column; gap: 1rem; }
    .m-card { background: #090d16; border: 1px solid #111827; padding: 1rem; border-radius: 6px; }
    .m-card label { font-size: 0.55rem; font-weight: 800; color: #4b5563; display: block; margin-bottom: 0.25rem; }
    .m-val { font-size: 1.1rem; font-weight: 900; font-family: 'JetBrains Mono'; color: #10b981; }
    .m-val.danger { color: #ef4444; }
    .hash-code { font-family: 'JetBrains Mono'; font-size: 0.65rem; color: #64748b; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .evidence-viewer { display: flex; flex-direction: column; background: #030712; }
    .viewer-header { padding: 0.75rem 1.5rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #111827; background: #090d16; }
    .header-left { display: flex; flex-direction: column; gap: 0.15rem; }
    .count { font-size: 0.65rem; color: #4b5563; font-family: 'JetBrains Mono'; font-weight: 700; }

    .replay-controls { display: flex; gap: 0.25rem; }
    .ctrl-btn { padding: 0.4rem 0.75rem; font-size: 0.6rem; font-weight: 800; background: #111827; border: 1px solid #374151; color: #cbd5e1; cursor: pointer; transition: all 0.2s; }
    .ctrl-btn:hover { background: #1f2937; }

    .fracture-alert-bar { background: rgba(239, 68, 68, 0.08); border-bottom: 1px solid #7f1d1d; padding: 1rem 1.5rem; }
    .alert-title { font-size: 0.75rem; font-weight: 900; color: #ef4444; margin-bottom: 0.25rem; }
    .fracture-alert-bar p { font-size: 0.75rem; color: #fca5a5; margin: 0; line-height: 1.4; }

    .evidence-list { flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
    
    .chronology-gap-indicator { background: rgba(245, 158, 11, 0.05); border: 1px dashed #78350f; padding: 1rem; border-radius: 6px; display: flex; flex-direction: column; gap: 0.25rem; margin: 0.25rem 0; }
    .gap-label { font-size: 0.65rem; font-weight: 900; color: #f59e0b; }
    .gap-desc { font-size: 0.7rem; color: #d97706; line-height: 1.4; }

    .evidence-entry { background: #090d16; padding: 1rem; border-left: 3px solid #374151; font-size: 0.8rem; cursor: pointer; border-radius: 4px; transition: all 0.2s; }
    .evidence-entry:hover { background: #111827; }
    .evidence-entry.selected { background: #111827; border-left-width: 5px; }
    .evidence-entry.VERIFIED { border-left-color: #10b981; }
    .evidence-entry.DEGRADED { border-left-color: #f59e0b; }
    .evidence-entry.UNTRUSTED { border-left-color: #ef4444; }

    .entry-meta { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; font-size: 0.65rem; color: #4b5563; font-weight: 700; }
    .seq { font-family: 'JetBrains Mono'; color: #9ca3af; }
    .ts { font-family: 'JetBrains Mono'; }
    .type { font-size: 0.6rem; font-weight: 800; border: 1px solid; padding: 0 4px; border-radius: 2px; }
    .type.GOVERNANCE { color: #f59e0b; border-color: rgba(245, 158, 11, 0.3); background: rgba(245, 158, 11, 0.02); }
    .type.REPLAY { color: #3b82f6; border-color: rgba(59, 130, 246, 0.3); background: rgba(59, 130, 246, 0.02); }
    .type.IDENTITY { color: #10b981; border-color: rgba(16, 185, 129, 0.3); background: rgba(16, 185, 129, 0.02); }
    .type.TELEMETRY { color: #8b5cf6; border-color: rgba(139, 92, 246, 0.3); background: rgba(139, 92, 246, 0.02); }
    .type.POLICY { color: #ec4899; border-color: rgba(236, 72, 153, 0.3); background: rgba(236, 72, 153, 0.02); }
    
    .verdict-tag { font-size: 0.55rem; font-weight: 900; margin-left: auto; border: 1px solid; padding: 0 4px; border-radius: 2px; }
    .verdict-tag.VERIFIED { color: #10b981; border-color: #064e3b; }
    .verdict-tag.DEGRADED { color: #f59e0b; border-color: #78350f; }
    .verdict-tag.UNTRUSTED { color: #ef4444; border-color: #7f1d1d; }

    .entry-payload { font-weight: 500; color: #cbd5e1; line-height: 1.4; }
    .entry-forensics { margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #1f2937; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .detail-item { display: flex; flex-direction: column; gap: 0.15rem; }
    .detail-item label { font-size: 0.55rem; font-weight: 800; color: #4b5563; }
    .detail-item code { font-family: 'JetBrains Mono'; font-size: 0.65rem; color: #9ca3af; word-break: break-all; background: #030712; padding: 2px 4px; border: 1px solid #111827; }

    .nominal-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; text-align: center; color: #4b5563; padding: 1.5rem; }
    .state-icon { font-size: 2.5rem; color: #10b981; margin-bottom: 0.75rem; }
    .nominal-state h4 { font-size: 0.85rem; font-weight: 800; color: #cbd5e1; margin: 0 0 0.5rem 0; }
    .nominal-state p { font-size: 0.75rem; color: #6b7280; line-height: 1.4; }

    .warning-card { background: rgba(245, 158, 11, 0.05); border: 1px solid #78350f; padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem; }
    .warning-card h4 { font-size: 0.75rem; font-weight: 900; color: #f59e0b; margin: 0 0 0.25rem 0; }
    .warning-card p { font-size: 0.7rem; color: #d97706; margin: 0; line-height: 1.4; }

    .ceremony-form { display: flex; flex-direction: column; gap: 1.25rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .form-group label { font-size: 0.55rem; font-weight: 800; color: #64748b; letter-spacing: 0.05em; }
    
    select, textarea { background: #030712; border: 1px solid #1f2937; color: #cbd5e1; padding: 0.5rem; font-size: 0.75rem; border-radius: 4px; font-family: inherit; }
    select:focus, textarea:focus { border-color: #3b82f6; outline: none; }
    textarea { height: 100px; resize: none; line-height: 1.4; }

    .check-group { flex-direction: row; align-items: flex-start; gap: 0.5rem; }
    .check-group input { margin-top: 2px; }
    .check-group label { font-size: 0.7rem; color: #9ca3af; font-weight: 500; line-height: 1.4; cursor: pointer; }

    .execute-btn { background: #ef4444; border: 1px solid #7f1d1d; color: white; padding: 0.65rem; font-size: 0.7rem; font-weight: 800; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
    .execute-btn:hover:not(:disabled) { background: #dc2626; }
    .execute-btn:disabled { opacity: 0.3; cursor: not-allowed; }

    @keyframes borderFlash {
      from { border-color: #111827; }
      to { border-color: #ef4444; }
    }
    .flash-red { animation: borderFlash 1.5s infinite alternate; border-left: 3px solid #ef4444; }
  `]
})
export class ReplayExplorerComponent {
  private stewardship = inject(StewardshipService);
  state$ = this.stewardship.state$;
  evidence$ = this.stewardship.evidence$;
  selectedEntry: any = null;

  // Form bindings
  selectedMethod = 'rebuild';
  justification = '';
  ackVerified = false;

  selectEntry(entry: any) {
    this.selectedEntry = this.selectedEntry === entry ? null : entry;
  }

  reconstructLedger() {
    // If not in a drill, simulate a quick nominal reindexing
    alert('Independent Ledger reconstruction cycle completed successfully. All hash pointers verified.');
  }

  submitResolution() {
    const current = this.stewardship['stateSubject'].value;
    const drillId = current.activeDrill;
    
    if (drillId === 'IFD-001' || drillId === 'IFD-002') {
      const actions = `Ledger alignment via ${this.selectedMethod.toUpperCase()}. Justification: ${this.justification}`;
      this.stewardship.resolveDrill(drillId, actions);
      
      // Clear form
      this.justification = '';
      this.ackVerified = false;
    }
  }
}

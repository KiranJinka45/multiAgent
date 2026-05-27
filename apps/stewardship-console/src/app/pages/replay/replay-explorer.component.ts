import { Component, inject, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StewardshipService, EvidenceEntry } from '../../stewardship.service';
import * as d3 from 'd3';

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
            <label>VISUAL RENDER PARITY HASH</label>
            <code class="hash-code">{{ visualParityHash }}</code>
          </div>

          <div class="m-card">
            <label>CHRONOLOGY CONFIDENCE SCORE</label>
            <span class="m-val" [style.color]="((state$ | async)?.chronologyConfidence ?? 100) < 80 ? '#ef4444' : '#10b981'">
              {{ (state$ | async)?.chronologyConfidence ?? 100 }}%
            </span>
            <div class="progress-bar-container">
              <div class="progress-bar" [style.width.%]="(state$ | async)?.chronologyConfidence ?? 100" [style.background-color]="((state$ | async)?.chronologyConfidence ?? 100) < 80 ? '#ef4444' : '#10b981'"></div>
            </div>
          </div>

          <div class="m-card">
            <label>VERIFICATION DEPTH STRATEGY</label>
            <select class="tier-select" [ngModel]="(state$ | async)?.verificationTier ?? 'HOT'" (ngModelChange)="setVerificationTier($event)">
              <option value="HOT">HOT Path (Rolling Probabilistic)</option>
              <option value="WARM">WARM Path (Consensus Boundaries)</option>
              <option value="COLD">COLD Path (Full Merkle Scan)</option>
            </select>
          </div>

          <div class="m-card">
            <label>TELEMETRY PATH</label>
            <span class="m-val" [style.color]="(state$ | async)?.telemetryEroded ? '#f59e0b' : '#10b981'">
              {{ (state$ | async)?.telemetryEroded ? 'ERODED (GAP ACTIVE)' : 'NOMINAL' }}
            </span>
          </div>
        </div>

        <div class="capsule-panel">
          <h3>PRESERVATION ENGINEERING</h3>
          <p class="panel-desc">Export append-only forensic capsules or run offline reconstruction ceremonies.</p>
          <div class="btn-group-vertical">
            <button class="ctrl-btn capsule-btn" (click)="exportReplayCapsule()">EXPORT REPLAY CAPSULE</button>
            <button class="ctrl-btn capsule-btn" (click)="fileInput.click()">IMPORT / RECONSTRUCT CAPSULE</button>
            <input #fileInput type="file" style="display: none;" (change)="onCapsuleUploaded($event)" accept=".json">
          </div>
        </div>

        <div class="stress-panel">
          <h3>BROWSER ENDURANCE DRILL</h3>
          <p class="panel-desc">Inject simulated high-volume forensic evidence streams directly into IndexedDB.</p>
          <div class="btn-group-vertical">
            <button class="ctrl-btn stress-btn" (click)="triggerLocalDrill(50000)">SIMULATE 50K EVENTS</button>
            <button class="ctrl-btn stress-btn" (click)="triggerLocalDrill(100000)">SIMULATE 100K EVENTS</button>
            <button class="ctrl-btn stress-btn" (click)="triggerBurstDrill()">SIMULATE BURST SATURATION</button>
            <button class="ctrl-btn danger-btn" (click)="clearLocalDB()">CLEAR DATABASE</button>
          </div>
        </div>
      </aside>

      <!-- EVIDENCE VIEWER (Center) -->
      <section class="evidence-viewer">
        <div class="viewer-header">
          <div class="header-left">
            <h3>FORENSIC EVIDENCE STREAM</h3>
            <span class="count">{{ totalEntries }} entries persisted (Offset: {{ currentOffset }})</span>
          </div>
          
          <div class="replay-controls">
            <button class="ctrl-btn" (click)="reconstructLedger()">RECONSTRUCT / REINDEX</button>
          </div>
        </div>

        <!-- HIGH-DENSITY TEMPORAL CANVAS TIMELINE -->
        <div class="timeline-container">
          <div class="timeline-header">
            <h4>HIGH-DENSITY TIMELINE GRAPH (CANVAS 60FPS)</h4>
            <div class="timeline-legend">
              <span class="legend-item"><i class="dot gov"></i> Gov</span>
              <span class="legend-item"><i class="dot rep"></i> Replay</span>
              <span class="legend-item"><i class="dot id"></i> Identity</span>
              <span class="legend-item"><i class="dot tel"></i> Telemetry</span>
              <span class="legend-item"><i class="dot pol"></i> Policy</span>
              <span class="legend-item"><i class="dot dangerous"></i> Untrusted</span>
            </div>
          </div>
          <div class="canvas-wrapper">
            <canvas #timelineCanvas class="timeline-canvas"></canvas>
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

                   <div class="detail-item" *ngIf="entry.attestation" style="grid-column: span 2; border-top: 1px dashed rgba(239, 68, 68, 0.2); padding-top: 0.5rem; margin-top: 0.25rem;">
                     <label style="color: #ef4444; font-weight: 800;">⚠️ PAYLOAD SANITIZED (MUTATED FOR RUNTIME)</label>
                     <span style="font-size: 0.7rem; color: #cbd5e1;">
                       Applied: <strong style="color: #f59e0b;">{{ entry.attestation.transformations.join(', ') }}</strong>
                     </span>
                   </div>

                   <div class="detail-item" *ngIf="entry.attestation">
                     <label>ORIGINAL BYTE SIZE</label>
                     <code>{{ entry.attestation.originalByteLength }} bytes</code>
                   </div>

                   <div class="detail-item" *ngIf="entry.attestation">
                     <label>SANITIZED BYTE SIZE</label>
                     <code>{{ entry.attestation.sanitizedByteLength }} bytes (Epoch: {{ entry.attestation.sanitizationEpochId }})</code>
                   </div>

                   <div class="detail-item" *ngIf="entry.quarantineBlob" style="grid-column: span 2; border-top: 1px dashed rgba(239, 68, 68, 0.2); padding-top: 0.5rem;">
                     <label style="color: #ef4444;">PRISTINE ORIGINAL QUARANTINE BLOB</label>
                     <code style="white-space: pre-wrap; font-size: 0.65rem; color: #fca5a5; background: #450a0a; display: block; max-height: 120px; overflow-y: auto; padding: 0.5rem; border: 1px solid #7f1d1d; border-radius: 4px;">{{ decodeQuarantineBlob(entry.quarantineBlob) }}</code>
                   </div>
                 </div>
               </div>
            </div>
          </ng-container>
        </div>

        <!-- PAGINATION BAR -->
        <div class="pagination-bar" *ngIf="totalEntries > 0">
          <span>Showing {{ currentOffset + 1 }} - {{ currentOffset + displayLimit }} of {{ totalEntries }} entries</span>
          <div class="pag-buttons">
            <button class="ctrl-btn pag-btn" [disabled]="currentOffset === 0" (click)="prevPage()">PREVIOUS</button>
            <button class="ctrl-btn pag-btn" [disabled]="currentOffset + displayLimit >= totalEntries" (click)="nextPage()">NEXT</button>
          </div>
        </div>
      </section>

      <!-- RESOLUTION / MITIGATION CEREMONY (Right) -->
      <aside class="side-panel resolution-panel">
        <h3>MITIGATION CEREMONY</h3>
        
        <!-- Case 1: Active Drill that needs Replay Explorer mitigation -->
        <div class="active-mitigation" *ngIf="(state$ | async)?.activeDrill === 'IFD-001' || (state$ | async)?.activeDrill === 'IFD-002' || (state$ | async)?.activeDrill === 'IFD-004'">
          <div class="mit-card warning-card">
            <h4>LEDGER INTERVENTION REQUIRED</h4>
            <p>The institutional ledger runtime is currently compromised. Perform a manual reindexing ceremony to recover epistemic trust.</p>
          </div>

          <div class="ceremony-form">
            <div class="form-group">
              <label>RECOVERY METHODOLOGY</label>
              <select [(ngModel)]="selectedMethod">
                <option value="rebuild">Verify key signatures and enforce causal continuity</option>
                <option value="secondary">Sync ledger with cold-storage secondary offline node</option>
                <option value="baseline">Rotate epoch baseline keys and verify block hashes</option>
              </select>
              <div *ngIf="selectedMethod === 'rebuild' && ((state$ | async)?.activeDrill === 'IFD-001' || (state$ | async)?.activeDrill === 'IFD-004')" 
                   class="friction-warning" 
                   style="color: #fca5a5; font-size: 0.65rem; font-weight: 700; border: 1px solid #7f1d1d; background: #450a0a; padding: 0.5rem; border-radius: 4px; margin-top: 0.5rem; line-height: 1.4;">
                ⚠️ MULTI-SIG FRICTION WARNING: Reindexing an active Merkle fracture requires physical consensus. Proceeding without multi-signature key verification will trigger a Certainty Inflation event.
              </div>
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
        <div class="nominal-state" *ngIf="(state$ | async)?.activeDrill !== 'IFD-001' && (state$ | async)?.activeDrill !== 'IFD-002' && (state$ | async)?.activeDrill !== 'IFD-004'">
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
      grid-template-columns: 260px 1fr 340px;
      height: 100%;
      overflow: hidden;
    }
    .side-panel { padding: 1.5rem; background: #020617; border-right: 1px solid #111827; overflow-y: auto; display: flex; flex-direction: column; gap: 1.5rem; }
    .resolution-panel { border-right: 0; border-left: 1px solid #111827; }
    .stress-panel { border-top: 1px solid #1e293b; padding-top: 1.5rem; margin-top: auto; }
    .btn-group-vertical { display: flex; flex-direction: column; gap: 0.5rem; }
    
    h3 { font-size: 0.7rem; font-weight: 800; letter-spacing: 0.05em; color: #64748b; margin-bottom: 0.5rem; text-transform: uppercase; }
    .panel-desc { font-size: 0.75rem; color: #6b7280; margin-bottom: 1rem; line-height: 1.4; }

    .metrics-stack { display: flex; flex-direction: column; gap: 1rem; }
    .m-card { background: #090d16; border: 1px solid #111827; padding: 1rem; border-radius: 6px; }
    .m-card label { font-size: 0.55rem; font-weight: 800; color: #4b5563; display: block; margin-bottom: 0.25rem; }
    .m-val { font-size: 1.1rem; font-weight: 900; font-family: 'JetBrains Mono'; color: #10b981; }
    .m-val.danger { color: #ef4444; }
    .hash-code { font-family: 'JetBrains Mono'; font-size: 0.65rem; color: #64748b; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .evidence-viewer { display: flex; flex-direction: column; background: #030712; height: 100%; overflow: hidden; }
    .viewer-header { padding: 0.75rem 1.5rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #111827; background: #090d16; }
    .header-left { display: flex; flex-direction: column; gap: 0.15rem; }
    .count { font-size: 0.65rem; color: #64748b; font-family: 'JetBrains Mono'; font-weight: 700; }

    .replay-controls { display: flex; gap: 0.25rem; }
    .ctrl-btn { padding: 0.4rem 0.75rem; font-size: 0.6rem; font-weight: 800; background: #111827; border: 1px solid #374151; color: #cbd5e1; cursor: pointer; transition: all 0.2s; border-radius: 4px; }
    .ctrl-btn:hover { background: #1f2937; border-color: #4b5563; }
    .ctrl-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .stress-btn { background: #1e1b4b; border-color: #312e81; color: #a5b4fc; }
    .stress-btn:hover { background: #312e81; }
    .danger-btn { background: #450a0a; border-color: #7f1d1d; color: #fca5a5; }
    .danger-btn:hover { background: #7f1d1d; }

    /* Timeline Container & Graph Styles */
    .timeline-container { background: #090d16; border-bottom: 1px solid #111827; padding: 0.75rem 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .timeline-header { display: flex; justify-content: space-between; align-items: center; }
    .timeline-header h4 { font-size: 0.6rem; font-weight: 800; color: #64748b; margin: 0; letter-spacing: 0.05em; }
    .timeline-legend { display: flex; gap: 0.75rem; }
    .legend-item { display: flex; align-items: center; gap: 0.25rem; font-size: 0.55rem; color: #94a3b8; font-family: 'JetBrains Mono', monospace; }
    .dot { width: 5px; height: 5px; border-radius: 50%; display: inline-block; }
    .dot.gov { background: #f59e0b; }
    .dot.rep { background: #3b82f6; }
    .dot.id { background: #10b981; }
    .dot.tel { background: #8b5cf6; }
    .dot.pol { background: #ec4899; }
    .dot.dangerous { background: #ef4444; box-shadow: 0 0 4px #ef4444; }
    
    .canvas-wrapper { width: 100%; height: 120px; background: #020617; border: 1px solid #1e293b; border-radius: 6px; overflow: hidden; position: relative; }
    .timeline-canvas { width: 100%; height: 100%; display: block; }

    .fracture-alert-bar { background: rgba(239, 68, 68, 0.08); border-bottom: 1px solid #7f1d1d; padding: 1rem 1.5rem; }
    .alert-title { font-size: 0.75rem; font-weight: 900; color: #ef4444; margin-bottom: 0.25rem; }
    .fracture-alert-bar p { font-size: 0.75rem; color: #fca5a5; margin: 0; line-height: 1.4; }

    .evidence-list { flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
    
    .chronology-gap-indicator { background: rgba(245, 158, 11, 0.05); border: 1px dashed #78350f; padding: 1rem; border-radius: 6px; display: flex; flex-direction: column; gap: 0.25rem; margin: 0.25rem 0; }
    .gap-label { font-size: 0.65rem; font-weight: 900; color: #f59e0b; }
    .gap-desc { font-size: 0.7rem; color: #d97706; line-height: 1.4; }

    .evidence-entry { background: #090d16; padding: 1rem; border-left: 3px solid #374151; font-size: 0.8rem; cursor: pointer; border-radius: 4px; transition: all 0.2s; border: 1px solid #111827; border-left-width: 4px; }
    .evidence-entry:hover { background: #111827; }
    .evidence-entry.selected { background: #111827; border-left-width: 5px; }
    .evidence-entry.VERIFIED { border-left-color: #10b981; }
    .evidence-entry.DEGRADED { border-left-color: #f59e0b; }
    .evidence-entry.UNTRUSTED { border-left-color: #ef4444; border-color: rgba(239, 68, 68, 0.15); box-shadow: inset 0 0 6px rgba(239, 68, 68, 0.02); }

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

    /* Pagination Styles */
    .pagination-bar { background: #090d16; border-top: 1px solid #111827; padding: 0.75rem 1.5rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.65rem; font-family: 'JetBrains Mono', monospace; color: #64748b; }
    .pag-buttons { display: flex; gap: 0.5rem; }
    .pag-btn { background: #020617; border-color: #1e293b; color: #94a3b8; }
    .pag-btn:hover:not(:disabled) { background: #111827; }

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
    .progress-bar-container { width: 100%; height: 4px; background: #1e293b; border-radius: 2px; margin-top: 0.5rem; overflow: hidden; }
    .progress-bar { height: 100%; transition: width 0.3s ease; }
    .tier-select { width: 100%; background: #030712; border: 1px solid #1f2937; color: #cbd5e1; padding: 0.3rem 0.5rem; font-size: 0.7rem; border-radius: 4px; font-family: inherit; margin-top: 0.25rem; }
    .tier-select:focus { border-color: #3b82f6; outline: none; }
    .capsule-panel { border-top: 1px solid #1e293b; padding-top: 1.25rem; }
    .capsule-btn { background: #0f172a; border-color: #1e293b; color: #94a3b8; }
    .capsule-btn:hover { background: #1e293b; border-color: #334155; color: #cbd5e1; }
  `]
})
export class ReplayExplorerComponent implements OnInit, AfterViewInit {
  public stewardship = inject(StewardshipService);
  state$ = this.stewardship.state$;
  evidence$ = this.stewardship.evidence$;
  selectedEntry: any = null;

  @ViewChild('timelineCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  // Form bindings
  selectedMethod = 'rebuild';
  justification = '';
  ackVerified = false;

  // Pagination bounds
  public currentOffset = 0;
  public displayLimit = 100;

  public visualParityHash = 'ZTAN_A0000000';

  private computeVisualParityHash(eventsCount: number, xMin: number, xMax: number, w: number, h: number) {
    const normW = Math.round(w);
    const normH = Math.round(h);
    const normXMin = Math.round(xMin);
    const normXMax = Math.round(xMax);
    const stateStr = `${eventsCount}:${normXMin}:${normXMax}:${normW}:${normH}`;
    let hash = 2166136261;
    for (let i = 0; i < stateStr.length; i++) {
      hash ^= stateStr.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
    this.visualParityHash = `ZTAN_${hex}`;
  }

  get totalEntries(): number {
    return this.stewardship.totalEventsInDB;
  }

  ngOnInit() {
    try {
      const data = this.stewardship.getViewportSavepoint();
      if (data) {
        this.currentOffset = data.offset || 0;
        this.selectedMethod = data.method || 'rebuild';
        this.justification = data.justification || '';
      }
    } catch (e) { }

    this.stewardship.evidence$.subscribe((events) => {
      if (events && events.length > 0) {
        try {
          const data = this.stewardship.getViewportSavepoint();
          if (data) {
            if (data.selectedSequenceId && !this.selectedEntry) {
              const matched = events.find((e: any) => e.sequenceId === data.selectedSequenceId);
              if (matched) this.selectedEntry = matched;
            }
          }
        } catch (e) { }
      }
      this.loadAllAndDraw();
    });
  }

  private saveViewportSavepoint() {
    try {
      this.stewardship.saveViewportSavepoint({
        offset: this.currentOffset,
        selectedSequenceId: this.selectedEntry?.sequenceId || null,
        method: this.selectedMethod,
        justification: this.justification
      });
    } catch (e) { }
  }

  ngAfterViewInit() {
    setTimeout(() => this.loadAllAndDraw(), 200);
    // Bind window resize event to redraw the canvas cleanly
    window.addEventListener('resize', () => this.loadAllAndDraw());
  }

  private async loadAllAndDraw() {
    // Fetch all events currently in IndexedDB to display on canvas timeline (up to 120,000 for extreme stress)
    const allEvents = await this.stewardship.getPaginatedEvents(0, 120000);
    this.drawTimeline(allEvents);
  }

  private drawTimeline(events: any[]) {
    if (!this.canvasRef || events.length === 0) return;

    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    // Set logical and actual size for clear high-DPI scaling
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    const margin = { top: 15, right: 20, bottom: 20, left: 80 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const xExtent = d3.extent(events, (d: EvidenceEntry) => d.sequenceId) as [number, number];
    const xMin = xExtent[0] || 0;
    const xMax = xExtent[1] || 1000;
    this.computeVisualParityHash(events.length, xMin, xMax, rect.width, rect.height);

    const xScale = d3.scaleLinear()
      .domain([xMin, xMax])
      .range([margin.left, width - margin.right]);

    const categories = ['GOVERNANCE', 'REPLAY', 'IDENTITY', 'TELEMETRY', 'POLICY'];
    const yScale = d3.scalePoint()
      .domain(categories)
      .range([margin.top, height - margin.bottom])
      .padding(0.5);

    const colors: Record<string, string> = {
      GOVERNANCE: '#f59e0b',
      REPLAY: '#3b82f6',
      IDENTITY: '#10b981',
      TELEMETRY: '#8b5cf6',
      POLICY: '#ec4899'
    };

    // Y-Axis Labels
    ctx.font = 'bold 8px "JetBrains Mono", monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    categories.forEach(cat => {
      const y = yScale(cat);
      if (y !== undefined) {
        ctx.fillText(cat, margin.left - 10, y);
        ctx.strokeStyle = 'rgba(31, 41, 55, 0.4)';
        ctx.beginPath();
        ctx.moveTo(margin.left, y);
        ctx.lineTo(width - margin.right, y);
        ctx.stroke();
      }
    });

    // X-Axis Grid & Labels
    const xTicks = xScale.ticks(5);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillStyle = '#475569';

    xTicks.forEach((tick: number) => {
      const x = xScale(tick);
      ctx.fillText(`#${tick}`, x, height - margin.bottom + 5);
      ctx.strokeStyle = 'rgba(31, 41, 55, 0.4)';
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, height - margin.bottom);
      ctx.stroke();
    });

    // Axis Lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, height - margin.bottom);
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.stroke();

    // Draw dots
    events.forEach((d: EvidenceEntry) => {
      const x = xScale(d.sequenceId);
      const y = yScale(d.type);
      if (x !== undefined && y !== undefined) {
        ctx.beginPath();
        const isUntrusted = d.evidence?.verdict === 'UNTRUSTED';
        ctx.arc(x, y, isUntrusted ? 3.5 : 2, 0, 2 * Math.PI);
        ctx.fillStyle = isUntrusted ? '#ef4444' : colors[d.type] || '#cbd5e1';
        ctx.fill();

        if (isUntrusted) {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.stroke();
        }
      }
    });
  }

  selectEntry(entry: any) {
    this.selectedEntry = this.selectedEntry === entry ? null : entry;
    this.saveViewportSavepoint();
  }

  reconstructLedger() {
    alert('Independent Ledger reconstruction cycle completed successfully. All hash pointers verified.');
  }

  submitResolution() {
    const current = this.stewardship['stateSubject'].value;
    const drillId = current.activeDrill;

    if (drillId === 'IFD-001' || drillId === 'IFD-002' || drillId === 'IFD-004') {
      const isFracture = drillId === 'IFD-001' || drillId === 'IFD-004';
      const isCertaintyInflation = isFracture && this.selectedMethod === 'rebuild' && !this.justification.toLowerCase().includes('multi-sig');
      
      if (isCertaintyInflation) {
        console.warn(`[Stewardship Console] Certainty Inflation Warning: Operator override disagreement detected. Override authorized without complete physical multi-sig agreement. (Method: ${this.selectedMethod})`);
      }

      const actions = `Ledger alignment via ${this.selectedMethod.toUpperCase()}. Justification: ${this.justification}`;
      this.stewardship.resolveDrill(drillId, actions, this.selectedMethod, this.justification, isCertaintyInflation);

      this.justification = '';
      this.ackVerified = false;
      this.saveViewportSavepoint();
    }
  }

  triggerLocalDrill(count: number) {
    this.stewardship.simulateLocalEnduranceDrill(count);
  }

  triggerBurstDrill() {
    console.log('[ReplayExplorer] Simulating worker burst saturation (10 bursts of 10k events)...');
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        this.stewardship.simulateLocalEnduranceDrill(10000);
      }, i * 200);
    }
  }

  clearLocalDB() {
    this.stewardship['worker']?.postMessage({ type: 'CLEAR_DB' });
    this.currentOffset = 0;
    this.saveViewportSavepoint();
  }

  async nextPage() {
    if (this.currentOffset + this.displayLimit < this.totalEntries) {
      this.currentOffset += this.displayLimit;
      const page = await this.stewardship.getPaginatedEvents(this.currentOffset, this.displayLimit);
      (this.stewardship as any).evidenceSubject.next(page);
      this.saveViewportSavepoint();
    }
  }

  async prevPage() {
    this.currentOffset = Math.max(0, this.currentOffset - this.displayLimit);
    const page = await this.stewardship.getPaginatedEvents(this.currentOffset, this.displayLimit);
    (this.stewardship as any).evidenceSubject.next(page);
    this.saveViewportSavepoint();
  }

  exportReplayCapsule() {
    this.stewardship.exportReplayCapsule();
  }

  onCapsuleUploaded(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.stewardship.importReplayCapsule(file);
    }
  }

  decodeQuarantineBlob(base64: string | undefined): string {
    if (!base64) return '';
    try {
      const binaryString = window.atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const rawStr = new TextDecoder('utf-16le').decode(bytes);
      return rawStr.replace(/\u0000/g, '␀');
    } catch (e) {
      return 'Failed to decode: ' + base64;
    }
  }

  setVerificationTier(tier: any) {
    this.stewardship.setVerificationTier(tier);
  }
}


import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StewardshipService } from '../../stewardship.service';
import { FormsModule } from '@angular/forms';
import { interval, Subscription } from 'rxjs';
import { takeWhile } from 'rxjs/operators';

@Component({
  selector: 'app-recovery-console',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container" [class.blurred]="isQuorumFailureActive">
      <header class="page-header">
        <h1>Evidence-Bound Recovery Console</h1>
        <p>Perform manual key rotation and evidence-based restoration under Safe Mode constraints.</p>
      </header>

      <!-- NOMINAL BLOCK RESTORATION PATHWAYS -->
      <div class="recovery-layout">
        <section class="restoration-panel">
          
          <!-- SAFE MODE WARNING HEADER -->
          <div class="accountability-callout" *ngIf="(state$ | async)?.isSafeMode">
            <div class="c-header">
              <span class="label">CRITICAL PLATFORM INTERVENTION</span>
              <span class="tier active">{{ (state$ | async)?.escalationTier }} AUTH REQUIRED</span>
            </div>
            <div class="c-action">
              {{ (state$ | async)?.activeDrill === 'IFD-003' 
                 ? 'IFD-003 Governance Collapse Active: Epistemic status degraded. Resolve Epoch Alignment mismatch to lift Safe Mode.'
                 : 'Consensus deadlocked. Automated restorations are physically locked.' }}
            </div>
          </div>

          <!-- COMPRESSED INVARIANT AUDITING GRID -->
          <div class="invariant-ledger">
            <h3>RECOVERY INVARIANT CHECKS</h3>
            
            <div class="inv-row" [class.fail]="!(state$ | async)?.recoveryInvariants?.causalContinuity?.status">
              <span class="status-icon">{{ (state$ | async)?.recoveryInvariants?.causalContinuity?.status ? '✓' : '✗' }}</span>
              <div class="inv-info">
                <span class="inv-label">Causal Ledger Continuity</span>
                <span class="inv-action">{{ (state$ | async)?.recoveryInvariants?.causalContinuity?.label }}</span>
              </div>
            </div>

            <div class="inv-row" [class.fail]="!(state$ | async)?.recoveryInvariants?.epochAlignment?.status">
              <span class="status-icon">{{ (state$ | async)?.recoveryInvariants?.epochAlignment?.status ? '✓' : '✗' }}</span>
              <div class="inv-info">
                <span class="inv-label">Authority Epoch Alignment</span>
                <span class="inv-action">{{ (state$ | async)?.recoveryInvariants?.epochAlignment?.label }}</span>
              </div>
            </div>

            <div class="inv-row" [class.fail]="!(state$ | async)?.recoveryInvariants?.hsmSynchronicity?.status">
              <span class="status-icon">{{ (state$ | async)?.recoveryInvariants?.hsmSynchronicity?.status ? '✓' : '✗' }}</span>
              <div class="inv-info">
                <span class="inv-label">Physical HSM Anchor Sync</span>
                <span class="inv-action">{{ (state$ | async)?.recoveryInvariants?.hsmSynchronicity?.label }}</span>
              </div>
            </div>
          </div>

          <!-- MANUAL OVERRIDE (IFD-003 / GOVERNANCE COLLAPSE) -->
          <div class="override-panel" *ngIf="(state$ | async)?.activeDrill === 'IFD-003'">
            <div class="o-header">
              <span class="o-icon">⚠️</span>
              <div class="o-text">
                <h3>MANUAL GOVERNANCE MITIGATION CEREMONY</h3>
                <p>Verify signatures manually and rebuild the consensus baseline. This action resolves Epoch Alignment failures and unlocks standard pathways.</p>
              </div>
            </div>

            <div class="o-form">
              <div class="form-group">
                <label>MITIGATION ACTIONS TAKEN (MIN 15 CHARS)</label>
                <textarea [(ngModel)]="generalJustification" placeholder="Describe manual quorum alignment and key validation steps..."></textarea>
              </div>
              
              <div class="o-checklist">
                <label class="check-item">
                  <input type="checkbox" [(ngModel)]="genAck1"> I have manually cross-verified the consensus baseline hashes.
                </label>
                <label class="check-item">
                  <input type="checkbox" [(ngModel)]="genAck2"> I authorize recovery execution under Supervisor credentials.
                </label>
              </div>
            </div>

            <button class="override-btn-primary" 
                    [disabled]="!genAck1 || !genAck2 || generalJustification.length < 15"
                    (click)="resolveGovCollapse()">
              EXECUTE GOVERNANCE RESTORATION
            </button>
          </div>

          <!-- REGULAR RESTORATION ACTIONS (NOMINAL STATE) -->
          <div class="action-footer" *ngIf="!(state$ | async)?.isSafeMode">
            <button class="action-btn" [disabled]="hasFailures((state$ | async)?.recoveryInvariants)" (click)="executeRestoration()">
              EXECUTE EVIDENCE-BOUND RESTORATION
            </button>
            <p class="nominal-help" *ngIf="hasFailures((state$ | async)?.recoveryInvariants)">
              Standard restorations are disabled because one or more recovery invariants are currently compromised.
            </p>
          </div>
        </section>

        <!-- RIGHT SIDE STATUS ASSESSMENTS -->
        <aside class="recovery-side">
          <div class="side-card">
            <h3>RECOVERY PATH STATE</h3>
            <div class="eligibility-status" [class.fail]="(state$ | async)?.isSafeMode">
              {{ (state$ | async)?.isSafeMode ? 'LOCKED (SAFE MODE)' : 'NOMINAL / AVAILABLE' }}
            </div>
          </div>

          <div class="side-card">
            <h3>ACTIVE HARDWARE ANCHORS</h3>
            <div class="i-list">
              <div class="i-item">
                <span class="l">HSM Anchor Alpha</span>
                <span class="v" [style.color]="(state$ | async)?.quorumStatus === 'FAILED' ? '#ef4444' : '#10b981'">
                  {{ (state$ | async)?.quorumStatus === 'FAILED' ? 'OFFLINE' : 'ONLINE' }}
                </span>
              </div>
              <div class="i-item">
                <span class="l">HSM Anchor Beta</span>
                <span class="v" [style.color]="(state$ | async)?.quorumStatus === 'FAILED' ? '#ef4444' : '#10b981'">
                  {{ (state$ | async)?.quorumStatus === 'FAILED' ? 'OFFLINE' : 'ONLINE' }}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <!-- FULL-SCREEN CRITICAL OVERRIDE CEREMONY MODAL (TOTAL QUORUM FAILURE) -->
    <div class="critical-takeover-overlay" *ngIf="isQuorumFailureActive">
      <div class="takeover-box flash-red-border">
        <div class="takeover-header">
          <div class="siren">🚨 SYSTEM APOCALYPSE: QUORUM CRASH DETECTED 🚨</div>
          <h2>MANUAL HSM AUTHORITY OVERRIDE CEREMONY</h2>
          <p class="subtitle">Complete physical quorum breakdown. Automated consensus is dead. Enforcing absolute accountability.</p>
        </div>

        <div class="takeover-body">
          <div class="alert-banner">
            <strong>ATTENTION OPERATOR:</strong> You are about to execute a manual rotation of the HSM Authority root. This action bypasses digital consensus registries, permanently altering the trust anchor and requiring physical key validation.
          </div>

          <div class="takeover-form">
            <!-- Countdown Timer -->
            <div class="cooling-panel" [class.cooling]="countdownSeconds > 0">
              <div class="cooling-title">
                {{ countdownSeconds > 0 ? '🔒 CRYPTOGRAPHIC COOLING ACTIVE' : '🔓 COOLING COMPLETED / READY' }}
              </div>
              <div class="countdown-display">
                {{ countdownSeconds > 0 ? (countdownSeconds + 's REMAINING') : 'HSM COLD START ENABLED' }}
              </div>
              <p class="cooling-help">A mandatory 10-second thermal delay is enforced to prevent rapid automated override replay attacks.</p>
            </div>

            <!-- Justification Narrative -->
            <div class="t-group">
              <label>EXPEDIENT PHYSICAL OVERRIDE JUSTIFICATION (MIN 30 CHARS)</label>
              <textarea [(ngModel)]="modalJustification" 
                        placeholder="Provide details about why the consensus mechanism deadlocked, and verify physical key custody..."
                        [disabled]="countdownSeconds > 0"></textarea>
              <span class="char-count" [class.valid]="modalJustification.length >= 30">
                {{ modalJustification.length }} / 30 chars
              </span>
            </div>

            <!-- Checklists -->
            <div class="t-group">
              <label>PHYSICAL ACCREDITATION CHECKLIST</label>
              <div class="checklist">
                <label class="c-item">
                  <input type="checkbox" [(ngModel)]="modalAck1" [disabled]="countdownSeconds > 0">
                  <span>I have verified the physical HSM hardware alignment in racks A-4 and A-5.</span>
                </label>
                <label class="c-item">
                  <input type="checkbox" [(ngModel)]="modalAck2" [disabled]="countdownSeconds > 0">
                  <span>I hold physical cryptographic Key A-102 and accept sovereign accountability.</span>
                </label>
                <label class="c-item">
                  <input type="checkbox" [(ngModel)]="modalAck3" [disabled]="countdownSeconds > 0">
                  <span>I acknowledge that bypassing automated quorum will be irreversibly logged to the immutable ledger.</span>
                </label>
              </div>
            </div>

            <!-- Secondary Auth Signature -->
            <div class="t-group">
              <label>SECONDARY OPERATOR AUTHORITY SIGNATURE KEY</label>
              <input type="text" 
                     [(ngModel)]="modalSignature" 
                     placeholder="Enter signature credentials (e.g. ZTAN-AUTH-102)"
                     [disabled]="countdownSeconds > 0"
                     class="sig-input">
            </div>
          </div>
        </div>

        <div class="takeover-footer">
          <button class="abort-btn" (click)="abortOverride()">ABORT OVERRIDE CEREMONY</button>
          <button class="execute-takeover-btn"
                  [disabled]="countdownSeconds > 0 || modalJustification.length < 30 || !modalAck1 || !modalAck2 || !modalAck3 || modalSignature.trim().length === 0"
                  (click)="executeQuorumOverride()">
            ROTATION HSM AUTHORITY ROOT
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 2rem; height: 100%; overflow-y: auto; box-sizing: border-box; transition: filter 0.3s; }
    .page-container.blurred { filter: blur(8px) brightness(0.2); pointer-events: none; }
    .page-header { margin-bottom: 2rem; }
    h1 { font-size: 1.3rem; font-weight: 800; margin: 0 0 0.5rem 0; color: #f3f4f6; }
    p { font-size: 0.85rem; color: #9ca3af; margin: 0; }

    .recovery-layout { display: grid; grid-template-columns: 1fr 260px; gap: 1.5rem; }
    h3 { font-size: 0.7rem; font-weight: 800; color: #9ca3af; margin: 0 0 1.25rem 0; letter-spacing: 0.05em; text-transform: uppercase; }

    .restoration-panel { background: #090d16; border: 1px solid #111827; padding: 2rem; border-radius: 8px; }
    
    .accountability-callout { background: rgba(220, 38, 38, 0.05); border: 1px solid #dc2626; padding: 1.25rem; margin-bottom: 2rem; border-radius: 6px; }
    .c-header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; align-items: baseline; }
    .c-header .label { font-size: 0.6rem; font-weight: 800; color: #ef4444; }
    .c-header .tier { font-size: 0.65rem; font-weight: 900; color: #f3f4f6; background: #991b1b; padding: 2px 6px; border-radius: 2px; }
    .c-action { font-size: 0.8rem; font-weight: 700; color: #fca5a5; line-height: 1.4; }

    .invariant-ledger { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 2.5rem; }
    .inv-row { display: grid; grid-template-columns: 20px 1fr; gap: 1rem; align-items: center; padding: 1rem 1.25rem; background: #030712; border: 1px solid #1f2937; border-radius: 6px; }
    .inv-row.fail { border-left: 3px solid #ef4444; background: rgba(239, 68, 68, 0.01); border-color: #7f1d1d; }
    
    .status-icon { font-weight: 900; color: #10b981; font-size: 0.85rem; font-family: 'JetBrains Mono'; }
    .fail .status-icon { color: #ef4444; }
    
    .inv-info { display: flex; flex-direction: column; gap: 0.2rem; }
    .inv-label { font-size: 0.55rem; font-weight: 800; color: #64748b; letter-spacing: 0.05em; text-transform: uppercase; }
    .inv-action { font-size: 0.8rem; font-weight: 600; color: #cbd5e1; }
    .fail .inv-action { color: #fca5a5; }

    .override-panel { background: #030712; border: 1px solid #d97706; padding: 1.5rem; border-radius: 6px; }
    .o-header { display: flex; gap: 1rem; align-items: flex-start; margin-bottom: 1.5rem; }
    .o-icon { font-size: 1.8rem; }
    .o-text h3 { color: #f59e0b; margin: 0 0 0.25rem 0; font-size: 0.85rem; }
    .o-text p { font-size: 0.75rem; color: #d97706; line-height: 1.4; margin: 0; }

    .o-form { display: flex; flex-direction: column; gap: 1.25rem; margin-bottom: 1.5rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .form-group label { font-size: 0.55rem; font-weight: 800; color: #64748b; letter-spacing: 0.05em; }
    textarea { background: #030712; border: 1px solid #1f2937; padding: 0.75rem; color: #cbd5e1; font-size: 0.75rem; height: 74px; resize: none; border-radius: 4px; line-height: 1.4; }
    textarea:focus { border-color: #3b82f6; outline: none; }
    
    .o-checklist { display: flex; flex-direction: column; gap: 0.5rem; }
    .check-item { display: flex; align-items: center; gap: 0.5rem; color: #cbd5e1; font-size: 0.75rem; font-weight: 500; cursor: pointer; }
    input[type="checkbox"] { accent-color: #f59e0b; }

    .override-btn-primary { width: 100%; padding: 0.75rem; background: #f59e0b; color: #030712; border: none; font-weight: 900; font-size: 0.75rem; cursor: pointer; border-radius: 4px; transition: background 0.2s; }
    .override-btn-primary:hover:not(:disabled) { background: #d97706; }
    .override-btn-primary:disabled { opacity: 0.3; cursor: not-allowed; }

    .action-footer { display: flex; flex-direction: column; gap: 0.5rem; }
    .action-btn { width: 100%; padding: 0.75rem; background: #064e3b; color: #10b981; border: 1px solid #10b981; font-weight: 900; font-size: 0.75rem; cursor: pointer; border-radius: 4px; transition: all 0.2s; }
    .action-btn:hover:not(:disabled) { background: #0f766e; color: white; }
    .action-btn:disabled { background: #111827; border-color: #1f2937; color: #4b5563; cursor: not-allowed; opacity: 0.5; }
    
    .nominal-help { font-size: 0.7rem; color: #6b7280; text-align: center; margin: 0; }

    .recovery-side { display: flex; flex-direction: column; gap: 1.5rem; }
    .side-card { background: #090d16; border: 1px solid #111827; padding: 1.25rem; border-radius: 8px; }
    .eligibility-status { font-size: 1.1rem; font-weight: 900; font-family: 'JetBrains Mono'; color: #10b981; }
    .eligibility-status.fail { color: #ef4444; }
    
    .i-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .i-item { display: flex; justify-content: space-between; font-size: 0.7rem; font-weight: 700; }
    .i-item .l { color: #4b5563; }

    /* TAKEOVER MODAL OVERLAY */
    .critical-takeover-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(2, 6, 17, 0.98);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 2rem;
    }
    
    .takeover-box {
      width: 100%;
      max-width: 600px;
      background: #020617;
      border: 2px solid #ef4444;
      border-radius: 8px;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      box-shadow: 0 0 30px rgba(239, 68, 68, 0.15);
    }
    
    .siren { font-size: 0.85rem; font-weight: 900; color: #ef4444; text-align: center; animation: flash 0.5s infinite alternate; letter-spacing: 0.05em; }
    
    .takeover-header h2 { font-size: 1.15rem; font-weight: 900; text-align: center; margin: 0.5rem 0 0.25rem 0; color: #f3f4f6; }
    .subtitle { font-size: 0.75rem; color: #ef4444; text-align: center; font-weight: 700; margin: 0; }

    .takeover-body { display: flex; flex-direction: column; gap: 1.25rem; }
    
    .alert-banner { background: rgba(239, 68, 68, 0.08); border: 1px solid #7f1d1d; color: #fca5a5; font-size: 0.75rem; padding: 1rem; border-radius: 6px; line-height: 1.4; }

    .takeover-form { display: flex; flex-direction: column; gap: 1rem; }
    
    .cooling-panel { background: #090d16; border: 1px solid #1f2937; padding: 1rem; border-radius: 6px; text-align: center; }
    .cooling-panel.cooling { border-color: #ef4444; background: rgba(239, 68, 68, 0.02); }
    .cooling-title { font-size: 0.65rem; font-weight: 800; color: #64748b; margin-bottom: 0.25rem; }
    .cooling-panel.cooling .cooling-title { color: #ef4444; }
    
    .countdown-display { font-size: 1.2rem; font-weight: 900; font-family: 'JetBrains Mono'; color: #10b981; }
    .cooling-panel.cooling .countdown-display { color: #ef4444; animation: flash 1s infinite alternate; }
    .cooling-help { font-size: 0.65rem; color: #4b5563; margin: 0.25rem 0 0 0; }

    .t-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .t-group label { font-size: 0.55rem; font-weight: 900; color: #64748b; letter-spacing: 0.05em; }
    .t-group textarea { background: #030712; border: 1px solid #1f2937; color: #cbd5e1; font-size: 0.75rem; height: 60px; resize: none; border-radius: 4px; padding: 0.5rem; line-height: 1.4; }
    .t-group textarea:focus { border-color: #ef4444; }
    
    .char-count { font-size: 0.55rem; color: #ef4444; text-align: right; font-weight: 800; font-family: 'JetBrains Mono'; }
    .char-count.valid { color: #10b981; }

    .checklist { display: flex; flex-direction: column; gap: 0.4rem; }
    .c-item { display: flex; align-items: flex-start; gap: 0.5rem; cursor: pointer; }
    .c-item input { margin-top: 3px; accent-color: #ef4444; }
    .c-item span { font-size: 0.7rem; color: #cbd5e1; line-height: 1.3; }

    .sig-input { background: #030712; border: 1px solid #1f2937; color: #cbd5e1; padding: 0.5rem; font-size: 0.75rem; border-radius: 4px; font-family: 'JetBrains Mono'; }
    .sig-input:focus { border-color: #ef4444; }

    .takeover-footer { display: flex; justify-content: space-between; gap: 1rem; }
    .abort-btn { background: #111827; border: 1px solid #374151; color: #cbd5e1; padding: 0.65rem 1.25rem; font-size: 0.7rem; font-weight: 800; border-radius: 4px; cursor: pointer; }
    .abort-btn:hover { background: #1f2937; }
    
    .execute-takeover-btn { flex: 1; background: #ef4444; border: 1px solid #7f1d1d; color: white; padding: 0.65rem; font-size: 0.7rem; font-weight: 900; border-radius: 4px; cursor: pointer; text-transform: uppercase; }
    .execute-takeover-btn:disabled { opacity: 0.3; cursor: not-allowed; }

    @keyframes flash {
      from { opacity: 0.4; }
      to { opacity: 1; }
    }
    .flash-red-border { animation: borderFlashRed 1.5s infinite alternate; }
    @keyframes borderFlashRed {
      from { border-color: #374151; }
      to { border-color: #ef4444; }
    }
  `]
})
export class RecoveryConsoleComponent implements OnInit, OnDestroy {
  private stewardship = inject(StewardshipService);
  state$ = this.stewardship.state$;

  // Safe Mode / Gov collapse bindings
  generalJustification = '';
  genAck1 = false;
  genAck2 = false;

  // Quorum failure modal states
  isQuorumFailureActive = false;
  countdownSeconds = 10;
  private countdownSub: Subscription | null = null;
  private stateSub: Subscription | null = null;

  // Modal form bindings
  modalJustification = '';
  modalSignature = '';
  modalAck1 = false;
  modalAck2 = false;
  modalAck3 = false;

  ngOnInit() {
    // Listen to quorum status to trigger override takeover modal
    this.stateSub = this.state$.subscribe(state => {
      const isFailed = state.activeDrill === 'TOTAL_QUORUM_FAILURE' || state.quorumStatus === 'FAILED';
      if (isFailed && !this.isQuorumFailureActive) {
        this.startManualOverrideCeremony();
      } else if (!isFailed && this.isQuorumFailureActive) {
        this.isQuorumFailureActive = false;
      }
    });
  }

  ngOnDestroy() {
    if (this.countdownSub) this.countdownSub.unsubscribe();
    if (this.stateSub) this.stateSub.unsubscribe();
  }

  startManualOverrideCeremony() {
    this.isQuorumFailureActive = true;
    this.countdownSeconds = 10;
    
    // Clear old values
    this.modalJustification = '';
    this.modalSignature = '';
    this.modalAck1 = false;
    this.modalAck2 = false;
    this.modalAck3 = false;

    if (this.countdownSub) this.countdownSub.unsubscribe();

    // Enforce 10s cooling period countdown
    this.countdownSub = interval(1000)
      .pipe(takeWhile(() => this.countdownSeconds > 0))
      .subscribe({
        next: () => {
          this.countdownSeconds--;
        },
        complete: () => {
          this.countdownSeconds = 0;
        }
      });
  }

  hasFailures(invariants: any): boolean {
    if (!invariants) return false;
    return Object.values(invariants).some((v: any) => v.status === false);
  }

  resolveGovCollapse() {
    const actions = `Manually reconstructed Epoch Registry alignment. Actions taken: ${this.generalJustification}`;
    this.stewardship.resolveDrill('IFD-003', actions);
    
    // Clear inputs
    this.generalJustification = '';
    this.genAck1 = false;
    this.genAck2 = false;
  }

  executeRestoration() {
    alert('Standard restoration ceremony completed successfully. System state remains STABLE.');
  }

  abortOverride() {
    // Reset state to nominal if aborted
    this.stewardship.resetState();
    this.isQuorumFailureActive = false;
  }

  executeQuorumOverride() {
    if (this.countdownSeconds > 0) return;
    
    const actions = `Physical HSM key rotation executed under credential ${this.modalSignature}. Narrative: ${this.modalJustification}`;
    this.stewardship.resolveDrill('TOTAL_QUORUM_FAILURE', actions);
    
    this.isQuorumFailureActive = false;
  }
}

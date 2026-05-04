import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-threshold-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="threshold-panel">
      <div class="panel-header">
        <span class="icon">🛡️</span>
        <h3>Threshold Management (TSS/BLS)</h3>
        <div class="status-badge" [class.active]="ceremonyActive">
          {{ ceremonyActive ? 'CEREMONY ACTIVE' : 'IDLE' }}
        </div>
        <div class="version-tag" *ngIf="ceremonyActive">v1.5</div>
      </div>

      <div class="panel-content">
        <!-- SETUP PHASE -->
        <div class="setup-section" *ngIf="ceremonyStatus === 'INIT'">
          <div class="input-group">
            <label>Threshold (t)</label>
            <input type="number" [(ngModel)]="t" min="1" [max]="n">
          </div>
          <div class="input-group">
            <label>Total Nodes (n)</label>
            <input type="number" [(ngModel)]="n" min="1" max="10">
          </div>
          <button class="primary-btn" (click)="initCeremony()">
            Begin MPC Ceremony
          </button>
        </div>

        <!-- MPC DKG PROGRESS -->
        <div class="mpc-progress-section" *ngIf="ceremonyStatus.startsWith('DKG')">
          <div class="mpc-steps">
            <div class="mpc-step" [class.active]="ceremonyStatus === 'DKG_ROUND_1'" [class.done]="ceremonyStatus !== 'DKG_ROUND_1'">
              <span class="step-num">1</span>
              <span class="step-label">VSS Commitments</span>
            </div>
            <div class="mpc-step-line"></div>
            <div class="mpc-step" [class.active]="ceremonyStatus === 'DKG_ROUND_2'" [class.done]="ceremonyStatus === 'ACTIVE'">
              <span class="step-num">2</span>
              <span class="step-label">Share Exchange</span>
            </div>
            <div class="mpc-step-line"></div>
            <div class="mpc-step" [class.active]="ceremonyStatus === 'ACTIVE'">
              <span class="step-num">3</span>
              <span class="step-label">Ready</span>
            </div>
          </div>

          <div class="round-instruction" *ngIf="ceremonyStatus === 'DKG_ROUND_1'">
            <p>Participants are generating local polynomials and publishing Pedersen Commitments...</p>
            <button class="action-btn" (click)="advanceDkg()">Simulate Round 1 (Commitments)</button>
          </div>

          <div class="round-instruction" *ngIf="ceremonyStatus === 'DKG_ROUND_2'">
            <p>Participants are exchanging secret shares and verifying them against commitments...</p>
            <button class="action-btn" (click)="advanceDkg()">Simulate Round 2 (Share Exchange)</button>
          </div>
        </div>

        <!-- ACTIVE CEREMONY PHASE -->
        <div class="ceremony-section" *ngIf="ceremonyStatus === 'ACTIVE' || ceremonyStatus === 'COMPLETED'">
          <div class="participants-grid">
            <div class="section-header">
              <h4>Signer Identity Table</h4>
              <div class="mpc-badge">MPC ENFORCED</div>
            </div>
            <div class="identity-table">
              <div class="table-row header">
                <div class="col">Node ID</div>
                <div class="col">Public Key</div>
                <div class="col">Status</div>
                <div class="col">Action</div>
              </div>
              <div class="table-row" *ngFor="let p of participants">
                <div class="col nodeId">{{ p.nodeId }}</div>
                <div class="col pubkey">{{ p.publicKey?.slice(0, 12) }}...</div>
                <div class="col status" [class.signed]="p.status === 'SIGNED'" [class.invalid]="p.status === 'INVALID'">
                  {{ p.status }}
                </div>
                <div class="col">
                  <input type="checkbox" 
                    [disabled]="p.status === 'SIGNED' || signed"
                    (change)="toggleParticipant(p.nodeId)">
                </div>
              </div>
            </div>
          </div>

          <!-- SIGNED BY SECTION (Audit Visibility) -->
          <div class="signed-by-section" *ngIf="signedSigners.length > 0">
            <h4>Signed By (Proof Metadata)</h4>
            <div class="signer-pills">
              <div class="signer-pill" *ngFor="let s of signedSigners">
                <span class="pill-node">{{ s.nodeId }}</span>
                <span class="pill-pk">{{ s.publicKey.slice(0, 8) }}...</span>
              </div>
            </div>
            <div class="quorum-info">
              Quorum: {{ signedSigners.length }} / {{ t }} ({{ signedSigners.length >= t ? 'VALID' : 'PARTIAL' }})
            </div>
          </div>

          <div class="action-bar">
            <div class="quorum-meter">
              <div class="progress-bg">
                <div class="progress-fill" [style.width.%]="quorumPercentage"></div>
              </div>
              <span class="quorum-text">
                Quorum: {{ selectedNodeIds.length }}/{{ t }} 
                <span *ngIf="quorumReached" class="success-text">(REACHED)</span>
              </span>
            </div>

            <button class="sign-btn" 
              [disabled]="!quorumReached || signed" 
              (click)="sign()">
              {{ signed ? 'AGGREGATED' : 'Aggregate & Finalize' }}
            </button>
            <button class="validate-btn" *ngIf="signed" (click)="checkCompliance()">
              Validate RFC v1.5
            </button>
            <button class="reset-btn" (click)="reset()">Reset Ceremony</button>
          </div>

          <!-- ADVERSARIAL MODE -->
          <div class="adversarial-section" *ngIf="ceremonyActive">
            <div class="section-header">
              <span class="warning-icon">⚠️</span>
              <h4>Adversarial Attack Simulation</h4>
              <button class="attack-btn" [disabled]="isSimulating" (click)="runAdversarial()">
                {{ isSimulating ? 'SIMULATING...' : 'Run Attack Suite' }}
              </button>
            </div>
            
            <div class="attack-results" *ngIf="adversarialResults.length > 0">
              <div class="attack-row" *ngFor="let res of adversarialResults">
                <span class="attack-name">{{ res.name }}</span>
                <span class="attack-status" [class.rejected]="res.status === 'REJECTED'" [class.accepted]="res.status === 'ACCEPTED'">
                  {{ res.status }}
                </span>
                <span class="attack-error" *ngIf="res.status === 'REJECTED'">{{ res.error }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .threshold-panel {
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 4px;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .panel-header {
      padding: 10px 15px;
      border-bottom: 1px solid #333;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .panel-header h3 { margin: 0; font-size: 14px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
    .status-badge { font-size: 10px; padding: 2px 6px; border-radius: 2px; background: #222; color: #555; }
    .status-badge.active { background: #004400; color: #00ff00; border: 1px solid #00ff00; }

    .panel-content { padding: 15px; flex-grow: 1; display: flex; flex-direction: column; gap: 15px; }
    
    .setup-section { display: flex; align-items: flex-end; gap: 20px; }
    .input-group { display: flex; flex-direction: column; gap: 5px; }
    .input-group label { font-size: 12px; color: #666; }
    .input-group input { 
      background: #000; border: 1px solid #333; color: #0f0; padding: 5px 10px; width: 60px; outline: none;
    }

    .identity-table { border: 1px solid #222; border-radius: 4px; font-size: 12px; }
    .table-row { display: grid; grid-template-columns: 100px 1fr 100px 60px; padding: 8px 12px; border-bottom: 1px solid #111; align-items: center; }
    .table-row.header { background: #111; color: #666; font-weight: bold; }
    .pubkey { color: #555; font-family: monospace; }
    .status.signed { color: #0f0; font-weight: bold; }
    .status.invalid { color: #f00; font-weight: bold; }

    .action-bar { display: flex; align-items: center; gap: 20px; margin-top: auto; padding-top: 15px; border-top: 1px solid #222; }
    .quorum-meter { flex-grow: 1; }
    .progress-bg { height: 8px; background: #111; border-radius: 4px; overflow: hidden; margin-bottom: 5px; }
    .progress-fill { height: 100%; background: #00ff00; transition: width 0.3s ease; box-shadow: 0 0 10px #00ff00; }
    .quorum-text { font-size: 12px; color: #888; }
    .success-text { color: #0f0; font-weight: bold; margin-left: 5px; }

    .primary-btn, .sign-btn { 
      background: #004400; color: #0f0; border: 1px solid #0f0; padding: 8px 16px; 
      cursor: pointer; font-weight: bold; text-transform: uppercase; font-size: 11px;
    }
    .primary-btn:hover, .sign-btn:hover:not(:disabled) { background: #006600; }
    .sign-btn:disabled { background: #111; color: #333; border-color: #333; cursor: not-allowed; }

    .reset-btn { background: transparent; color: #666; border: 1px solid #333; padding: 8px 16px; cursor: pointer; font-size: 11px; }
    .reset-btn:hover { color: #fff; border-color: #666; }

    .validate-btn { background: #001a44; color: #00aaff; border: 1px solid #00aaff; padding: 8px 16px; cursor: pointer; font-size: 11px; font-weight: bold; }
    .validate-btn:hover { background: #003388; }

    .version-tag { font-size: 9px; color: #444; border: 1px solid #222; padding: 1px 4px; border-radius: 20px; font-family: monospace; }

    .signed-by-section { margin-top: 15px; padding: 10px; background: #050505; border: 1px solid #222; border-radius: 4px; }
    .signed-by-section h4 { margin: 0 0 10px 0; font-size: 11px; color: #444; text-transform: uppercase; }
    .signer-pills { display: flex; flex-wrap: wrap; gap: 8px; }
    .signer-pill { display: flex; gap: 8px; align-items: center; background: #111; border: 1px solid #0f0; padding: 4px 10px; border-radius: 20px; font-size: 11px; }
    .pill-node { color: #0f0; font-weight: bold; }
    .pill-pk { color: #555; font-family: monospace; }
    .quorum-info { margin-top: 10px; font-size: 11px; color: #888; border-top: 1px solid #111; padding-top: 5px; }

    .adversarial-section { margin-top: 20px; border: 1px solid #440000; border-radius: 4px; padding: 12px; background: #1a0000; }
    .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .section-header h4 { margin: 0; font-size: 12px; color: #ff5555; text-transform: uppercase; }
    .attack-btn { background: #660000; color: #ff5555; border: 1px solid #ff5555; padding: 4px 10px; font-size: 10px; cursor: pointer; border-radius: 2px; }
    .attack-btn:hover:not(:disabled) { background: #880000; }
    .attack-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .attack-results { display: flex; flex-direction: column; gap: 5px; font-size: 11px; }
    .attack-row { display: grid; grid-template-columns: 150px 80px 1fr; gap: 10px; align-items: center; border-bottom: 1px solid #330000; padding: 4px 0; }
    .attack-name { color: #aaa; }
    .attack-status.rejected { color: #0f0; font-weight: bold; }
    .attack-status.accepted { color: #f00; font-weight: bold; text-decoration: underline; }
    .attack-error { color: #666; font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .mpc-progress-section { background: #050505; border: 1px solid #222; padding: 20px; border-radius: 4px; }
    .mpc-steps { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 20px; }
    .mpc-step { display: flex; flex-direction: column; align-items: center; gap: 5px; opacity: 0.3; }
    .mpc-step.active { opacity: 1; }
    .mpc-step.done { opacity: 1; color: #0f0; }
    .mpc-step.done .step-num { background: #0f0; color: #000; }
    .step-num { width: 24px; height: 24px; border-radius: 12px; background: #222; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 1px solid #444; }
    .mpc-step.active .step-num { border-color: #0f0; box-shadow: 0 0 10px #0f0; }
    .step-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
    .mpc-step-line { flex-grow: 0; width: 40px; height: 1px; background: #222; }
    
    .round-instruction { text-align: center; }
    .round-instruction p { font-size: 13px; color: #888; margin-bottom: 15px; }
    .action-btn { background: #004400; color: #0f0; border: 1px solid #0f0; padding: 10px 20px; cursor: pointer; text-transform: uppercase; font-size: 12px; font-weight: bold; }
    .action-btn:hover { background: #006600; box-shadow: 0 0 15px #0f0; }

    .mpc-badge { font-size: 9px; background: #003366; color: #00aaff; padding: 2px 6px; border-radius: 2px; font-weight: bold; }
  `]
})
export class ThresholdPanelComponent {
  @Input() ceremonyActive = false;
  @Input() ceremonyStatus: string = 'INIT';
  @Input() participants: any[] = [];
  @Input() signed = false;
  @Input() adversarialResults: any[] = [];
  @Input() isSimulating = false;

  @Output() onInit = new EventEmitter<{ t: number, n: number }>();
  @Output() onSign = new EventEmitter<string[]>();
  @Output() onReset = new EventEmitter<void>();
  @Output() onRunAdversarial = new EventEmitter<void>();
  @Output() onCheckCompliance = new EventEmitter<void>();
  @Output() onAdvanceDkg = new EventEmitter<void>();

  t: number = 2;
  n: number = 3;
  selectedNodeIds: string[] = [];

  get quorumReached() {
    return this.selectedNodeIds.length >= this.t;
  }

  get signedSigners() {
    return this.participants.filter(p => p.status === 'SIGNED');
  }

  get quorumPercentage() {
    return Math.min(100, (this.selectedNodeIds.length / this.t) * 100);
  }

  initCeremony() {
    this.onInit.emit({ t: this.t, n: this.n });
  }

  toggleParticipant(nodeId: string) {
    const idx = this.selectedNodeIds.indexOf(nodeId);
    if (idx === -1) {
      this.selectedNodeIds.push(nodeId);
    } else {
      this.selectedNodeIds.splice(idx, 1);
    }
  }

  sign() {
    this.onSign.emit(this.selectedNodeIds);
  }

  reset() {
    this.selectedNodeIds = [];
    this.onReset.emit();
  }

  runAdversarial() {
    this.onRunAdversarial.emit();
  }

  checkCompliance() {
    this.onCheckCompliance.emit();
  }

  advanceDkg() {
    this.onAdvanceDkg.emit();
  }
}

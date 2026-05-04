import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-output-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="panel output-panel">
      <div class="header">
        <h3>Output (Audit Diagnostic)</h3>
      </div>
      
      <div class="scrollable">
        <!-- CANONICAL SECTION -->
        <div class="section">
          <label>Canonical Hex (TLS Binary Stream):</label>
          <div class="value hex-stream">{{ output?.hex || '0x...' }}</div>
        </div>

        <div class="section">
          <label>SHA-256 (Canonical Hash):</label>
          <div class="value hash-display">
            {{ output?.hash || '...' }}
          </div>
        </div>

        <div class="section">
          <label>Byte Length:</label>
          <div class="value status">{{ output?.diagnostics?.rawBytesLength || 0 }} bytes</div>
        </div>

        <!-- TSS SECTION -->
        <div class="tss-section" *ngIf="tssEnabled">
          <div class="divider"></div>
          <div class="header">
            <h3>Threshold (BLS) Artifacts</h3>
          </div>

          <div class="section">
            <label>Master Public Key (DKG Derived):</label>
            <div class="value small-hash">{{ output?.tss?.masterPublicKey || '...' }}</div>
          </div>

          <div class="section">
            <label>Aggregated Group Signature:</label>
            <div class="value small-hash aggregated-sig">{{ output?.tss?.aggregatedSignature || '...' }}</div>
          </div>

          <div class="section">
            <label>Quorum Reached:</label>
            <div class="value status" [class.success]="output?.tss?.isValid">
              {{ output?.tss?.currentSigners?.length || 0 }} / {{ output?.tss?.participants?.length || 0 }} nodes
              <span *ngIf="output?.tss?.isValid"> (VERIFIED ✔)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .output-panel { flex: 1; background: #0a0a0a; border: 1px solid #333; padding: 15px; display: flex; flex-direction: column; overflow: hidden; }
    .header { margin-bottom: 15px; }
    h3 { margin: 0; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
    
    .scrollable { overflow-y: auto; flex-grow: 1; }
    .section { margin-bottom: 15px; }
    label { font-size: 10px; color: #444; text-transform: uppercase; margin-bottom: 5px; display: block; }
    
    .value { background: #000; border: 1px solid #222; padding: 10px; font-family: monospace; font-size: 12px; color: #0f0; word-break: break-all; }
    .hex-stream { color: #888; line-height: 1.4; font-size: 11px; }
    .hash-display { border-color: #0f0; font-weight: bold; }
    .small-hash { font-size: 10px; color: #0af; border-color: #002b4d; }
    .aggregated-sig { color: #0f0; border-color: #0f0; }
    .status { color: #888; font-size: 11px; }
    .status.success { color: #0f0; font-weight: bold; border-color: #0f0; }
    
    .divider { height: 1px; background: #222; margin: 20px 0; }
    .tss-section { animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class OutputPanelComponent {
  @Input() output: any = null;
  @Input() tssEnabled = false;
}

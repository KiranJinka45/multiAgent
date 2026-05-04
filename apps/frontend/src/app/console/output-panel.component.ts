import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-output-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="panel">
      <div class="header">
        <h3>Output (Audit Diagnostic)</h3>
        <span class="size-tag" *ngIf="output?.diagnostics">
          Size: {{ output.diagnostics.rawBytesLength }} bytes
        </span>
      </div>
      
      <div class="field">
        <label>Final Canonical Hash:</label>
        <div class="value hash-display">
          {{ output?.hash || '...' }}
          <button class="copy-btn" (click)="copyHash()">Copy</button>
        </div>
      </div>

      <div class="field" *ngIf="output?.sessionHash">
        <label>Session Integrity Hash (Cryptographically Bound):</label>
        <div class="value session-hash">{{ output.sessionHash }}</div>
      </div>

      <div class="tabs">
        <button [class.active]="activeTab === 'hex'" (click)="activeTab = 'hex'">Hex Stream</button>
        <button [class.active]="activeTab === 'structure'" (click)="activeTab = 'structure'">Binary Map</button>
        <button [class.active]="activeTab === 'normalization'" (click)="activeTab = 'normalization'">Unicode Normalization</button>
      </div>

      <div class="tab-content">
        <!-- HEX VIEW -->
        <div *ngIf="activeTab === 'hex'">
          <div class="value scrollable hex-stream">{{ output?.hex || '0x...' }}</div>
        </div>

        <!-- STRUCTURE VIEW -->
        <div *ngIf="activeTab === 'structure'">
          <div class="scrollable">
            <table class="diag-table" *ngIf="output?.diagnostics?.fieldBreakdown; else noData">
              <thead>
                <tr>
                  <th>Offset</th>
                  <th>Field</th>
                  <th>Len</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let f of output.diagnostics.fieldBreakdown">
                  <td class="f-offset">{{ f.offset }}</td>
                  <td class="f-name">{{ f.name }}</td>
                  <td>{{ f.length }}B</td>
                  <td class="f-val">{{ f.value }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- NORMALIZATION VIEW -->
        <div *ngIf="activeTab === 'normalization'">
          <table class="diag-table" *ngIf="output?.diagnostics?.normalizationMap; else noData">
            <thead>
              <tr>
                <th>Input String</th>
                <th>→</th>
                <th>NFC (Canonical)</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of (output.diagnostics.normalizationMap | keyvalue)">
                <td class="f-name">"{{ item.key }}"</td>
                <td>→</td>
                <td class="f-val">"{{ item.value }}"</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div *ngIf="expectedHash" class="field comparison">
        <label>Verification Loop:</label>
        <div class="value" [ngClass]="{'match': match, 'mismatch': !match}">
          {{ match ? '✔ MATCH' : '✖ MISMATCH' }}
          <br>
          <small>Expected: {{ expectedHash }}</small>
        </div>
      </div>

      <ng-template #noData>
        <div class="empty-state">Execute verification to populate diagnostics</div>
      </ng-template>
    </div>
  `,
  styles: [`
    .panel {
      flex: 1;
      background: #111;
      color: #0f0;
      padding: 10px;
      border: 1px solid #333;
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    .header { display: flex; justify-content: space-between; align-items: center; }
    h3 { margin: 0; font-size: 14px; color: #888; }
    .size-tag { font-size: 10px; background: #222; padding: 2px 5px; color: #aaa; }
    .field { display: flex; flex-direction: column; gap: 5px; }
    label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
    .value {
      background: #000;
      padding: 10px;
      border: 1px solid #222;
      font-family: monospace;
      word-break: break-all;
      min-height: 20px;
      font-size: 12px;
    }
    .hash-display { display: flex; justify-content: space-between; align-items: center; border-color: #0f0; }
    .session-hash { border-color: #444; color: #888; font-size: 11px; }
    .copy-btn { background: transparent; border: 1px solid #444; color: #888; font-size: 10px; cursor: pointer; }
    .copy-btn:hover { color: #0f0; border-color: #0f0; }
    
    .tabs { display: flex; gap: 5px; border-bottom: 1px solid #222; }
    .tabs button {
      background: transparent; border: none; color: #555; font-family: monospace;
      font-size: 11px; cursor: pointer; padding: 8px 10px;
    }
    .tabs button.active { color: #0f0; border-bottom: 2px solid #0f0; }
    
    .tab-content { flex-grow: 1; min-height: 250px; display: flex; flex-direction: column; }
    .scrollable { flex-grow: 1; max-height: 250px; overflow-y: auto; }
    .hex-stream { color: #888; font-size: 11px; line-height: 1.4; }
    
    .diag-table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .diag-table th { text-align: left; color: #444; padding: 8px 0; border-bottom: 1px solid #222; }
    .diag-table td { padding: 6px 0; border-bottom: 1px solid #1a1a1a; }
    .f-offset { color: #444; width: 60px; }
    .f-name { color: #888; }
    .f-val { color: #0f0; font-weight: bold; }

    .match { color: #0f0; border-color: #0f0; }
    .mismatch { color: #f00; border-color: #f00; }
    .comparison { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #333; }
    .empty-state { color: #333; display: flex; align-items: center; justify-content: center; height: 100%; font-style: italic; }
  `]
})
export class OutputPanelComponent {
  @Input() output: any = null;
  @Input() expectedHash: string | null = null;

  activeTab: 'hex' | 'structure' | 'normalization' = 'hex';

  get match(): boolean {
    return this.output?.hash === this.expectedHash;
  }

  copyHash() {
    if (this.output?.hash) navigator.clipboard.writeText(this.output.hash);
  }
}

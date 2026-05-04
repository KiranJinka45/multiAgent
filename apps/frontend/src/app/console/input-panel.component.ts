import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="panel">
      <div class="header">
        <h3>Input (JSON)</h3>
        <div class="header-actions">
          <button class="small-btn" (click)="copyInput()">Copy</button>
          <button class="small-btn" (click)="fileInput.click()">Import Session</button>
          <input #fileInput type="file" style="display:none" (change)="onImportSession($event)">
        </div>
      </div>
      <textarea [(ngModel)]="inputJson" spellcheck="false" placeholder="Paste JSON audit payload..."></textarea>
      
      <div class="section-label">Execution Gate</div>
      <div class="actions">
        <button (click)="onRun()">Run Pipeline</button>
        <button (click)="onLoadVector()">Load RFC v1.4 Vector</button>
      </div>

      <div class="section-label">Ceremony Mode</div>
      <div class="toggle-row">
        <label class="switch">
          <input type="checkbox" [(ngModel)]="tssEnabled" (change)="tssToggle.emit(tssEnabled)">
          <span class="slider"></span>
        </label>
        <span class="toggle-label">Enable Threshold Signing (BLS)</span>
      </div>

      <div class="section-label">Audit Safety Triggers</div>
      <div class="actions grid">
        <button class="danger" (click)="onTestNegative('INVALID_UTF8')">Invalid UTF-8</button>
        <button class="danger" (click)="onTestNegative('DUPLICATE_NFC')">Duplicate NFC</button>
        <button class="danger" (click)="onTestNegative('OVERSIZE')">Oversize Field</button>
      </div>

      <div class="section-label">Verification Suite</div>
      <div class="actions">
        <button (click)="onDeterminismCheck()">Deep Determinism Test</button>
        <button (click)="onMutationTest()">Mutation (Avalanche) Test</button>
        <button (click)="onGenerateScript()">Generate Verify Script</button>
        <button (click)="onExportSession()">Export Session Bundle</button>
        <button (click)="onExportProof()">Export Proof Bundle</button>
        <button (click)="onVerifyBackend()">Verify with Backend</button>
        <button (click)="onRunTss()">Run TSS Ceremony</button>
      </div>
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
    }
    .header { display: flex; justify-content: space-between; align-items: center; }
    h3 { margin: 0; font-size: 14px; color: #888; }
    .header-actions { display: flex; gap: 5px; }
    .section-label { font-size: 10px; color: #555; margin-top: 15px; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
    textarea {
      width: 100%;
      height: 180px;
      background: #000;
      color: #0f0;
      border: 1px solid #222;
      font-family: monospace;
      padding: 10px;
      resize: none;
      font-size: 12px;
    }
    .actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; }
    button {
      background: #222;
      color: #0f0;
      border: 1px solid #0f0;
      padding: 5px 8px;
      cursor: pointer;
      font-family: monospace;
      font-size: 11px;
      flex-grow: 1;
    }
    button:hover { background: #0f0; color: #000; }
    button.danger { border-color: #600; color: #f66; }
    button.danger:hover { background: #f66; color: #000; }
    .small-btn { font-size: 10px; padding: 2px 6px; border-color: #444; color: #888; flex-grow: 0; }
    
    .toggle-row { display: flex; align-items: center; gap: 10px; margin: 5px 0; }
    .toggle-label { font-size: 11px; color: #aaa; }
    .switch { position: relative; display: inline-block; width: 30px; height: 16px; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #333; transition: .4s; border-radius: 16px; }
    .slider:before { position: absolute; content: ""; height: 10px; width: 10px; left: 3px; bottom: 3px; background-color: #555; transition: .4s; border-radius: 50%; }
    input:checked + .slider { background-color: #0f0; }
    input:checked + .slider:before { transform: translateX(14px); background-color: #000; }
  `]
})
export class InputPanelComponent {
  inputJson: string = JSON.stringify({
    auditId: "RFC-COMPLEX-🎉-V1.4",
    timestamp: 1710000000000,
    nodeIds: ["Node-C", "Node-A", "Node-B"],
    threshold: 2,
    payloadHash: "7289f43e1d3e4b5a6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b"
  }, null, 2);

  @Output() run = new EventEmitter<any>();
  @Output() loadVector = new EventEmitter<void>();
  @Output() testNegative = new EventEmitter<string>();
  @Output() determinismCheck = new EventEmitter<void>();
  @Output() mutationTest = new EventEmitter<void>();
  @Output() generateScript = new EventEmitter<void>();
  @Output() exportSession = new EventEmitter<void>();
  @Output() exportProof = new EventEmitter<void>();
  @Output() importSession = new EventEmitter<any>();
  @Output() verifyBackend = new EventEmitter<any>();
  @Output() runTss = new EventEmitter<void>();
  @Output() tssToggle = new EventEmitter<boolean>();

  tssEnabled = false;

  onRun() {
    try {
      const parsed = JSON.parse(this.inputJson);
      this.run.emit(parsed);
    } catch (e) {
      alert("Invalid JSON");
    }
  }

  onLoadVector() {
    this.loadVector.emit();
  }

  onTestNegative(type: string) {
    this.testNegative.emit(type);
  }

  onDeterminismCheck() {
    this.determinismCheck.emit();
  }

  onMutationTest() {
    this.mutationTest.emit();
  }

  onGenerateScript() {
    this.generateScript.emit();
  }

  onExportSession() {
    this.exportSession.emit();
  }

  onExportProof() {
    this.exportProof.emit();
  }

  onVerifyBackend() {
    try {
      const parsed = JSON.parse(this.inputJson);
      this.verifyBackend.emit(parsed);
    } catch (e) {
      alert("Invalid JSON");
    }
  }

  onRunTss() {
    this.runTss.emit();
  }

  onImportSession(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const session = JSON.parse(e.target.result);
        this.importSession.emit(session);
      } catch (err) {
        alert("Invalid Session File");
      }
    };
    reader.readAsText(file);
  }

  copyInput() {
    navigator.clipboard.writeText(this.inputJson);
  }

  setInput(json: any) {
    this.inputJson = JSON.stringify(json, null, 2);
  }
}

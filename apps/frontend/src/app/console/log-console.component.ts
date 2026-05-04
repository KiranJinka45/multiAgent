import { Component, Input, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-log-console',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="logs" #scrollContainer>
      <div *ngFor="let log of logs" [ngClass]="log.type.toLowerCase()" class="log-line">
        <div class="main-line">
          <span class="step" *ngIf="log.step">STEP {{ log.step }}</span>
          <span class="type">[{{ log.type }}]</span>
          <span class="msg">{{ log.message }}</span>
          <span class="trace-hash" *ngIf="log.traceHash">TR:{{ log.traceHash.slice(0, 8) }}</span>
        </div>
        <div class="sub-msg" *ngIf="log.subMessage">{{ log.subMessage }}</div>
        <div class="step-hashes" *ngIf="log.inputHash || log.outputHash">
          <span *ngIf="log.inputHash">IN: {{ log.inputHash.slice(0, 16) }}...</span>
          <span *ngIf="log.outputHash">OUT: {{ log.outputHash.slice(0, 16) }}...</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .logs {
      margin-top: 10px;
      background: black;
      color: #0f0;
      height: 200px;
      overflow-y: auto;
      padding: 10px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      border: 1px solid #333;
    }
    .log-line { margin-bottom: 12px; border-left: 2px solid #222; padding-left: 10px; }
    .main-line { display: flex; align-items: center; gap: 8px; }
    .step { background: #222; color: #aaa; padding: 1px 6px; font-size: 9px; font-weight: bold; }
    .type { color: #555; font-size: 10px; }
    .msg { flex-grow: 1; }
    .trace-hash { color: #333; font-size: 9px; }
    .sub-msg { color: #888; font-size: 11px; font-style: italic; white-space: pre-wrap; margin-top: 4px; }
    .step-hashes { display: flex; gap: 15px; color: #444; font-size: 9px; margin-top: 4px; }
    
    .info { color: #0f0; border-left-color: #0f0; }
    .success { color: #0f0; font-weight: bold; border-left-color: #0f0; }
    .error { color: #f00; border-left-color: #f00; }
    .warn { color: #ff0; border-left-color: #ff0; }
    
    .error .step { background: #f00; color: #000; }
  `]
})
export class LogConsoleComponent implements AfterViewChecked {
  @Input() logs: { 
    type: string, 
    message: string, 
    step?: number, 
    subMessage?: string,
    traceHash?: string,
    inputHash?: string,
    outputHash?: string
  }[] = [];
  
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }
}

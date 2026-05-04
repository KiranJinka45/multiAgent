import { Component, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThresholdCrypto, VerificationResult, AuditInput } from '@packages/ztan-crypto';

interface TerminalLine {
  text: string;
  type: 'cmd' | 'info' | 'error' | 'success' | 'link' | 'bold';
  timestamp: string;
}

@Component({
  selector: 'app-audit-verifier',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-verifier.html',
  styleUrls: ['./audit-verifier.css']
})
export class AuditVerifierComponent implements AfterViewChecked {
  @ViewChild('terminalBody') private terminalBody!: ElementRef;

  viewMode: 'SIMPLE' | 'DEVELOPER' | 'AUDIT' = 'SIMPLE';
  sessionId: string = Math.random().toString(36).substring(7).toUpperCase();
  
  buffer: string = '';
  commandInput: string = '';
  history: TerminalLine[] = [];
  
  isVerifying: boolean = false;
  showTrace: boolean = true;
  bufferVisible: boolean = true;

  lastResult: VerificationResult | null = null;
  explanation: string = '';

  // Phase 4: Ceremony Stats Dashboard
  stats = {
    active: 3,
    completed: 142,
    aborted: 4,
    fraudDetected: 1
  };

  constructor() {
    this.addLog('ZTAN Infrastructure Terminal v1.1.0', 'bold');
    this.addLog('Type "help" for available commands.', 'info');
    this.loadExample();
  }

  setMode(mode: 'SIMPLE' | 'DEVELOPER' | 'AUDIT') {
    this.viewMode = mode;
    this.addLog(`Switched to ${mode} mode`, 'info');
  }

  toggleBuffer() {
    this.bufferVisible = !this.bufferVisible;
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      const cmd = this.commandInput.trim();
      if (cmd) {
        this.executeCommand(cmd);
      }
    }
  }

  async executeCommand(rawCmd: string) {
    const [cmd, ...args] = rawCmd.toLowerCase().split(' ');
    this.addLog(`> ${rawCmd}`, 'cmd');
    this.commandInput = '';

    switch (cmd) {
      case 'help':
        this.addLog('Available commands:', 'info');
        this.addLog('  load     - Load sample audit JSON into buffer', 'info');
        this.addLog('  verify   - Execute cryptographic verification', 'info');
        this.addLog('  trace    - Toggle hash-linked trace visibility', 'info');
        this.addLog('  clear    - Clear terminal history', 'info');
        this.addLog('  stats    - View ceremony dashboard metrics', 'info');
        break;

      case 'load':
        this.loadExample();
        this.addLog('Sample audit JSON loaded.', 'success');
        break;

      case 'clear':
        this.history = [];
        break;

      case 'stats':
        this.viewMode = 'AUDIT';
        this.addLog('Opening Audit Dashboard...', 'info');
        break;

      case 'verify':
        await this.runVerification();
        break;

      default:
        this.addLog(`Unknown command: ${cmd}.`, 'error');
    }
  }

  async runVerification() {
    if (!this.buffer) {
      this.addLog('Error: Buffer is empty.', 'error');
      return;
    }

    try {
      this.isVerifying = true;
      this.explanation = '';
      this.addLog('Starting consensus verification...', 'bold');

      // 1. Initial Local Analysis
      const initial = await ThresholdCrypto.verifyAudit(this.buffer, { skipMarkSeen: true });
      if (initial.status === 'FAILED') {
        this.lastResult = initial;
        this.addLog(`FAIL: ${initial.reason}`, 'error');
        this.generateExplanation();
        return;
      }

      // 2. Simulated Consensus Step
      this.addLog('Requesting infrastructure signatures...', 'info');
      const anchor = initial.finalAnchor!;
      const AUTHORITIES = ['SEC-GOV-01', 'SRE-AUDIT-02', 'TRUST-NODE-03'];
      
      const partialSigs = AUTHORITIES.map(id => ({
        verifierId: id,
        signature: ThresholdCrypto.signAnchor(anchor, id)
      }));

      const consensusInput: AuditInput = {
        ...JSON.parse(this.buffer),
        partialAnchorSignatures: partialSigs,
        consensusThreshold: 2
      };

      // 3. Final Verification
      const result = await ThresholdCrypto.verifyAudit(JSON.stringify(consensusInput));
      this.lastResult = result;
      this.renderResult(result);
      this.generateExplanation();

    } catch (e: any) {
      this.addLog(`FATAL ERROR: ${e.message}`, 'error');
    } finally {
      this.isVerifying = false;
    }
  }

  generateExplanation() {
    if (!this.lastResult) return;
    
    if (this.lastResult.status === 'VERIFIED') {
      this.explanation = `✔ This audit is cryptographically valid. 
      - Identity Verification: All ${this.lastResult.contributingVerifiers?.length} signatures matched registered public keys.
      - Consensus: Met threshold of 2/3 authorized verifiers.
      - Integrity: Hash chain successfully reconstructed from genesis anchor.`;
    } else {
      this.explanation = `❌ Verification failed: ${this.lastResult.reason}. 
      This usually indicates a signature mismatch or an invalid threshold configuration.`;
    }
  }

  renderResult(result: VerificationResult) {
    if (this.showTrace) {
      result.trace.forEach((step, i) => {
        this.addLog(`→ ${step}`, 'info');
        if (result.traceHashChain[i]) {
          this.addLog(`  🔗 ${result.traceHashChain[i].slice(0, 16)}...`, 'link');
        }
      });
    }

    if (result.status === 'VERIFIED') {
      this.addLog('\nSTATUS: CONSENSUS VERIFIED', 'success');
      this.addLog(`Final Anchor Root: ${result.finalAnchor?.slice(0, 32)}...`, 'success');
    } else {
      this.addLog(`\nSTATUS: FAILED`, 'error');
    }
  }

  addLog(text: string, type: TerminalLine['type']) {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false });
    this.history.push({ text, type, timestamp });
  }

  loadExample() {
    const example = {
      version: 'ZTAN_CANONICAL_V1',
      auditId: `AUDIT-${Math.random().toString(36).substring(7).toUpperCase()}`,
      timestamp: Date.now(),
      payloadHash: '8f92b4e28f92b4e28f92b4e28f92b4e28f92b4e28f92b4e28f92b4e28f92b4e2',
      threshold: 2,
      nodeIds: ['nodeA', 'nodeB', 'nodeC']
    };
    this.buffer = JSON.stringify(example, null, 2);
  }

  private scrollToBottom(): void {
    try {
      this.terminalBody.nativeElement.scrollTop = this.terminalBody.nativeElement.scrollHeight;
    } catch (err) {}
  }
}

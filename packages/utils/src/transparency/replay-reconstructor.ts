// ZTAN Deterministic Replay Reconstruction & HLC Verification Tool (v1.3.0-LTS)
// Re-executes causal sequences, performs strict SHA-256 event hash integrity checks,
// and verifies cryptographic hash-chain link continuity to prevent deletion, insertion, or splice attacks.

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { HybridLogicalClock } from './hlc.js';

interface ForensicEvent {
  eventId: string;
  prevEventHash: string | null; // Verification link key
  timestamp: string;
  logicalClock: number;
  hlc: string; // Hybrid Logical Clock state 'l:c'
  eventType: string;
  seqId: number;
  nodeId?: string;
  runtime?: string;
  latencyMs?: number;
  accepted?: boolean;
  error?: string | null;
  ruleset?: string;
  correlationId?: string;
}

interface RawFrame {
  sequenceId: number;
  direction: 'INBOUND' | 'OUTBOUND';
  nodeId?: string;
  rawPayload: string;
  timestamp: string;
  logicalClock: number;
  hlc: string; // Hybrid Logical Clock state 'l:c'
}

interface ValidatorState {
  nodeId: string;
  runtime: string;
  logicalTime: number;
  hlc: string;
  ruleset: 'v1.x' | 'v2.x';
  ledger: string[];
  currentSeq: number;
  active: boolean;
  validationLog: Array<{ seqId: number; accepted: boolean; error: string | null }>;
}

class ZtanReplayReconstructor {
  private forensicsPath = path.join(process.cwd(), '.ztan-transparency', 'forensics.json');
  private rawFramesPath = path.join(process.cwd(), '.ztan-transparency', 'raw_frames.json');
  private auditReportPath = path.join(process.cwd(), '.ztan-transparency', 'replay_audit.json');

  private validatorStates: Map<string, ValidatorState> = new Map();
  private events: ForensicEvent[] = [];
  private frames: RawFrame[] = [];

  constructor() {
    this.loadData();
  }

  private loadData() {
    if (!fs.existsSync(this.forensicsPath)) {
      throw new Error(`Forensics trace not found at ${this.forensicsPath}. Run the chaos campaign first!`);
    }
    if (!fs.existsSync(this.rawFramesPath)) {
      throw new Error(`Raw frames trace not found at ${this.rawFramesPath}. Run the chaos campaign first!`);
    }

    this.events = JSON.parse(fs.readFileSync(this.forensicsPath, 'utf-8'));
    this.frames = JSON.parse(fs.readFileSync(this.rawFramesPath, 'utf-8'));
  }

  private initValidator(nodeId: string, runtime: string, clock: number, hlcStr: string) {
    if (!this.validatorStates.has(nodeId)) {
      this.validatorStates.set(nodeId, {
        nodeId,
        runtime,
        logicalTime: clock,
        hlc: hlcStr,
        ruleset: 'v1.x',
        ledger: [],
        currentSeq: 0,
        active: true,
        validationLog: []
      });
    }
  }

  private validateDerSignatureSim(signatureHex: string) {
    const sigBytes = Buffer.from(signatureHex, 'hex');
    if (sigBytes.length < 8 || sigBytes[0] !== 0x30) {
      throw new Error("Invalid DER signature structure prefix.");
    }
    const totalLen = sigBytes[1];
    if (sigBytes.length !== totalLen + 2) {
      throw new Error("DER total length field mismatch.");
    }
    // High-S scalar validation
    let idx = 2;
    // R component
    if (sigBytes[idx] !== 0x02) {
      throw new Error("Invalid R-component integer tag.");
    }
    const rLen = sigBytes[idx + 1];
    const rVal = sigBytes.subarray(idx + 2, idx + 2 + rLen);
    if (rVal.length > 1 && rVal[0] === 0x00 && (rVal[1] & 0x80) === 0) {
      throw new Error("Overlong padding detected in R-component.");
    }
    if (rVal.length > 0 && (rVal[0] & 0x80) !== 0 && rVal[0] !== 0x00) {
      throw new Error("Negative R-component detected.");
    }

    idx += 2 + rLen;
    // S component
    if (sigBytes[idx] !== 0x02) {
      throw new Error("Invalid S-component integer tag.");
    }
    const sLen = sigBytes[idx + 1];
    const sVal = sigBytes.subarray(idx + 2, idx + 2 + sLen);
    if (sVal.length > 1 && sVal[0] === 0x00 && (sVal[1] & 0x80) === 0) {
      throw new Error("Overlong padding detected in S-component.");
    }
    if (sVal.length > 0 && (sVal[0] & 0x80) !== 0 && sVal[0] !== 0x00) {
      throw new Error("Negative S-component detected.");
    }

    const nOrder = BigInt("0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551");
    const halfN = nOrder / 2n;
    const sHex = sVal.toString('hex');
    const sInt = BigInt(`0x${sHex}`);
    if (sInt > halfN) {
      throw new Error("High-S scalar variant rejected (malleability risk).");
    }
  }

  private validateDuplicateKeysSim(payload: string) {
    const keys: string[] = [];
    const walk = (str: string) => {
      const keyPattern = /"([^"\\]*(?:\\.[^"\\]*)*)"\s*:/g;
      let match;
      while ((match = keyPattern.exec(str)) !== null) {
        const keyName = match[1];
        if (keys.includes(keyName)) {
          throw new Error(`Duplicate key detected: ${keyName}`);
        }
        keys.push(keyName);
      }
    };
    walk(payload);
  }

  private computeEventHash(event: Omit<ForensicEvent, 'eventId'>): string {
    const canonicalString = JSON.stringify({
      accepted: event.accepted || false,
      correlationId: event.correlationId || '',
      error: event.error || '',
      eventType: event.eventType,
      hlc: event.hlc,
      latencyMs: event.latencyMs || 0,
      logicalClock: event.logicalClock,
      nodeId: event.nodeId || '',
      prevEventHash: event.prevEventHash,
      ruleset: event.ruleset || '',
      runtime: event.runtime || '',
      seqId: event.seqId,
      timestamp: event.timestamp
    });
    return crypto.createHash('sha256').update(canonicalString).digest('hex');
  }

  private simulateValidation(nodeId: string, tx: { seqId: number; payload: string; signature?: string }): { accepted: boolean; error: string | null } {
    const state = this.validatorStates.get(nodeId);
    if (!state || !state.active) {
      return { accepted: false, error: "Validator is offline" };
    }

    if (tx.seqId >= 50) {
      state.ruleset = 'v2.x';
    } else {
      state.ruleset = 'v1.x';
    }

    try {
      this.validateDuplicateKeysSim(tx.payload);
      if (tx.signature) {
        this.validateDerSignatureSim(tx.signature);
      }
      if (state.ruleset === 'v2.x') {
        const decoded = JSON.parse(tx.payload);
        for (const key of Object.keys(decoded)) {
          if (key.length > 0 && key[0] >= 'A' && key[0] <= 'Z') {
            throw new Error(`Node v2 Ruleset Violation: Uppercase key '${key}' is strictly forbidden.`);
          }
        }
      }
      state.ledger.push(tx.payload);
      state.currentSeq = tx.seqId;
      return { accepted: true, error: null };
    } catch (e: any) {
      return { accepted: false, error: e.message };
    }
  }

  public reconstruct() {
    console.log("=========================================================================");
    console.log("      ZTAN Deterministic Replay Reconstruction & HLC Verification        ");
    console.log("=========================================================================");
    console.log(`[REPLAY] Forensics Source: ${this.forensicsPath}`);
    console.log(`[REPLAY] Raw Frames Source: ${this.rawFramesPath}`);

    // Sort all frames by Hybrid Logical Clock (HLC) with deterministic tie-breaking
    // to resolve concurrent causal ambiguity and prevent cross-platform replay nondeterminism.
    const sortedFrames = [...this.frames].sort((a, b) => {
      const parsedA = HybridLogicalClock.parse(a.hlc).getState();
      const parsedB = HybridLogicalClock.parse(b.hlc).getState();
      const cmp = HybridLogicalClock.compare(parsedA, parsedB);
      if (cmp !== 0) return cmp;

      // Secondary tie-breaker: nodeId lexicographical ordering
      const nodeA = a.nodeId || '';
      const nodeB = b.nodeId || '';
      if (nodeA !== nodeB) {
        return nodeA.localeCompare(nodeB);
      }

      // Tertiary tie-breaker: sequenceId numerical ordering
      if (a.sequenceId !== b.sequenceId) {
        return a.sequenceId - b.sequenceId;
      }

      // Quaternary tie-breaker: direction lexicographical ordering
      return a.direction.localeCompare(b.direction);
    });
    console.log(`[REPLAY] Loaded ${sortedFrames.length} Raw Network Frames & ${this.events.length} Forensic Events.`);
    
    let stateDiscrepancies = 0;
    let verifiedHashesCount = 0;
    let corruptedHashesCount = 0;
    let brokenLinksCount = 0;

    // Verify cryptographic integrity of the logged forensic event CHAIN (prevEventHash)
    console.log("\n[INTEGRITY] Conducting SHA-256 cryptographic hash-chain link verification...");
    for (let i = 0; i < this.events.length; i++) {
      const evt = this.events[i];
      
      // 1. Check local SHA-256 metadata hash correctness
      const recomputedHash = this.computeEventHash(evt);
      if (recomputedHash === evt.eventId) {
        verifiedHashesCount++;
      } else {
        console.error(`[TAMPER DETECTED] Metadata hash mismatch on event index ${i}: ${evt.eventId}`);
        corruptedHashesCount++;
      }

      // 2. Check hash-link continuity to block insertion/deletion/reorder attacks
      if (i === 0) {
        if (evt.prevEventHash !== null) {
          console.error(`[LINK CORRUPTED] Genesis event index 0 has non-null prevEventHash: ${evt.prevEventHash}`);
          brokenLinksCount++;
        }
      } else {
        const prevEvt = this.events[i - 1];
        if (evt.prevEventHash !== prevEvt.eventId) {
          console.error(`[LINK CORRUPTED] Hash-chain discontinuity at index ${i}!`);
          console.error(`  - Event prevEventHash: ${evt.prevEventHash}`);
          console.error(`  - Expected prior hash: ${prevEvt.eventId}`);
          brokenLinksCount++;
        }
      }
    }
    
    if (corruptedHashesCount === 0 && brokenLinksCount === 0) {
      console.log(`[INTEGRITY] ✅ Forensic Chain Verification Successful! Verified ${verifiedHashesCount}/${this.events.length} hash-links. Causal history is unbroken.`);
    } else {
      console.error(`[INTEGRITY] ❌ Warning: ${corruptedHashesCount} metadata mismatches and ${brokenLinksCount} broken links detected!`);
    }

    console.log("\n[REPLAY] Re-executing causal step transitions ordered by Hybrid Logical Clocks (HLC)...");
    for (const frame of sortedFrames) {
      const clock = frame.logicalClock;
      const hlcStr = frame.hlc;
      const rawPayload = JSON.parse(frame.rawPayload);

      if (rawPayload.type === 'REGISTRATION') {
        this.initValidator(rawPayload.nodeId, rawPayload.runtime, clock, hlcStr);
        console.log(`\n[HLC TICK ${hlcStr}] Validator Registration: [${rawPayload.nodeId}] (${rawPayload.runtime})`);
      } 
      
      else if (rawPayload.type === 'CRASH_TRIGGER') {
        const nodeId = frame.nodeId || 'UNKNOWN';
        const state = this.validatorStates.get(nodeId);
        if (state) {
          state.active = false;
          state.logicalTime = clock;
          state.hlc = hlcStr;
          console.log(`[HLC TICK ${hlcStr}] 💥 Validator Process Natively Terminated (Crash Trigger): [${nodeId}]`);
        }
      } 
      
      else if (rawPayload.type === 'TRANSACTION') {
        const tx = rawPayload.tx;
        const nodeId = frame.nodeId;
        
        if (nodeId && frame.direction === 'OUTBOUND') {
          const state = this.validatorStates.get(nodeId);
          if (state && state.active) {
            state.logicalTime = clock;
            state.hlc = hlcStr;
            
            const result = this.simulateValidation(nodeId, tx);
            state.validationLog.push({
              seqId: tx.seqId,
              accepted: result.accepted,
              error: result.error
            });

            console.log(`[HLC TICK ${hlcStr}] Tx Seq: ${tx.seqId} -> Validator [${nodeId}] (${state.ruleset}) | Simulation Decided: ${result.accepted ? 'ACCEPT' : 'REJECT'}`);

            const matchedForensic = this.events.find(
              e => e.eventType === 'RESPONSE_RECEIVED' && e.nodeId === nodeId && e.seqId === tx.seqId
            );

            if (matchedForensic) {
              const matchesAccepted = matchedForensic.accepted === result.accepted;
              if (!matchesAccepted) {
                console.error(`[DRIFT ERROR] State mismatch detected on Validator [${nodeId}], Seq ${tx.seqId}!`);
                console.error(`  - Simulated Replay Decided: ${result.accepted} (${result.error})`);
                console.error(`  - Recorded Forensics Decided: ${matchedForensic.accepted} (${matchedForensic.error})`);
                stateDiscrepancies++;
              }
            }
          }
        }
      }
    }

    console.log("\n=========================================================================");
    console.log("      Hybrid Logical Clock Replay Summary                                ");
    console.log("=========================================================================");
    console.log(`- Total Validated Validator States: ${this.validatorStates.size}`);
    for (const [nodeId, state] of this.validatorStates.entries()) {
      console.log(`  * Validator [${nodeId}] (${state.runtime}) | Active: ${state.active} | Ruleset: ${state.ruleset} | Local blocks: ${state.ledger.length} | Clock: ${state.logicalTime} | HLC: ${state.hlc}`);
    }
    
    console.log(`- State discrepancies detected during replay: ${stateDiscrepancies}`);
    if (stateDiscrepancies === 0 && corruptedHashesCount === 0 && brokenLinksCount === 0) {
      console.log("\n[VERIFICATION] ✅ No replay discrepancies were observed under the currently tested causal reconstruction scenarios using HLC total timeline replay.");
    } else {
      console.error("\n[VERIFICATION] ❌ State drift, cryptographic tampering, or causal discrepancies detected during replay!");
    }

    // Save persistent replay report
    fs.writeFileSync(this.auditReportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      discrepancies: stateDiscrepancies,
      activeValidators: Array.from(this.validatorStates.values()),
      integrityVerified: (corruptedHashesCount === 0 && brokenLinksCount === 0),
      auditTrail: this.events
    }, null, 2));
    console.log(`[REPLAY] Replay Audit log written successfully to ${this.auditReportPath}`);

    process.exit((stateDiscrepancies === 0 && corruptedHashesCount === 0 && brokenLinksCount === 0) ? 0 : 1);
  }
}

// Execute Replay
const reconstructor = new ZtanReplayReconstructor();
reconstructor.reconstruct();

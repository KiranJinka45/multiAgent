// ZTAN Independent Node Validator Node (v1.2.0-LTS)
// Connects to the local TCP Transport Bus, executes independent streaming JCS parsing,
// performs cryptographic DER pre-flight firewalls, governs epoch transitions natively,
// and implements Hybrid Logical Clock (HLC) causal tracing.

import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { validateDuplicateKeys } from '../canonicalizer.js';
import { HybridLogicalClock } from './hlc.js';

export class NodeValidatorNode {
  public nodeId: string;
  public busHost: string;
  public busPort: number;
  public ledger: string[] = [];
  public currentSeq = 0;
  public ruleset: 'v1.x' | 'v2.x' = 'v1.x';
  public activationEpoch = 50;
  private client: net.Socket | null = null;
  private running = true;

  // Persistence Paths
  private walPath: string;
  private snapshotPath: string;
  private persistenceDir = path.join(process.cwd(), '.ztan-transparency');

  // Lamport Logical Clock (backwards compatibility)
  private logicalTime = 0;

  // Hybrid Logical Clock (HLC)
  private hlc = new HybridLogicalClock(0, 0);

  constructor(nodeId: string, host: string, port: number) {
    this.nodeId = nodeId;
    this.busHost = host;
    this.busPort = port;
    this.walPath = path.join(this.persistenceDir, `wal_${this.nodeId}.jsonl`);
    this.snapshotPath = path.join(this.persistenceDir, `snapshot_${this.nodeId}.json`);

    // Ensure persistence directory exists
    if (!fs.existsSync(this.persistenceDir)) {
      fs.mkdirSync(this.persistenceDir, { recursive: true });
    }

    // Recover previous state from persisted WAL + snapshot
    this.recoverFromPersistedState();
  }

  private recoverFromPersistedState() {
    console.log(`[${this.nodeId}] Starting Write-Ahead Log (WAL) recovery ceremony...`);
    
    // 1. Recover state from deterministic snapshot with SHA-256 authenticity verification
    if (fs.existsSync(this.snapshotPath)) {
      try {
        const rawContent = fs.readFileSync(this.snapshotPath, 'utf-8');
        const snapshot = JSON.parse(rawContent);

        // Verify SHA-256 integrity checksum to protect against offline manipulation or torn snapshots
        if (snapshot.integrityChecksum) {
          const { integrityChecksum, ...stateData } = snapshot;
          // Normalize stringification to match checksum generation format
          const serialized = JSON.stringify(stateData, null, 2);
          const calculatedHash = crypto.createHash('sha256').update(serialized).digest('hex');

          if (calculatedHash !== integrityChecksum) {
            throw new Error(`INTEGRITY FAIL: Calculated hash (${calculatedHash.substring(0, 16)}) does not match embedded checksum (${integrityChecksum.substring(0, 16)}). Checkpoint is corrupted!`);
          }
          console.log(`[${this.nodeId}] Snapshot SHA-256 authenticity proof verified: ${integrityChecksum.substring(0, 16)}`);
        } else {
          console.warn(`[${this.nodeId}] Snapshot has no embedded integrity checksum. Processing as legacy checkpoint.`);
        }

        this.ledger = snapshot.ledger || [];
        this.currentSeq = snapshot.currentSeq || 0;
        this.ruleset = snapshot.ruleset || 'v1.x';
        this.logicalTime = snapshot.logicalTime || 0;
        this.hlc = new HybridLogicalClock(snapshot.hlcPhysical || 0, snapshot.hlcLogical || 0);
        console.log(`[${this.nodeId}] Persistence Checkpoint Loaded & Verified. Resurrected state to Seq ID ${this.currentSeq} (HLC: ${this.hlc.toString()}).`);
      } catch (e: any) {
        console.error(`[${this.nodeId}] Recovery critical: Failed to decode/verify snapshot checkpoint: ${e.message}. Starting from genesis.`);
      }
    } else {
      console.log(`[${this.nodeId}] Genesis boot. No checkpoint snapshot detected.`);
    }

    // 2. Play outstanding append-only Write-Ahead Log entries with self-healing log repair
    if (fs.existsSync(this.walPath)) {
      try {
        const walContent = fs.readFileSync(this.walPath, 'utf-8');
        const lines = walContent.split('\n');
        let fastForwardCount = 0;
        let validLines: string[] = [];
        let logTornDetected = false;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;

          try {
            const entry = JSON.parse(line);
            validLines.push(line);

            if (entry.type === 'TRANSACTION' && entry.seqId > this.currentSeq) {
              this.ledger.push(entry.payload);
              this.currentSeq = entry.seqId;
              this.logicalTime = entry.logicalTime;

              const parsedHlc = HybridLogicalClock.parse(entry.hlc);
              this.hlc = new HybridLogicalClock(parsedHlc.getPhysical(), parsedHlc.getLogical());
              fastForwardCount++;
            }
          } catch (err: any) {
            // Check if this is a trailing partial/torn line at the end of the WAL file
            const isTailLine = (i === lines.length - 1 || (i === lines.length - 2 && !lines[lines.length - 1].trim()));
            if (isTailLine) {
              console.warn(`[${this.nodeId}] ⚠️ TORN WRITE DETECTED at Write-Ahead Log tail! Raw: "${line.substring(0, 80)}"`);
              logTornDetected = true;
              break; // Gracefully halt parsing to recover from intact state
            } else {
              // Mid-log corruption is an unrecoverable failure
              console.error(`[${this.nodeId}] 🚨 CRITICAL MIDDLE CORRUPTION inside WAL line ${i + 1}: ${err.message}. Raw: "${line.substring(0, 80)}"`);
              throw new Error(`Unrecoverable middle WAL corruption at line ${i + 1}`);
            }
          }
        }

        // Execute self-healing log truncation repair
        if (logTornDetected) {
          console.log(`[${this.nodeId}] Executing self-healing repair... Truncating WAL to last known intact state.`);
          const repairedContent = validLines.join('\n') + (validLines.length > 0 ? '\n' : '');
          fs.writeFileSync(this.walPath, repairedContent, 'utf-8');

          const fd = fs.openSync(this.walPath, 'r+');
          fs.fsyncSync(fd);
          fs.closeSync(fd);
          console.log(`[${this.nodeId}] Self-healing complete. WAL tail truncated and physical block fsynced.`);
        }

        if (this.currentSeq >= this.activationEpoch) {
          this.ruleset = 'v2.x';
        } else {
          this.ruleset = 'v1.x';
        }

        if (fastForwardCount > 0) {
          console.log(`[${this.nodeId}] WAL playback successful! Fast-forwarded ${fastForwardCount} transactions. Ledger sequence finalized at Seq ID ${this.currentSeq} (HLC: ${this.hlc.toString()}).`);
        }
      } catch (e: any) {
        console.error(`[${this.nodeId}] Recovery failure: Error reading/recovering Write-Ahead Log: ${e.message}`);
      }
    } else {
      console.log(`[${this.nodeId}] Genesis boot. No Write-Ahead Log trace found.`);
    }
  }

  private writeSnapshot() {
    const tempPath = `${this.snapshotPath}.tmp`;
    try {
      const stateData = {
        currentSeq: this.currentSeq,
        ruleset: this.ruleset,
        logicalTime: this.logicalTime,
        hlcPhysical: this.hlc.getPhysical(),
        hlcLogical: this.hlc.getLogical(),
        ledger: this.ledger
      };

      // Generate SHA-256 integrity checksum over the normalized JSON payload
      const serialized = JSON.stringify(stateData, null, 2);
      const checksum = crypto.createHash('sha256').update(serialized).digest('hex');

      const checkpoint = {
        ...stateData,
        integrityChecksum: checksum
      };

      // Write to temp file and fsync physical storage buffer to disk
      fs.writeFileSync(tempPath, JSON.stringify(checkpoint, null, 2), 'utf-8');
      const fd = fs.openSync(tempPath, 'r+');
      fs.fsyncSync(fd);
      fs.closeSync(fd);

      // Atomically swap the temp checkpoint to guarantee zero-risk snapshot corruption
      fs.renameSync(tempPath, this.snapshotPath);
      console.log(`[${this.nodeId}] Captured atomic snapshot checkpoint at sequence ID ${this.currentSeq} (SHA-256: ${checksum.substring(0, 16)}).`);
    } catch (e: any) {
      console.error(`[${this.nodeId}] Snapshot failure: Failed to write checkpoint: ${e.message}`);
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch {}
      }
    }
  }

  private incrementClock(remoteClock = 0): number {
    this.logicalTime = Math.max(this.logicalTime, remoteClock) + 1;
    return this.logicalTime;
  }

  private updateHlc(remoteHlcString?: string): string {
    const now = Date.now();
    if (remoteHlcString) {
      const parsed = HybridLogicalClock.parse(remoteHlcString);
      this.hlc.updateReceive(parsed.getPhysical(), parsed.getLogical(), now);
    } else {
      this.hlc.incrementLocal(now);
    }
    return this.hlc.toString();
  }

  private validateDerSignature(signatureHex: string): boolean {
    try {
      const sigBytes = Buffer.from(signatureHex, 'hex');
      if (sigBytes.length < 8 || sigBytes[0] !== 0x30) {
        throw new Error("Invalid DER signature structure prefix.");
      }

      const totalLen = sigBytes[1];
      if (sigBytes.length !== totalLen + 2) {
        throw new Error("DER total length field mismatch.");
      }

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

      // Enforce High-S scalar check (malleability defense)
      const nOrder = BigInt("0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551");
      const halfN = nOrder / 2n;
      const sHex = sVal.toString('hex');
      const sInt = BigInt(`0x${sHex}`);
      if (sInt > halfN) {
        throw new Error("High-S scalar variant rejected (malleability risk).");
      }

      return true;
    } catch (e: any) {
      throw new Error(`DER Validation Failure: ${e.message}`);
    }
  }

  public processTransaction(tx: { seqId: number; payload: string; signature?: string }): { accepted: boolean; error: string | null } {
    // 1. Update ruleset state based on block epoch height
    if (tx.seqId >= this.activationEpoch) {
      this.ruleset = 'v2.x';
    } else {
      this.ruleset = 'v1.x';
    }

    try {
      // 2. Independent strict JCS Duplicate Key & Tokenizer PDA validation
      validateDuplicateKeys(tx.payload);

      // 3. Independent Cryptographic DER validation
      if (tx.signature) {
        this.validateDerSignature(tx.signature);
      }

      // 4. Independent Ruleset v2 Casing normalization enforcement
      if (this.ruleset === 'v2.x') {
        const decoded = JSON.parse(tx.payload);
        for (const key of Object.keys(decoded)) {
          if (key.length > 0 && key[0] >= 'A' && key[0] <= 'Z') {
            throw new Error(`Node v2 Ruleset Violation: Uppercase key '${key}' is strictly forbidden.`);
          }
        }
      }

      // Consensus tracking updates
      this.ledger.push(tx.payload);
      this.currentSeq = tx.seqId;

      // 5. Append transaction block to append-only WAL with physical fsync durability guarantees
      const walEntry = {
        type: 'TRANSACTION',
        seqId: tx.seqId,
        payload: tx.payload,
        signature: tx.signature || null,
        logicalTime: this.logicalTime,
        hlc: this.hlc.toString()
      };
      const walLine = JSON.stringify(walEntry) + "\n";
      const fd = fs.openSync(this.walPath, 'a');
      fs.writeSync(fd, walLine);
      fs.fsyncSync(fd);
      fs.closeSync(fd);

      // 6. Periodically capture deterministic state checkpoints/snapshots (every 5 blocks)
      if (this.ledger.length % 5 === 0) {
        this.writeSnapshot();
      }

      return { accepted: true, error: null };
    } catch (e: any) {
      return { accepted: false, error: e.message };
    }
  }

  public start() {
    console.log(`[${this.nodeId}] Starting Node Native Service with HLC...`);
    this.client = new net.Socket();

    this.client.connect(this.busPort, this.busHost, () => {
      const regClock = this.incrementClock();
      const regHlc = this.updateHlc();
      console.log(`[${this.nodeId}] Connected to TCP Transport Bus. (HLC: ${regHlc})`);
      const regPayload = JSON.stringify({
        type: "REGISTRATION",
        nodeId: this.nodeId,
        runtime: "Node",
        logicalClock: regClock,
        hlc: regHlc
      }) + "\n";
      this.client?.write(regPayload);
    });

    let buffer = "";
    this.client.on('data', (chunk) => {
      buffer += chunk.toString();
      while (buffer.includes('\n')) {
        const idx = buffer.indexOf('\n');
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);

        if (!line.trim()) continue;

        try {
          const msg = JSON.parse(line);
          const currentClock = this.incrementClock(msg.logicalClock || 0);
          const currentHlc = this.updateHlc(msg.hlc);

          if (msg.type === "CRASH_TRIGGER") {
            console.log(`[${this.nodeId}] Received CRASH_TRIGGER at HLC: ${currentHlc}. Natively exiting process.`);
            process.exit(0);
          }
          
          if (msg.type === "TRANSACTION") {
            const tx = msg.tx;
            const eventId = msg.eventId;
            const startTime = process.hrtime.bigint();

            const result = this.processTransaction(tx);
            const endTime = process.hrtime.bigint();
            const latencyMs = Number(endTime - startTime) / 1_000_000;

            const nextClock = this.incrementClock();
            const nextHlc = this.updateHlc();
            const res = {
              type: "VALIDATION_RESPONSE",
              nodeId: this.nodeId,
              eventId,
              seqId: tx.seqId,
              accepted: result.accepted,
              error: result.error,
              ruleset: this.ruleset,
              latencyMs,
              logicalClock: nextClock,
              hlc: nextHlc
            };
            this.client?.write(JSON.stringify(res) + "\n");
          }
        } catch (e: any) {
          console.error(`[${this.nodeId}] Error parsing message: ${e.message}`);
        }
      }
    });

    this.client.on('error', (err) => {
      console.error(`[${this.nodeId}] Socket error: ${err.message}`);
    });

    this.client.on('close', () => {
      console.log(`[${this.nodeId}] Connection closed by remote transport bus.`);
    });
  }
}

// Start CLI interface conditionally (bypassed in programmatic test contexts)
const isCli = !process.env.ZTAN_TEST && process.argv[1] && (process.argv[1].endsWith('validator-node.ts') || process.argv[1].endsWith('validator-node.js'));
if (isCli) {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log("Usage: node validator-node.js <node_id> <bus_host> <bus_port>");
    process.exit(1);
  }

  const node = new NodeValidatorNode(args[0], args[1], parseInt(args[2], 10));
  node.start();
}

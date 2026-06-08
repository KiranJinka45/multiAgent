// ZTAN Asynchronous TCP Transport Bus & Hybrid Causal Forensic Tracer (v1.4.0-LTS)
// Serves as the dumb communication medium between independent validator processes.
// Incorporates Hybrid Logical Clocks (HLCs), Socket-Level Raw Frame Capture, and Cryptographic Hash-Linked Forensic Chaining.

import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { HybridLogicalClock } from './hlc.js';
import type { HlcState } from './hlc.js';

export interface CausalEvent {
  eventId: string; // SHA-256 cryptographic hash of event metadata and previous event hash
  prevEventHash: string | null; // Cryptographic hash linkage for tamper-evident sequence integrity
  timestamp: string;
  logicalClock: number; // Lamport clock for backwards compatibility
  hlc: string; // Hybrid Logical Clock state 'l:c' for total causal ordering
  eventType: 'TRANSACTION_BROADCAST' | 'MESSAGE_FORWARDED' | 'RESPONSE_RECEIVED' | 'DIVERGENCE_DETECTED' | 'NODE_OFFLINE' | 'REPLAY_COMPLETE';
  seqId: number;
  nodeId?: string;
  runtime?: string;
  latencyMs?: number;
  accepted?: boolean;
  error?: string | null;
  ruleset?: string;
  correlationId?: string;
}

export interface RawFrame {
  sequenceId: number;
  direction: 'INBOUND' | 'OUTBOUND';
  nodeId?: string;
  rawPayload: string;
  timestamp: string;
  logicalClock: number; // Lamport clock
  hlc: string; // HLC state 'l:c'
}

export class AsyncTransportBus {
  private server: net.Server | null = null;
  private port: number;
  private clients: Map<string, { socket: net.Socket; runtime: string }> = new Map();
  private eventLogs: CausalEvent[] = [];
  private rawFrames: RawFrame[] = [];
  private pendingResponses: Map<string, Set<string>> = new Map(); // eventId -> Set of nodeIds
  private responseCallbacks: Map<string, (responses: any[]) => void> = new Map();
  private receivedResponses: Map<string, any[]> = new Map(); // eventId -> responses
  
  // Last computed event hash for forensic chain linkage
  private lastEventHash: string | null = null;

  // Lamport Logical Clock
  private logicalClock = 0;

  // Hybrid Logical Clock (HLC)
  private hlc = new HybridLogicalClock(0, 0);

  // Chaos parameters
  public injectLatency = false;
  public minLatencyMs = 10;
  public maxLatencyMs = 150;

  constructor(port: number) {
    this.port = port;
  }

  private incrementClock(remoteClock = 0, remoteHlcString?: string): { lamport: number; hlcStr: string } {
    // 1. Synchronize Lamport clock
    this.logicalClock = Math.max(this.logicalClock, remoteClock) + 1;

    // 2. Synchronize Hybrid Logical Clock
    const now = Date.now();
    if (remoteHlcString) {
      const parsed = HybridLogicalClock.parse(remoteHlcString);
      this.hlc.updateReceive(parsed.getPhysical(), parsed.getLogical(), now);
    } else {
      this.hlc.incrementLocal(now);
    }

    return {
      lamport: this.logicalClock,
      hlcStr: this.hlc.toString()
    };
  }

  /**
   * Computes a deterministic SHA-256 hash of event metadata and previous hash to achieve cryptographically detectable chain modification.
   * Conforms to the ZTAN Forensic Event JCS Alphabetical Serialization Freeze.
   */
  public computeEventHash(event: Omit<CausalEvent, 'eventId'>): string {
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

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        let buffer = "";
        let assignedNodeId = "";

        socket.on('data', (chunk) => {
          const rawData = chunk.toString();
          buffer += rawData;
          
          while (buffer.includes('\n')) {
            const idx = buffer.indexOf('\n');
            const line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);

            if (!line.trim()) continue;

            try {
              const msg = JSON.parse(line);
              
              const clocks = this.incrementClock(msg.logicalClock || 0, msg.hlc);
              this.rawFrames.push({
                sequenceId: msg.seqId || 0,
                direction: 'INBOUND',
                nodeId: msg.nodeId || assignedNodeId || 'UNKNOWN',
                rawPayload: line,
                timestamp: new Date().toISOString(),
                logicalClock: clocks.lamport,
                hlc: clocks.hlcStr
              });

              if (msg.type === "REGISTRATION") {
                assignedNodeId = msg.nodeId;
                this.clients.set(assignedNodeId, { socket, runtime: msg.runtime });
                console.log(`[BUS] Registered Validator [${assignedNodeId}] running on Native ${msg.runtime} (HLC: ${clocks.hlcStr}).`);
              } else if (msg.type === "VALIDATION_RESPONSE") {
                this.handleValidationResponse(msg, clocks.lamport, clocks.hlcStr);
              }
            } catch (e: any) {
              console.error(`[BUS] Parse error on raw packet: ${e.message}`);
            }
          }
        });

        socket.on('close', () => {
          if (assignedNodeId) {
            this.clients.delete(assignedNodeId);
            const clocks = this.incrementClock();
            console.log(`[BUS] Validator [${assignedNodeId}] disconnected (HLC: ${clocks.hlcStr}).`);
            
            const eventPayload: Omit<CausalEvent, 'eventId'> = {
              prevEventHash: this.lastEventHash,
              timestamp: new Date().toISOString(),
              logicalClock: clocks.lamport,
              hlc: clocks.hlcStr,
              eventType: 'NODE_OFFLINE',
              seqId: 0,
              nodeId: assignedNodeId
            };
            const eventId = this.computeEventHash(eventPayload);
            this.logEvent({ ...eventPayload, eventId });
          }
        });

        socket.on('error', (_err) => {
          // Socket error handled gracefully
        });
      });

      this.server.listen(this.port, '127.0.0.1', () => {
        console.log(`[BUS] Asynchronous TCP Transport Bus started on 127.0.0.1:${this.port}`);
        resolve();
      });

      this.server.on('error', (err) => {
        reject(err);
      });
    });
  }

  private handleValidationResponse(msg: any, lamportTick: number, hlcTick: string) {
    const eventId = msg.eventId;
    const nodeId = msg.nodeId;

    const eventPayload: Omit<CausalEvent, 'eventId'> = {
      prevEventHash: this.lastEventHash,
      timestamp: new Date().toISOString(),
      logicalClock: lamportTick,
      hlc: hlcTick,
      eventType: 'RESPONSE_RECEIVED',
      seqId: msg.seqId,
      nodeId,
      accepted: msg.accepted,
      error: msg.error,
      ruleset: msg.ruleset,
      latencyMs: msg.latencyMs,
      correlationId: eventId
    };
    const generatedEventId = this.computeEventHash(eventPayload);
    this.logEvent({ ...eventPayload, eventId: generatedEventId });

    const pending = this.pendingResponses.get(eventId);
    if (pending) {
      pending.delete(nodeId);
      
      const resList = this.receivedResponses.get(eventId) || [];
      resList.push(msg);
      this.receivedResponses.set(eventId, resList);

      if (pending.size === 0) {
        this.pendingResponses.delete(eventId);
        const callback = this.responseCallbacks.get(eventId);
        if (callback) {
          this.responseCallbacks.delete(eventId);
          callback(resList);
        }
      }
    }
  }

  public logEvent(event: CausalEvent) {
    this.eventLogs.push(event);
    this.lastEventHash = event.eventId; // Chain link step
  }

  /**
   * Dumb broadcast that transmits transaction envelope over the transport layer.
   * Leverages optional probabilistic message delay (chaos).
   */
  public broadcastTransaction(seqId: number, payload: string, signature?: string): Promise<any[]> {
    const correlationId = `corr_tx_${seqId}_${Date.now()}`;
    const clocks = this.incrementClock();

    const eventPayload: Omit<CausalEvent, 'eventId'> = {
      prevEventHash: this.lastEventHash,
      timestamp: new Date().toISOString(),
      logicalClock: clocks.lamport,
      hlc: clocks.hlcStr,
      eventType: 'TRANSACTION_BROADCAST',
      seqId,
      correlationId
    };
    const eventId = this.computeEventHash(eventPayload);
    this.logEvent({ ...eventPayload, eventId });

    const activeNodeIds = Array.from(this.clients.keys());
    if (activeNodeIds.length === 0) {
      return Promise.resolve([]);
    }

    this.pendingResponses.set(eventId, new Set(activeNodeIds));
    this.receivedResponses.set(eventId, []);

    const resultPromise = new Promise<any[]>((resolve) => {
      this.responseCallbacks.set(eventId, resolve);
    });

    for (const [nodeId, clientInfo] of this.clients.entries()) {
      const currentClocks = this.incrementClock();
      const rawPayloadObj = {
        type: "TRANSACTION",
        eventId,
        seqId,
        logicalClock: currentClocks.lamport,
        hlc: currentClocks.hlcStr,
        tx: { seqId, payload, signature }
      };
      
      const msgPacket = JSON.stringify(rawPayloadObj) + "\n";

      this.rawFrames.push({
        sequenceId: seqId,
        direction: 'OUTBOUND',
        nodeId,
        rawPayload: JSON.stringify(rawPayloadObj),
        timestamp: new Date().toISOString(),
        logicalClock: currentClocks.lamport,
        hlc: currentClocks.hlcStr
      });

      if (this.injectLatency) {
        const delay = Math.floor(Math.random() * (this.maxLatencyMs - this.minLatencyMs)) + this.minLatencyMs;
        setTimeout(() => {
          if (this.clients.has(nodeId)) {
            clientInfo.socket.write(msgPacket);
            
            const fwdPayload: Omit<CausalEvent, 'eventId'> = {
              prevEventHash: this.lastEventHash,
              timestamp: new Date().toISOString(),
              logicalClock: currentClocks.lamport,
              hlc: currentClocks.hlcStr,
              eventType: 'MESSAGE_FORWARDED',
              seqId,
              nodeId,
              latencyMs: delay,
              correlationId: eventId
            };
            const fwdEventId = this.computeEventHash(fwdPayload);
            this.logEvent({ ...fwdPayload, eventId: fwdEventId });
          }
        }, delay);
      } else {
        clientInfo.socket.write(msgPacket);
        
        const fwdPayload: Omit<CausalEvent, 'eventId'> = {
          prevEventHash: this.lastEventHash,
          timestamp: new Date().toISOString(),
          logicalClock: currentClocks.lamport,
          hlc: currentClocks.hlcStr,
          eventType: 'MESSAGE_FORWARDED',
          seqId,
          nodeId,
          latencyMs: 0,
          correlationId: eventId
        };
        const fwdEventId = this.computeEventHash(fwdPayload);
        this.logEvent({ ...fwdPayload, eventId: fwdEventId });
      }
    }

    return resultPromise;
  }

  public triggerNodeCrash(nodeId: string): boolean {
    const client = this.clients.get(nodeId);
    if (client) {
      const clocks = this.incrementClock();
      const rawPayloadObj = { type: "CRASH_TRIGGER", logicalClock: clocks.lamport, hlc: clocks.hlcStr };
      const packet = JSON.stringify(rawPayloadObj) + "\n";
      
      this.rawFrames.push({
        sequenceId: 0,
        direction: 'OUTBOUND',
        nodeId,
        rawPayload: JSON.stringify(rawPayloadObj),
        timestamp: new Date().toISOString(),
        logicalClock: clocks.lamport,
        hlc: clocks.hlcStr
      });

      client.socket.write(packet);
      
      const crashPayload: Omit<CausalEvent, 'eventId'> = {
        prevEventHash: this.lastEventHash,
        timestamp: new Date().toISOString(),
        logicalClock: clocks.lamport,
        hlc: clocks.hlcStr,
        eventType: 'NODE_OFFLINE',
        seqId: 0,
        nodeId
      };
      const generatedCrashId = this.computeEventHash(crashPayload);
      this.logEvent({ ...crashPayload, eventId: generatedCrashId });
      return true;
    }
    return false;
  }

  public getActiveNodesCount(): number {
    return this.clients.size;
  }

  public terminate() {
    this.server?.close();
    for (const [_, client] of this.clients.entries()) {
      client.socket.end();
    }
    
    const traceDir = path.join(process.cwd(), '.ztan-transparency');
    if (!fs.existsSync(traceDir)) {
      fs.mkdirSync(traceDir, { recursive: true });
    }
    
    const tracePath = path.join(traceDir, 'forensics.json');
    fs.writeFileSync(tracePath, JSON.stringify(this.eventLogs, null, 2));
    console.log(`[BUS] Event trace written successfully to ${tracePath}`);

    const framesPath = path.join(traceDir, 'raw_frames.json');
    fs.writeFileSync(framesPath, JSON.stringify(this.rawFrames, null, 2));
    console.log(`[BUS] Raw frame database written successfully to ${framesPath}`);
  }
}

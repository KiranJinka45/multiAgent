import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';


export interface ZtanPayloadAttestation {
  payloadSanitized: boolean;
  transformations: string[];
  originalByteLength: number;
  sanitizedByteLength: number;
  sanitizationEpochId: string;
}

export interface EvidenceEntry {
  sequenceId: number;
  timestamp: Date;
  type: 'GOVERNANCE' | 'REPLAY' | 'IDENTITY' | 'TELEMETRY' | 'POLICY';
  payload: string;
  evidence: {
    hash: string;
    prevHash: string;
    signature: string;
    epoch: string;
    verdict: 'VERIFIED' | 'DEGRADED' | 'UNTRUSTED';
  };
  attestation?: ZtanPayloadAttestation;
  quarantineBlob?: string;
}


export interface SociotechnicalDrill {
  id: string;
  name: string;
  status: 'INACTIVE' | 'ACTIVE' | 'FAILED' | 'PASSED';
  lastRun: string;
  description: string;
}

export interface GovernanceProposal {
  id: string;
  title: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PRUNED';
  justification?: string;
}

export interface GovernanceEpoch {
  id: number;
  status: 'ACTIVE' | 'ARCHIVED' | 'FAILED';
  timestamp: string;
  desc: string;
}

export interface StewardshipState {
  // 1. Core State
  epoch: number;
  trustLevel: 'VERIFIED' | 'DEGRADED' | 'UNTRUSTED';
  isSafeMode: boolean;
  escalationTier: 'OPERATOR' | 'SUPERVISOR' | 'HSM_AUTHORITY';
  activeDrill: string; // 'NONE', 'IFD-001', 'IFD-002', 'IFD-003', 'IFD-004', 'RITUAL_DECAY', 'FREEZE_PRESSURE', 'TOTAL_QUORUM_FAILURE'
  habituationRisk: number;
  quorumStatus: 'HEALTHY' | 'FAILED';
  decisionLatency: number;
  ritualIntegrity: number;
  replayIntegrity: number;

  // 2. Telemetry Erosion
  telemetryEroded: boolean;
  chronologyGaps: boolean;
  chronologyConfidence: number;
  verificationTier?: 'HOT' | 'WARM' | 'COLD';

  // 3. Ritual Decay
  ritualDecayed: boolean;
  ceremonyDurationAvg: number;
  approvalNarrativeLengthAvg: number;
  repeatedApproversCount: number;

  // 4. Freeze Pressure
  governanceProposals: GovernanceProposal[];

  // 5. Operator Latency
  drillStartTime: number | null;
  operatorReactionTime: number | null; // final recorded latency in seconds
  currentRunningLatency: number; // dynamically updated on UI

  // 6. Timeline and Lists
  governanceHistory: GovernanceEpoch[];
  recoveryInvariants: {
    causalContinuity: { status: boolean; label: string };
    epochAlignment: { status: boolean; label: string };
    hsmSynchronicity: { status: boolean; label: string };
  };
  drills: SociotechnicalDrill[];
  activeIncidents: Array<{
    id: string;
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    title: string;
    description: string;
    timestamp: Date;
  }>;
  isOfflineMode?: boolean;
}


@Injectable({ providedIn: 'root' })
export class StewardshipService {
  private evidenceSubject = new BehaviorSubject<EvidenceEntry[]>([]);
  private stateSubject = new class extends BehaviorSubject<StewardshipState> {
    override next(value: StewardshipState) {
      if (value && value.isOfflineMode === undefined) {
        value.isOfflineMode = this.value ? this.value.isOfflineMode : false;
      }
      super.next(value);
    }
  }({
    epoch: 102,
    trustLevel: 'VERIFIED',
    isSafeMode: false,
    escalationTier: 'OPERATOR',
    activeDrill: 'NONE',
    habituationRisk: 12,
    quorumStatus: 'HEALTHY',
    decisionLatency: 4.2,
    ritualIntegrity: 100,
    replayIntegrity: 100,
    telemetryEroded: false,
    chronologyGaps: false,
    chronologyConfidence: 100,
    verificationTier: 'HOT',
    ritualDecayed: false,
    ceremonyDurationAvg: 254, // in seconds
    approvalNarrativeLengthAvg: 242, // chars
    repeatedApproversCount: 0,
    governanceProposals: [],
    drillStartTime: null,
    operatorReactionTime: null,
    currentRunningLatency: 0,
    governanceHistory: [
      { id: 102, status: 'ACTIVE', timestamp: '2026-05-16', desc: 'Epoch 102: Authority Root Synchronized' },
      { id: 101, status: 'ARCHIVED', timestamp: '2026-05-15', desc: 'Epoch 101: Quorum Rotation Ceremony' },
      { id: 100, status: 'ARCHIVED', timestamp: '2026-05-14', desc: 'Epoch 100: Baseline Restoration Verified' }
    ],
    recoveryInvariants: {
      causalContinuity: { status: true, label: 'Ledger lineage verified (Hash: 0x8a92...)' },
      epochAlignment: { status: true, label: 'Authority sync within 1ms tolerance' },
      hsmSynchronicity: { status: true, label: 'Physical anchor heartbeat verified' }
    },
    drills: [
      { id: 'IFD-001', name: 'IFD-001: Replay Poisoning', status: 'INACTIVE', lastRun: '14d ago', description: 'Simulate forged payload insertion to trigger trust degradation and chain fractures.' },
      { id: 'IFD-002', name: 'IFD-002: Telemetry Erosion', status: 'INACTIVE', lastRun: 'Never', description: 'Simulate loss of forensic logs, chronology gaps, and timeline blindness.' },
      { id: 'IFD-003', name: 'IFD-003: Governance Collapse', status: 'INACTIVE', lastRun: 'Never', description: 'Simulate total epoch registry failure, SAFE_MODE locking, and Supervisor override.' },
      { id: 'IFD-004', name: 'IFD-004: Dirty Archaeology', status: 'INACTIVE', lastRun: 'Never', description: 'Simulate corrupted databases, partial transactions, chronology gaps, and duplicate timelines.' },
      { id: 'RITUAL_DECAY', name: 'Ritual Decay Simulation', status: 'INACTIVE', lastRun: '7d ago', description: 'Inject rubber-stamping, narrative erosion, and approved-without-ceremony patterns.' },
      { id: 'FREEZE_PRESSURE', name: 'Institutional Freeze Pressure', status: 'INACTIVE', lastRun: '30d ago', description: 'Flood governance queues with capability expansions to test restraint.' },
      { id: 'TOTAL_QUORUM_FAILURE', name: 'Total Quorum Failure', status: 'INACTIVE', lastRun: 'Never', description: 'Simulate physical HSM failure requiring high-friction manual override ceremony.' }
    ],
    activeIncidents: [],
    isOfflineMode: false
  });

  evidence$ = this.evidenceSubject.asObservable();
  state$ = this.stateSubject.asObservable();

  private viewportSavepointCache: any = null;

  public saveViewportSavepoint(savepoint: any) {
    this.viewportSavepointCache = savepoint;
    try {
      localStorage.setItem('ztan_replay_savepoint', JSON.stringify(savepoint));
    } catch (e) {
      console.warn('[StewardshipService] Failed to write savepoint to localStorage:', e);
    }
  }

  public getViewportSavepoint(): any {
    if (this.viewportSavepointCache) {
      return this.viewportSavepointCache;
    }
    try {
      const raw = localStorage.getItem('ztan_replay_savepoint');
      if (raw) {
        this.viewportSavepointCache = JSON.parse(raw);
        return this.viewportSavepointCache;
      }
    } catch (e) {
      console.warn('[StewardshipService] Failed to read savepoint from localStorage:', e);
    }
    return null;
  }

  private clockSubscription: Subscription | null = null;
  private rawEvidenceBackup: EvidenceEntry[] = [];

  private apiUrl = 'http://localhost:3010/api/v1/ztan/governance';

  private worker: Worker | null = null;
  private ws: any = null;
  public totalEventsInDB = 0;

  constructor(private http: HttpClient) {
    this.initializeLedger();
    this.startLatencyTracker();
    this.startParityAuditor();
    this.initWorker();
    this.initWebSocket();
    this.syncState();

    // Clear IndexedDB at startup to ensure clean endurance drill runs
    setTimeout(() => {
      if (this.worker) {
        this.worker.postMessage({ type: 'CLEAR_DB' });
      }
    }, 1000);
  }

  private initWorker() {
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('./workers/archaeology.worker', import.meta.url), { type: 'module' });
        this.worker.onmessage = ({ data }) => {
          const { type, count, lastSequenceId, error } = data;
          if (type === 'INGEST_BATCH_SUCCESS') {
            console.log(`[StewardshipService] WebWorker successfully ingested ${count} events. Last sequenceId: ${lastSequenceId}`);
            this.refreshFromIndexedDB();
          } else if (type === 'INGEST_BATCH_ERROR') {
            console.error('[StewardshipService] Ingestion failed in WebWorker:', error);
          } else if (type === 'CLEAR_DB_SUCCESS') {
            console.log('[StewardshipService] WebWorker cleared IndexedDB successfully.');
            this.refreshFromIndexedDB();
          } else if (type === 'RECONSTRUCT_SUCCESS') {
            console.log(`[StewardshipService] WebWorker reconstructed from capsule. Count: ${count}`);
            this.refreshFromIndexedDB();
            const current = this.stateSubject.value;
            this.stateSubject.next({
              ...current,
              trustLevel: 'VERIFIED',
              replayIntegrity: 100,
              chronologyConfidence: 100
            });
            alert(`Capsule Rebuilt Successfully! Verified ${count} forensic chain blocks.`);
          } else if (type === 'RECONSTRUCT_FAILURE') {
            console.error('[StewardshipService] Ledger reconstruction failed in WebWorker:', error);
            const current = this.stateSubject.value;
            this.stateSubject.next({
              ...current,
              trustLevel: 'UNTRUSTED',
              replayIntegrity: 0,
              chronologyConfidence: 0
            });
            alert(`Capsule Integrity Compromised: ${error}`);
            this.refreshFromIndexedDB();
          }
        };
      } catch (e) {
        console.error('[StewardshipService] Failed to spawn WebWorker:', e);
      }
    } else {
      console.warn('[StewardshipService] WebWorkers are not supported in this environment.');
    }
  }

  private initWebSocket() {
    import('socket.io-client').then(({ io }) => {
      this.ws = io('http://localhost:3500', {
        path: '/socket.io',
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5
      });

      this.ws.on('connect', () => {
        console.log('[StewardshipService] Connected to API Gateway Socket.IO Server');
        this.ws.emit('sre:subscribe');
      });

      this.ws.on('sre:archaeology:chain_loaded', (chain: any[]) => {
        console.log(`[StewardshipService] Received evidence chain batch of size ${chain.length} via WebSocket`);
        if (this.worker) {
          this.worker.postMessage({ type: 'INGEST_BATCH', payload: chain });
        }
      });

      this.ws.on('sre:update', (state: any) => {
        console.log('[StewardshipService] Received live SRE update via Socket.IO');
        const current = this.stateSubject.value;
        this.stateSubject.next({
          ...current,
          ...state,
          isOfflineMode: false
        });

        // If there are incoming events, send them to WebWorker
        if (state.lastAction) {
          const mockEntry = this.generateEntry(
            state.sequenceId || Date.now(),
            state.trustLevel === 'VERIFIED' ? 'VERIFIED' : 'UNTRUSTED',
            state.lastAction.message || 'System state synchronized',
            'REPLAY'
          );
          if (this.worker) {
            this.worker.postMessage({ type: 'INGEST_BATCH', payload: [mockEntry] });
          }
        }
      });

      this.ws.on('disconnect', () => {
        console.warn('[StewardshipService] Disconnected from API Gateway Socket.IO Server');
      });
    }).catch(err => {
      console.error('[StewardshipService] Failed to load socket.io-client:', err);
    });
  }

  public async getPaginatedEvents(offset: number, limit: number): Promise<EvidenceEntry[]> {
    return new Promise((resolve) => {
      const request = indexedDB.open('ztan_archaeology_db', 1);
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        const tx = db.transaction('forensic_events', 'readonly');
        const store = tx.objectStore('forensic_events');
        
        const events: any[] = [];
        let cursorRequest = store.openCursor(null, 'prev'); // Get newest first
        let count = 0;
        let skipped = 0;
        
        cursorRequest.onsuccess = (event: any) => {
          const cursor = event.target.result;
          if (!cursor) {
            return resolve(events);
          }
          
          if (skipped < offset) {
            skipped++;
            cursor.continue();
            return;
          }
          
          events.push(cursor.value);
          count++;
          
          if (count < limit) {
            cursor.continue();
          } else {
            resolve(events);
          }
        };
        cursorRequest.onerror = () => resolve([]);
      };
      request.onerror = () => resolve([]);
    });
  }

  private async refreshFromIndexedDB() {
    const latest = await this.getPaginatedEvents(0, 100);
    this.evidenceSubject.next(latest);
    
    const request = indexedDB.open('ztan_archaeology_db', 1);
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction('forensic_events', 'readonly');
      const store = tx.objectStore('forensic_events');
      const countRequest = store.count();
      countRequest.onsuccess = () => {
        this.totalEventsInDB = countRequest.result;
      };
    };
  }

  public simulateLocalEnduranceDrill(count: number = 50000) {
    console.log(`[StewardshipService] Launching local browser endurance drill with ${count} events...`);
    const batchSize = 5000;
    let sequence = 10000;
    
    const types: Array<'GOVERNANCE' | 'REPLAY' | 'IDENTITY' | 'TELEMETRY' | 'POLICY'> = ['GOVERNANCE', 'REPLAY', 'IDENTITY', 'POLICY', 'TELEMETRY'];
    const mockMessages = [
      'Evidence block anchored and signature checked.',
      'Causal chain node bound to physical hardware.',
      'Cryptographic ledger checkpoint validated.',
      'Quorum agreement reached for active block.',
      'Blast-radius security policy enforced.'
    ];

    const sendNextBatch = () => {
      if (sequence >= 10000 + count) {
        console.log('[StewardshipService] Local endurance drill generation complete.');
        return;
      }

      const batch: EvidenceEntry[] = [];
      const currentBatchSize = Math.min(batchSize, (10000 + count) - sequence);
      
      for (let i = 0; i < currentBatchSize; i++) {
        const id = sequence++;
        const type = types[id % types.length];
        const msg = mockMessages[id % mockMessages.length];
        
        batch.push({
          sequenceId: id,
          timestamp: new Date(),
          type,
          payload: `[Forensic Stream Entry #${id}] ${msg}`,
          evidence: {
            hash: '0x' + Math.random().toString(16).substring(2, 10),
            prevHash: '0x' + Math.random().toString(16).substring(2, 10),
            signature: 'ZTAN_SIG_' + Math.random().toString(16).substring(2, 8).toUpperCase(),
            epoch: '102',
            verdict: 'VERIFIED'
          }
        });
      }

      if (this.worker) {
        this.worker.postMessage({ type: 'INGEST_BATCH', payload: batch });
      }
      
      setTimeout(sendNextBatch, 50);
    };

    sendNextBatch();
  }

  private syncState() {
    this.http.get<StewardshipState>(`${this.apiUrl}/state`).subscribe({
      next: (state) => {
        this.stateSubject.next({ ...state, isOfflineMode: false });
      },
      error: (err) => {
        console.warn('[StewardshipService] Failed to sync state with backend, using local state.', err);
        const current = this.stateSubject.value;
        this.stateSubject.next({ ...current, isOfflineMode: true });
      }
    });
  }

  private syncLedger() {
    this.http.get<{ entries: any[] }>(`${this.apiUrl}/ledger`).subscribe({
      next: (res) => {
        if (res && res.entries) {
          const mapped: EvidenceEntry[] = res.entries.map((e: any) => ({
            sequenceId: e.sequenceId || e.id,
            timestamp: new Date(e.timestamp),
            type: e.type,
            payload: e.payload,
            evidence: {
              hash: e.hash || '',
              prevHash: e.prevHash || '',
              signature: e.signature || '',
              epoch: e.epoch || '',
              verdict: e.verdict || 'VERIFIED'
            }
          }));
          if (this.worker) {
            this.worker.postMessage({ type: 'INGEST_BATCH', payload: mapped });
          } else {
            this.evidenceSubject.next(mapped);
          }
        }
      },
      error: (err) => {
        console.warn('[StewardshipService] Failed to sync ledger with backend, using local ledger.', err);
      }
    });
  }

  private initializeLedger() {
    const initial: EvidenceEntry[] = [
      this.generateEntry(1000, 'VERIFIED', 'Epoch 100 Initialized: Multi-signature Quorum verified successfully.', 'GOVERNANCE'),
      this.generateEntry(1001, 'VERIFIED', 'Authority Node A Registered: Public key bound to HSM hardware anchor.', 'IDENTITY'),
      this.generateEntry(1002, 'VERIFIED', 'Inbound Policy Sync Complete: Blast-radius rule enforced globally.', 'POLICY'),
      this.generateEntry(1003, 'VERIFIED', 'Ledger Integrity Heartbeat: Hash Chain path verified (0x92f1...).', 'REPLAY'),
      this.generateEntry(1004, 'VERIFIED', 'Stewardship Telemetry Stream Online: Clock synced to UTC.', 'TELEMETRY')
    ];
    this.rawEvidenceBackup = [...initial];
    this.evidenceSubject.next(initial);
  }

  private startLatencyTracker() {
    // Increment the active drill running clock every 100ms
    interval(100).subscribe(() => {
      const current = this.stateSubject.value;
      if (current.drillStartTime && current.operatorReactionTime === null) {
        const elapsed = (Date.now() - current.drillStartTime) / 1000;
        this.stateSubject.next({
          ...current,
          currentRunningLatency: parseFloat(elapsed.toFixed(1))
        });
      }
    });
  }

  private startParityAuditor() {
    interval(15000).subscribe(async () => {
      try {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const req = indexedDB.open('ztan_archaeology_db', 1);
          req.onsuccess = (e: any) => resolve(e.target.result);
          req.onerror = (e: any) => reject(e.target.error);
        });

        const tx = db.transaction('forensic_events', 'readonly');
        const store = tx.objectStore('forensic_events');

        const entries: any[] = [];
        let cursorReq = store.openCursor(null, 'prev');
        let count = 0;

        await new Promise<void>((resolve) => {
          cursorReq.onsuccess = (e: any) => {
            const cursor = e.target.result;
            if (cursor && count < 50) {
              entries.push(cursor.value);
              count++;
              cursor.continue();
            } else {
              resolve();
            }
          };
          cursorReq.onerror = () => resolve();
        });

        if (entries.length < 2) return;

        let driftDetected = false;
        let skewCount = 0;
        const totalChecked = entries.length - 1;

        for (let i = 0; i < entries.length - 1; i++) {
          const current = entries[i];
          const parent = entries[i + 1];

          if (current.evidence && parent.evidence && current.evidence.prevHash !== parent.evidence.hash) {
            console.error(`[Parity Auditor] Hash chain fracture detected between sequence #${current.sequenceId} and #${parent.sequenceId}!`);
            driftDetected = true;
          }

          if (current.timestamp && parent.timestamp) {
            const currentTs = new Date(current.timestamp).getTime();
            const parentTs = new Date(parent.timestamp).getTime();
            // skew if timestamp is backwards or jump is > 10m
            if (currentTs < parentTs || (currentTs - parentTs) > 600000) {
              skewCount++;
            }
          }
        }

        const current = this.stateSubject.value;
        let newConfidence = 100;
        if (driftDetected) {
          newConfidence = 0;
        } else if (totalChecked > 0) {
          newConfidence = Math.max(0, Math.round(100 * (1 - (skewCount / totalChecked))));
        }

        this.stateSubject.next({
          ...current,
          trustLevel: newConfidence >= 80 ? (current.trustLevel === 'UNTRUSTED' ? 'UNTRUSTED' : 'VERIFIED') : 'DEGRADED',
          chronologyConfidence: newConfidence,
          chronologyGaps: newConfidence < 80,
          replayIntegrity: driftDetected ? 12 : newConfidence
        });
      } catch (e) {
        console.error('[Parity Auditor Error]', e);
      }
    });
  }

  triggerDrill(id: string) {
    this.http.post<StewardshipState>(`${this.apiUrl}/drill/trigger`, { id }).subscribe({
      next: (state) => {
        this.stateSubject.next({ ...state, isOfflineMode: false });
        this.syncLedger();
      },
      error: (err) => {
        console.warn('Failed to trigger drill on backend, using local simulation fallback', err);
        const current = this.stateSubject.value;
        this.stateSubject.next({ ...current, isOfflineMode: true });
        this.localTriggerDrill(id);
      }
    });
  }

  resolveDrill(id: string, actionsTaken: string, method?: string, justification?: string, certaintyInflation?: boolean) {
    const operatorSignature = 'ZTAN_SIG_' + Math.random().toString(16).substring(2, 8).toUpperCase();
    this.http.post<StewardshipState>(`${this.apiUrl}/drill/resolve`, { 
      id, 
      actionsTaken, 
      operatorSignature,
      method,
      justification,
      certaintyInflation
    }).subscribe({
      next: (state) => {
        this.stateSubject.next({ ...state, isOfflineMode: false });
        this.syncLedger();
      },
      error: (err) => {
        console.warn('Failed to resolve drill on backend, using local simulation fallback', err);
        const current = this.stateSubject.value;
        this.stateSubject.next({ ...current, isOfflineMode: true });
        this.localResolveDrill(id, actionsTaken);
      }
    });
  }

  resolveProposal(proposalId: string, action: 'REJECT' | 'PRUNE' | 'APPROVE', justification: string) {
    this.http.post<StewardshipState>(`${this.apiUrl}/proposal/resolve`, { proposalId, action, justification }).subscribe({
      next: (state) => {
        this.stateSubject.next({ ...state, isOfflineMode: false });
        this.syncLedger();
      },
      error: (err) => {
        console.warn('Failed to resolve proposal on backend, using local simulation fallback', err);
        const current = this.stateSubject.value;
        this.stateSubject.next({ ...current, isOfflineMode: true });
        this.localResolveProposal(proposalId, action, justification);
      }
    });
  }

  simulateAging(days: number) {
    this.http.post<StewardshipState>(`${this.apiUrl}/aging`, { days }).subscribe({
      next: (state) => {
        this.stateSubject.next({ ...state, isOfflineMode: false });
        this.syncLedger();
      },
      error: (err) => {
        console.warn('Failed to simulate aging on backend, using local simulation fallback', err);
        const current = this.stateSubject.value;
        this.stateSubject.next({ ...current, isOfflineMode: true });
        this.localSimulateAging(days);
      }
    });
  }

  resetState() {
    this.http.post<StewardshipState>(`${this.apiUrl}/reset`, {}).subscribe({
      next: (state) => {
        this.stateSubject.next({ ...state, isOfflineMode: false });
        this.syncLedger();
      },
      error: (err) => {
        console.warn('Failed to reset state on backend, using local simulation fallback', err);
        const current = this.stateSubject.value;
        this.stateSubject.next({ ...current, isOfflineMode: true });
        this.localResetState();
      }
    });
  }

  // --- LOCAL FALLBACK METHODS FOR COMPILATION & SELF-HEALING SURVIVABILITY ---

  private localTriggerDrill(id: string) {
    const current = this.stateSubject.value;
    const drills = current.drills.map((d: SociotechnicalDrill) => 
      d.id === id ? { ...d, status: 'ACTIVE' as const } : d
    );
    const drillStartTime = Date.now();
    let evidence = [...this.evidenceSubject.value];

    if (id === 'IFD-001') {
      const poisonEntry = this.generateEntry(1005, 'UNTRUSTED', 'ADVERSARIAL REPLAY: Found replay signature mismatch at index 1004. Forged payload injected.', 'REPLAY');
      evidence = [poisonEntry, ...evidence];

      this.stateSubject.next({
        ...current,
        drills,
        activeDrill: id,
        trustLevel: 'UNTRUSTED',
        replayIntegrity: 15,
        drillStartTime,
        operatorReactionTime: null,
        currentRunningLatency: 0,
        recoveryInvariants: {
          ...current.recoveryInvariants,
          causalContinuity: { status: false, label: 'Chain fracture: Forged signature payload injected' }
        },
        activeIncidents: [
          {
            id: 'INC-IFD-001',
            type: 'REPLAY_POISONING',
            severity: 'CRITICAL',
            title: 'Critical Chain Fracture Detected',
            description: 'A forged signature payload was detected, poisoning the replay log and fracturing hash-chain integrity verification.',
            timestamp: new Date()
          }
        ]
      });
      this.evidenceSubject.next(evidence);
    } else if (id === 'IFD-002') {
      const erodedEvidence = evidence.filter((_, idx) => idx % 2 === 0);
      this.stateSubject.next({
        ...current,
        drills,
        activeDrill: id,
        telemetryEroded: true,
        chronologyGaps: true,
        replayIntegrity: 45,
        drillStartTime,
        operatorReactionTime: null,
        currentRunningLatency: 0,
        recoveryInvariants: {
          ...current.recoveryInvariants,
          hsmSynchronicity: { status: false, label: 'Telemetry Blindness: Timeline logs eroded (chronology gaps)' }
        },
        activeIncidents: [
          {
            id: 'INC-IFD-002',
            type: 'TELEMETRY_EROSION',
            severity: 'HIGH',
            title: 'Audit Log Chronology Lost',
            description: 'Significant telemetry erasure has occurred. Audit line chronological continuity is highly compromised.',
            timestamp: new Date()
          }
        ]
      });
      this.evidenceSubject.next(erodedEvidence);
    } else if (id === 'IFD-003') {
      const collapseEntry = this.generateEntry(1006, 'DEGRADED', 'GOVERNANCE COLLAPSE: Epoch Quorum lost due to authority divergence.', 'GOVERNANCE');
      evidence = [collapseEntry, ...evidence];

      const history = current.governanceHistory.map((g: GovernanceEpoch) => 
        g.id === current.epoch ? { ...g, status: 'FAILED' as const, desc: 'Epoch 102: QUORUM LOST / GOVERNANCE COLLAPSE' } : g
      );

      this.stateSubject.next({
        ...current,
        drills,
        activeDrill: id,
        trustLevel: 'DEGRADED',
        isSafeMode: true,
        escalationTier: 'SUPERVISOR',
        drillStartTime,
        operatorReactionTime: null,
        currentRunningLatency: 0,
        governanceHistory: history,
        recoveryInvariants: {
          ...current.recoveryInvariants,
          epochAlignment: { status: false, label: 'Quorum Collapse: Consensus nodes below 66% threshold' }
        },
        activeIncidents: [
          {
            id: 'INC-IFD-003',
            type: 'GOVERNANCE_COLLAPSE',
            severity: 'CRITICAL',
            title: 'Epoch 102 Governance Quorum Lost',
            description: 'Primary consensus registry has deadlocked. Escalating authority permissions to Supervisor to lock restoration paths.',
            timestamp: new Date()
          }
        ]
      });
      this.evidenceSubject.next(evidence);
    } else if (id === 'RITUAL_DECAY') {
      this.stateSubject.next({
        ...current,
        drills,
        activeDrill: id,
        ritualDecayed: true,
        ritualIntegrity: 24,
        habituationRisk: 88,
        approvalNarrativeLengthAvg: 12,
        ceremonyDurationAvg: 2,
        repeatedApproversCount: 5,
        drillStartTime,
        operatorReactionTime: null,
        currentRunningLatency: 0,
        activeIncidents: [
          {
            id: 'INC-RITUAL',
            type: 'RITUAL_DECAY',
            severity: 'MEDIUM',
            title: 'Sociotechnical Ritual Degradation',
            description: 'Approvals show rubber-stamping behavior. Narrative quality average has plummeted to 12 chars. Ceremony duration average < 2 seconds.',
            timestamp: new Date()
          }
        ]
      });
    } else if (id === 'FREEZE_PRESSURE') {
      const proposals: GovernanceProposal[] = [
        { id: 'GP-01', title: 'Add Autonomous AI Remediation Assistant to Root', riskLevel: 'CRITICAL', status: 'PENDING' },
        { id: 'GP-02', title: 'Automate Ceremony Approvals Using Predictive Scoring', riskLevel: 'HIGH', status: 'PENDING' },
        { id: 'GP-03', title: 'Bypass Multi-Signature Delay for Urgent Recovery', riskLevel: 'CRITICAL', status: 'PENDING' }
      ];

      this.stateSubject.next({
        ...current,
        drills,
        activeDrill: id,
        governanceProposals: proposals,
        habituationRisk: 55,
        drillStartTime,
        operatorReactionTime: null,
        currentRunningLatency: 0,
        activeIncidents: [
          {
            id: 'INC-FREEZE',
            type: 'FREEZE_PRESSURE',
            severity: 'HIGH',
            title: 'Excessive Proposal Expansion Pressure',
            description: 'Adversarial systems are requesting self-healing bypass and automation, attempting to force institutional fatigue.',
            timestamp: new Date()
          }
        ]
      });
    } else if (id === 'TOTAL_QUORUM_FAILURE') {
      const crashEntry = this.generateEntry(1007, 'UNTRUSTED', 'QUORUM CRASH: Complete physical HSM authority rotation failure. Automated recovery path deadlocked.', 'GOVERNANCE');
      evidence = [crashEntry, ...evidence];

      this.stateSubject.next({
        ...current,
        drills,
        activeDrill: id,
        trustLevel: 'UNTRUSTED',
        isSafeMode: true,
        quorumStatus: 'FAILED',
        escalationTier: 'HSM_AUTHORITY',
        drillStartTime,
        operatorReactionTime: null,
        currentRunningLatency: 0,
        recoveryInvariants: {
          causalContinuity: { status: false, label: 'Causal loop deadlocked: Unverified ledger root' },
          epochAlignment: { status: false, label: 'Epoch alignment broken: Quorum consensus lost' },
          hsmSynchronicity: { status: false, label: 'Anchor sync failed: Physical HSM offline' }
        },
        activeIncidents: [
          {
            id: 'INC-TOTAL-FAIL',
            type: 'TOTAL_QUORUM_FAILURE',
            severity: 'CRITICAL',
            title: 'Total Quorum Collapse',
            description: 'Automated consensus mechanisms have crashed completely. System locked in SAFE_MODE. Heavy interactive HSM override ceremony required.',
            timestamp: new Date()
          }
        ]
      });
      this.evidenceSubject.next(evidence);
    } else if (id === 'IFD-004') {
      // 1. Partial write entry (missing hash/prevHash)
      const corruptedEntry = this.generateEntry(1008, 'UNTRUSTED', 'DIRTY ARCHAEOLOGY: Partial write and corrupted block hash.', 'REPLAY');
      corruptedEntry.evidence.prevHash = '0xBAD_PREV_HASH';

      // 2. Sequence gap entry (leaping 10 timeline slots ahead)
      const gapEntry = this.generateEntry(1020, 'DEGRADED', 'DIRTY ARCHAEOLOGY: Stale timeline packet storm and clock desync.', 'TELEMETRY');
      gapEntry.timestamp = new Date(Date.now() - 20 * 60000); // 20 minutes in the past (clock desync)

      evidence = [gapEntry, corruptedEntry, ...evidence];

      this.stateSubject.next({
        ...current,
        drills,
        activeDrill: id,
        trustLevel: 'UNTRUSTED',
        replayIntegrity: 20,
        chronologyConfidence: 40,
        chronologyGaps: true,
        drillStartTime,
        operatorReactionTime: null,
        currentRunningLatency: 0,
        recoveryInvariants: {
          causalContinuity: { status: false, label: 'Lineage broken: Malformed hashes detected' },
          epochAlignment: { status: false, label: 'Epoch desynchronized: NTP Clock Skew' },
          hsmSynchronicity: { status: false, label: 'Verification halted: Page corruption simulated' }
        },
        activeIncidents: [
          {
            id: 'INC-IFD-004',
            type: 'DIRTY_ARCHAEOLOGY',
            severity: 'CRITICAL',
            title: 'Substrate Page Corruption & Desync',
            description: 'Simulated partial write transaction failures and timeline desynchronization have fractured the storage layer.',
            timestamp: new Date()
          }
        ]
      });

      if (this.worker) {
        this.worker.postMessage({ type: 'INGEST_BATCH', payload: [corruptedEntry, gapEntry] });
      } else {
        this.evidenceSubject.next(evidence);
      }
    }
  }

  private localResolveDrill(id: string, actionsTaken: string) {
    const current = this.stateSubject.value;
    if (current.activeDrill !== id) return;

    const reactionTime = current.drillStartTime 
      ? parseFloat(((Date.now() - current.drillStartTime) / 1000).toFixed(1)) 
      : 2.5;

    const drills = current.drills.map((d: SociotechnicalDrill) => 
      d.id === id ? { ...d, status: 'PASSED' as const, lastRun: `Passed (${reactionTime}s)` } : d
    );

    const seq = this.evidenceSubject.value.length ? this.evidenceSubject.value[0].sequenceId + 1 : 1010;
    const resolutionEntry = this.generateEntry(
      seq, 
      'VERIFIED', 
      `MITIGATION SUCCESSFUL: Drill ${id} resolved. Action: ${actionsTaken}. Reaction Time: ${reactionTime}s.`, 
      'POLICY'
    );

    const updatedEvidence = [resolutionEntry, ...this.evidenceSubject.value];
    const incidents = current.activeIncidents.filter(inc => !inc.id.includes(id) && !inc.id.includes('INC-TOTAL-FAIL'));

    const history = current.governanceHistory.map((g: GovernanceEpoch) => 
      g.status === 'FAILED' ? { ...g, status: 'ACTIVE' as const, desc: 'Epoch 102: Reconstructed and Verified' } : g
    );

    this.stateSubject.next({
      ...current,
      drills,
      activeDrill: 'NONE',
      trustLevel: 'VERIFIED',
      isSafeMode: false,
      escalationTier: 'OPERATOR',
      quorumStatus: 'HEALTHY',
      decisionLatency: 4.2,
      ritualIntegrity: 100,
      replayIntegrity: 100,
      telemetryEroded: false,
      chronologyGaps: false,
      chronologyConfidence: 100,
      verificationTier: 'HOT',
      ritualDecayed: false,
      ceremonyDurationAvg: 254,
      approvalNarrativeLengthAvg: 242,
      repeatedApproversCount: 0,
      governanceProposals: [],
      governanceHistory: history,
      recoveryInvariants: {
        causalContinuity: { status: true, label: 'Ledger lineage verified (Hash: 0x8a92...)' },
        epochAlignment: { status: true, label: 'Authority sync within 1ms tolerance' },
        hsmSynchronicity: { status: true, label: 'Physical anchor heartbeat verified' }
      },
      drillStartTime: null,
      operatorReactionTime: reactionTime,
      activeIncidents: incidents
    });

    if (current.telemetryEroded) {
      this.evidenceSubject.next([resolutionEntry, ...this.rawEvidenceBackup]);
    } else {
      this.evidenceSubject.next(updatedEvidence);
    }
  }

  private localResolveProposal(proposalId: string, action: 'REJECT' | 'PRUNE' | 'APPROVE', justification: string) {
    const current = this.stateSubject.value;
    const proposals = current.governanceProposals.map(p => 
      p.id === proposalId ? { ...p, status: (action === 'REJECT' ? 'REJECTED' : action === 'PRUNE' ? 'PRUNED' : 'APPROVED') as any, justification } : p
    );

    const allResolved = proposals.every(p => p.status !== 'PENDING');

    this.stateSubject.next({
      ...current,
      governanceProposals: proposals,
      habituationRisk: Math.max(12, current.habituationRisk - 15)
    });

    if (allResolved) {
      const rejectsAndPrunes = proposals.every(p => p.status === 'REJECTED' || p.status === 'PRUNED');
      if (rejectsAndPrunes) {
        this.localResolveDrill('FREEZE_PRESSURE', 'Defended capability expansion. Rejected automatic agents.');
      } else {
        const alertEntry = this.generateEntry(
          this.evidenceSubject.value[0].sequenceId + 1, 
          'UNTRUSTED', 
          'TRUST FAILURE: Operator authorized capability expansion under freeze pressure.', 
          'GOVERNANCE'
        );
        this.evidenceSubject.next([alertEntry, ...this.evidenceSubject.value]);
        this.stateSubject.next({
          ...this.stateSubject.value,
          trustLevel: 'UNTRUSTED',
          habituationRisk: 95
        });
      }
    }
  }

  private localSimulateAging(days: number) {
    const current = this.stateSubject.value;
    const epochIncrease = Math.round(days / 6.4);
    const newEpoch = current.epoch + epochIncrease;
    const latencyIncrease = parseFloat((days * 0.02).toFixed(1));
    const newLatency = parseFloat((current.decisionLatency + latencyIncrease).toFixed(1));
    const habituationIncrease = Math.round(days * 0.25);
    const newHabitRisk = Math.min(95, current.habituationRisk + habituationIncrease);

    let updatedEvidence = [...this.evidenceSubject.value];
    let startSeq = updatedEvidence.length ? updatedEvidence[0].sequenceId + 1 : 1010;
    
    const types: Array<'GOVERNANCE' | 'REPLAY' | 'IDENTITY' | 'TELEMETRY' | 'POLICY'> = ['GOVERNANCE', 'REPLAY', 'IDENTITY', 'POLICY', 'TELEMETRY'];
    const mockEvents = [
      'Stewardship Observation audit completed.',
      'Authority public key rotated.',
      'Tenant isolation context verified.',
      'Clock synchronization drift check: ok.',
      'State hash anchor anchored to ledger.'
    ];

    for (let i = 0; i < Math.round(days / 10); i++) {
      const type = types[i % types.length];
      const payload = `[Simulation +${(i+1)*10}d] Epoch ${current.epoch + Math.floor(i/2)}: ${mockEvents[i % mockEvents.length]}`;
      const entry = this.generateEntry(startSeq++, 'VERIFIED', payload, type);
      updatedEvidence = [entry, ...updatedEvidence];
    }

    const addedHistory: GovernanceEpoch[] = [];
    for (let i = 0; i < epochIncrease; i++) {
      const ep = current.epoch + i + 1;
      addedHistory.unshift({
        id: ep,
        status: 'ARCHIVED',
        timestamp: new Date(Date.now() - (epochIncrease - i) * 6.4 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
        desc: `Epoch ${ep}: Dynamic ledger continuity preserved.`
      });
    }

    const activeHist: GovernanceEpoch = {
      id: newEpoch,
      status: 'ACTIVE',
      timestamp: new Date().toISOString().substring(0, 10),
      desc: `Epoch ${newEpoch}: Longitudinal stability checkpoint reached (+${days} days).`
    };

    const newHistory = [
      activeHist,
      ...addedHistory,
      ...current.governanceHistory.map(h => h.status === 'ACTIVE' ? { ...h, status: 'ARCHIVED' as const } : h)
    ];

    this.stateSubject.next({
      ...current,
      epoch: newEpoch,
      decisionLatency: newLatency,
      habituationRisk: newHabitRisk,
      governanceHistory: newHistory,
      ritualIntegrity: Math.max(40, current.ritualIntegrity - Math.round(days * 0.15))
    });

    this.evidenceSubject.next(updatedEvidence);
    this.rawEvidenceBackup = [...updatedEvidence];
  }

  private localResetState() {
    this.stateSubject.next({
      epoch: 102,
      trustLevel: 'VERIFIED',
      isSafeMode: false,
      escalationTier: 'OPERATOR',
      activeDrill: 'NONE',
      habituationRisk: 12,
      quorumStatus: 'HEALTHY',
      decisionLatency: 4.2,
      ritualIntegrity: 100,
      replayIntegrity: 100,
      telemetryEroded: false,
      chronologyGaps: false,
      chronologyConfidence: 100,
      verificationTier: 'HOT',
      ritualDecayed: false,
      ceremonyDurationAvg: 254,
      approvalNarrativeLengthAvg: 242,
      repeatedApproversCount: 0,
      governanceProposals: [],
      drillStartTime: null,
      operatorReactionTime: null,
      currentRunningLatency: 0,
      governanceHistory: [
        { id: 102, status: 'ACTIVE', timestamp: '2026-05-16', desc: 'Epoch 102: Authority Root Synchronized' },
        { id: 101, status: 'ARCHIVED', timestamp: '2026-05-15', desc: 'Epoch 101: Quorum Rotation Ceremony' },
        { id: 100, status: 'ARCHIVED', timestamp: '2026-05-14', desc: 'Epoch 100: Baseline Restoration Verified' }
      ],
      recoveryInvariants: {
        causalContinuity: { status: true, label: 'Ledger lineage verified (Hash: 0x8a92...)' },
        epochAlignment: { status: true, label: 'Authority sync within 1ms tolerance' },
        hsmSynchronicity: { status: true, label: 'Physical anchor heartbeat verified' }
      },
      drills: [
        { id: 'IFD-001', name: 'IFD-001: Replay Poisoning', status: 'INACTIVE', lastRun: '14d ago', description: 'Simulate forged payload insertion to trigger trust degradation and chain fractures.' },
        { id: 'IFD-002', name: 'IFD-002: Telemetry Erosion', status: 'INACTIVE', lastRun: 'Never', description: 'Simulate loss of forensic logs, chronology gaps, and timeline blindness.' },
        { id: 'IFD-003', name: 'IFD-003: Governance Collapse', status: 'INACTIVE', lastRun: 'Never', description: 'Simulate total epoch registry failure, SAFE_MODE locking, and Supervisor override.' },
        { id: 'IFD-004', name: 'IFD-004: Dirty Archaeology', status: 'INACTIVE', lastRun: 'Never', description: 'Simulate corrupted databases, partial transactions, chronology gaps, and duplicate timelines.' },
        { id: 'RITUAL_DECAY', name: 'Ritual Decay Simulation', status: 'INACTIVE', lastRun: '7d ago', description: 'Inject rubber-stamping, narrative erosion, and approved-without-ceremony patterns.' },
        { id: 'FREEZE_PRESSURE', name: 'Institutional Freeze Pressure', status: 'INACTIVE', lastRun: '30d ago', description: 'Flood governance queues with capability expansions to test restraint.' },
        { id: 'TOTAL_QUORUM_FAILURE', name: 'Total Quorum Failure', status: 'INACTIVE', lastRun: 'Never', description: 'Simulate physical HSM failure requiring high-friction manual override ceremony.' }
      ],
      activeIncidents: []
    });
    this.initializeLedger();
  }

  private generateEntry(id: number, verdict: 'VERIFIED' | 'DEGRADED' | 'UNTRUSTED', payload: string, type: any): EvidenceEntry {
    return {
      sequenceId: id,
      timestamp: new Date(),
      type,
      payload,
      evidence: {
        hash: '0x' + Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 6),
        prevHash: '0x' + Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 6),
        signature: 'ZTAN_SIG_' + Math.random().toString(16).substring(2, 8).toUpperCase(),
        epoch: '102',
        verdict
      }
    };
  }

  public async exportReplayCapsule() {
    const total = this.totalEventsInDB || 5;
    const entries = await this.getPaginatedEvents(0, total);
    entries.sort((a, b) => a.sequenceId - b.sequenceId);

    const minSeq = entries.length ? entries[0].sequenceId : 1000;
    const maxSeq = entries.length ? entries[entries.length - 1].sequenceId : 1000;

    const entriesStr = JSON.stringify(entries);
    let hash = 2166136261;
    for (let i = 0; i < entriesStr.length; i++) {
      hash ^= entriesStr.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const checksum = (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');

    const state = this.stateSubject.value;
    const capsule = {
      manifest: {
        version: '1.0.0',
        epoch: state.epoch,
        timestamp: Date.now(),
        sequenceRange: [minSeq, maxSeq] as [number, number],
        rootHash: entries.length ? entries[entries.length - 1].evidence.hash : '0x00',
        signature: entries.length ? entries[entries.length - 1].evidence.signature : 'ZTAN_SIG_00',
        totalEntries: entries.length,
        checksum
      },
      entries
    };

    const blob = new Blob([JSON.stringify(capsule, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ztan-replay-capsule-${state.epoch}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    console.log(`[StewardshipService] Replay capsule exported with checksum ZTAN_${checksum}`);
  }

  private verifyJsonBracketDepth(str: string, maxDepth: number = 10): boolean {
    let depth = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === '{' || char === '[') {
        depth++;
        if (depth > maxDepth) return false;
      } else if (char === '}' || char === ']') {
        depth = Math.max(0, depth - 1);
      }
    }
    return true;
  }

  public importReplayCapsule(file: File) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const text = e.target.result;
        if (text.length > 15 * 1024 * 1024) {
          throw new Error('Capsule size exceeds 15MB safety limit.');
        }

        if (!this.verifyJsonBracketDepth(text, 10)) {
          throw new Error('Capsule structure violates maximum JSON bracket nesting limit of 10.');
        }

        const capsule = JSON.parse(text);
        if (!capsule.manifest || !Array.isArray(capsule.entries)) {
          throw new Error('Malformed capsule format: missing manifest or entries.');
        }

        if (this.worker) {
          this.worker.postMessage({ type: 'IMPORT_CAPSULE', payload: text });
        }
      } catch (err: any) {
        console.error('[StewardshipService] Capsule import validation failed:', err);
        alert(`Capsule Import Failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }


  public setVerificationTier(tier: 'HOT' | 'WARM' | 'COLD') {
    const current = this.stateSubject.value;
    this.stateSubject.next({
      ...current,
      verificationTier: tier
    });
    if (this.worker) {
      this.worker.postMessage({ type: 'SET_VERIFICATION_TIER', payload: tier });
    }
  }
}





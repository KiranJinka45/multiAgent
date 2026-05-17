import { Injectable, signal, computed, inject } from '@angular/core';
import { WebsocketService } from './websocket.service';
import { 
  SREUpdate, 
  SRETuningParams, 
  EvidenceChain, 
  EvidenceEntry 
} from '@packages/contracts';
import { logger } from '@packages/observability';

@Injectable({
  providedIn: 'root'
})
export class SreDataService {
  public ws = inject(WebsocketService);
  
  // Master Signal for SRE State
  private state = signal<SREUpdate | null>(null);

  // Forensic Evidence Signals
  public evidenceChain = signal<EvidenceChain | null>(null);
  public activeReplayEntryId = signal<string | null>(null);
  public governanceContext = signal<{
    epoch: string;
    quorum: string;
    notary: string;
    authorityHealth: number;
  } | null>(null);

  // Derived Signals for Components
  public intent = computed(() => this.state()?.intent);
  public perception = computed(() => this.state()?.perception);
  public operationalControl = computed(() => this.state()?.operationalControl);
  public observers = computed(() => this.state()?.observers || []);
  public events = computed(() => this.state()?.events || []);
  public lastAction = computed(() => this.state()?.lastAction);
  public zTrend = signal<'UP' | 'DOWN' | 'STABLE'>('STABLE');
  public validation = computed(() => (this.state() as any)?.validation);
  public elite = computed(() => (this.state() as any)?.elite);
  public soak = computed(() => (this.state() as any)?.soak);
  public audit = computed(() => (this.state() as any)?.audit || []);
  public stability = computed(() => this.state()?.stability);
  public topology = computed(() => this.state()?.topology || { nodes: [], edges: [] });
  
  /**
   * Evidence Chain Linkage
   */
  public evidenceChainId = computed(() => this.state()?.evidenceChainId);

  private lastZScore = 0;

  public healthStatus = computed(() => {
    const p = this.perception();
    if (!p || (p.anomalyHypothesis?.support || 0) < 10) return 'INITIALIZING';
    const z = p.anomalyHypothesis.zScore;
    if (z >= 4) return 'CRITICAL';
    if (z >= 2) return 'DEGRADED';
    return 'HEALTHY';
  });

  public confidenceLevel = computed(() => {
    const p = this.perception();
    const support = p?.anomalyHypothesis?.support || 0;
    if (support < 10) return 'LOW';
    if (support < 30) return 'MEDIUM';
    return 'HIGH';
  });

  public systemStability = computed(() => {
    const s = this.stability();
    const p = this.perception();
    const c = this.operationalControl();
    
    if (!p || !c || !s || (p.anomalyHypothesis?.support || 0) < 10) return 'INITIALIZING';
    if (c.mode === 'HALTED' || p.signalIntegrityState === 'CRITICAL') return 'UNSTABLE';
    
    if (s.score < 0.4) return 'LOW';
    if (s.score < 0.7) return 'GUARDED';
    
    return 'HIGH';
  });

  public stabilityScore = computed(() => this.stability()?.score || 0);
  public stabilityBreakdown = computed(() => this.stability()?.breakdown);

  public stabilityConfidence = computed(() => {
    const p = this.perception();
    const stability = this.systemStability();

    if (!p || stability === 'INITIALIZING' || stability === 'UNSTABLE') return 0;

    const base = 1 - Math.min(p.tuningVelocity * 5, 0.5);
    const decayBonus = p.velocityDecay < 0 ? 0.2 : 0;
    return Math.min(base + decayBonus, 1.0);
  });

  public rankedBlockers = computed(() => {
    const c = this.operationalControl();
    if (!c || c.mode !== 'STABLE') return [];
    
    const decomp = (c as any).reasoningDecomposition;
    const blockers = [
      { reason: 'QUORUM_GAP', impact: 1 - decomp.quorumContribution },
      { reason: 'DIVERSITY_GAP', impact: Math.max(0, 1 - decomp.diversityFactor) },
      { reason: 'SAFETY_BUFFER', impact: decomp.safetyBuffer }
    ];
    
    return blockers.sort((a, b) => b.impact - a.impact).filter(b => b.impact > 0.05);
  });

  public nextActionEta = computed(() => {
    const c = this.operationalControl();
    if (!c || c.mode !== 'HEALING') return null;
    return Math.max(0, (c.holdTimeMs || 0) / 1000);
  });

  constructor() {
    this.connectToSreTelemetry();
    this.connectToSreAnalytics();
  }

  private lastSequenceId = -1;
  private disorderCount = 0;

  private connectToSreTelemetry() {
    this.ws.emit('sre:subscribe', {});

    this.ws.onEvent<SREUpdate>('sre:update').subscribe(update => {
      if (update.sequenceId > this.lastSequenceId + 5 && this.lastSequenceId !== -1) {
        console.warn('[SRE] Significant sequence gap detected. Requesting full sync...', 
          { missed: update.sequenceId - this.lastSequenceId });
        this.requestFullSync();
        return;
      }

      if (update.sequenceId > this.lastSequenceId) {
        this.lastSequenceId = update.sequenceId;
        
        const current = this.state();
        if (current) {
          this.state.set({
            ...current,
            ...update,
            perception: { ...current.perception, ...(update.perception || {}) },
            operationalControl: { ...current.operationalControl, ...(update.operationalControl || {}) },
            stability: { ...current.stability, ...(update.stability || {}) },
            validation: { ...((current as any).validation || {}), ...(update as any).validation },
            elite: { ...((current as any).elite || {}), ...(update as any).elite },
            business: { ...((current as any).business || {}), ...(update as any).business },
            topology: update.topology || (current as any).topology
          } as SREUpdate);
        } else {
          this.state.set(update);
        }

        const newState = this.state();
        const currentZ = newState?.perception?.anomalyHypothesis?.zScore || 0;
        if (Math.abs(currentZ - this.lastZScore) > 0.05) {
          this.zTrend.set(currentZ > this.lastZScore ? 'UP' : 'DOWN');
        } else {
          this.zTrend.set('STABLE');
        }
        this.lastZScore = currentZ;
      } else {
        this.disorderCount++;
        this.ws.emit('sre:network_disorder', { 
          sequenceId: update.sequenceId, 
          lastSequenceId: this.lastSequenceId,
          totalDisordered: this.disorderCount 
        });
      }
    });

    this.ws.onEvent<{ message: string }>('sre:error').subscribe(err => {
      console.error('[SRE] Tuning Error:', err.message);
    });

    this.ws.reconnected$.subscribe(() => {
      this.lastSequenceId = -1;
      this.ws.emit('sre:subscribe', {});
    });
  }

  private connectToSreAnalytics() {
    this.ws.emit('sre:analytics:subscribe', {});
    this.ws.reconnected$.subscribe(() => {
      this.ws.emit('sre:analytics:subscribe', {});
    });
  }

  public getAnalyticsStream() {
    return this.ws.onEvent<any>('sre:analytics:event');
  }

  public getAnalyticsInit() {
    return this.ws.onEvent<any[]>('sre:analytics:init');
  }

  private requestFullSync() {
    this.ws.emit('sre:request_full_sync', {});
    this.lastSequenceId = -1;
  }

  public tune(params: Partial<SRETuningParams>) {
    const action = { ...params, operatorTimestamp: Date.now() };
    this.ws.emit('sre:tune', action);
  }

  public injectSignal(signal: any) {
    this.ws.emit('sre:inject_signal', signal);
  }

  public injectChaos(scenario: string, nodeId: string = 'api-service') {
    this.ws.emit('sre:chaos_inject', { scenario, nodeId });
  }

  public clearChaos() {
    this.ws.emit('sre:chaos_clear', {});
  }

  public resetValidation() {
    this.ws.emit('sre:validation_reset', {});
  }

  public startSoak() {
    this.ws.emit('sre:soak_start', {});
  }

  public stopSoak() {
    this.ws.emit('sre:soak_stop', {});
  }

  public approveRequest(requestId: string, rationale: string) {
    this.ws.emit('sre:approve', { requestId, rationale });
  }

  public rejectRequest(requestId: string, rationale: string) {
    this.ws.emit('sre:reject', { requestId, rationale });
  }

  /**
   * REPLAY EXPLORER: Forensic Data Retrieval
   */
  public loadEvidenceChain(incidentId: string) {
    logger.info({ incidentId }, '[SRE-FRONTEND] Requesting forensic evidence chain');
    this.ws.emit('sre:archaeology:load_chain', { incidentId });
    
    this.ws.onEvent<EvidenceChain>('sre:archaeology:chain_loaded').subscribe(chain => {
      this.evidenceChain.set(chain);
      if (chain.governanceContext) {
        this.governanceContext.set({
          epoch: chain.governanceContext.id,
          quorum: chain.governanceContext.quorum,
          notary: chain.governanceContext.notaryAnchor,
          authorityHealth: 1.0 // Initializing at 100%
        });
      }
      if (chain.verificationState === 'untrusted') {
        console.error('[SRE-FORENSICS] Warning: Loaded evidence chain failed integrity verification.');
      }
    });
  }

  public setReplayEntry(entryId: string) {
    this.activeReplayEntryId.set(entryId);
  }
}

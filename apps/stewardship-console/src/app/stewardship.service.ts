import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';

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
}

@Injectable({ providedIn: 'root' })
export class StewardshipService {
  private evidenceSubject = new BehaviorSubject<EvidenceEntry[]>([]);
  private stateSubject = new BehaviorSubject<StewardshipState>({
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
      { id: 'RITUAL_DECAY', name: 'Ritual Decay Simulation', status: 'INACTIVE', lastRun: '7d ago', description: 'Inject rubber-stamping, narrative erosion, and approved-without-ceremony patterns.' },
      { id: 'FREEZE_PRESSURE', name: 'Institutional Freeze Pressure', status: 'INACTIVE', lastRun: '30d ago', description: 'Flood governance queues with capability expansions to test restraint.' },
      { id: 'TOTAL_QUORUM_FAILURE', name: 'Total Quorum Failure', status: 'INACTIVE', lastRun: 'Never', description: 'Simulate physical HSM failure requiring high-friction manual override ceremony.' }
    ],
    activeIncidents: []
  });

  evidence$ = this.evidenceSubject.asObservable();
  state$ = this.stateSubject.asObservable();

  private clockSubscription: Subscription | null = null;
  private rawEvidenceBackup: EvidenceEntry[] = [];

  constructor() {
    this.initializeLedger();
    this.startLatencyTracker();
  }

  private initializeLedger() {
    const initial: EvidenceEntry[] = [
      this.generateEntry(1000, 'VERIFIED', 'Epoch 100 Initialized: Multi-signature Quorum verified successfully.', 'GOVERNANCE'),
      this.generateEntry(1001, 'VERIFIED', 'Authority Node A Registered: Public key bound to HSM hardware anchor.', 'IDENTITY'),
      this.generateEntry(1002, 'VERIFIED', 'Inbound Policy Sync Complete: Blast-radius rule enforced globally.', 'POLICY'),
      this.generateEntry(1003, 'VERIFIED', 'Ledger Integrity Heartbeat: Merkle path verified (0x92f1...).', 'REPLAY'),
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

  triggerDrill(id: string) {
    const current = this.stateSubject.value;
    
    // Set drill as active
    const drills = current.drills.map((d: SociotechnicalDrill) => 
      d.id === id ? { ...d, status: 'ACTIVE' as const } : d
    );

    const drillStartTime = Date.now();

    // Start with existing ledger base
    let evidence = [...this.evidenceSubject.value];

    // Handle state transitions based on drill
    if (id === 'IFD-001') {
      // 1. Replay Poisoning
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
          causalContinuity: { status: false, label: 'Chain fracture: Forged Merkle proof injected' }
        },
        activeIncidents: [
          {
            id: 'INC-IFD-001',
            type: 'REPLAY_POISONING',
            severity: 'CRITICAL',
            title: 'Critical Chain Fracture Detected',
            description: 'A forged signature payload was detected, poisoning the replay log and fracturing Merkle verification continuity.',
            timestamp: new Date()
          }
        ]
      });
      this.evidenceSubject.next(evidence);

    } else if (id === 'IFD-002') {
      // 2. Telemetry Erosion
      // Physically remove timeline entries (simulate chronology gaps)
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
      // 3. Governance Collapse
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
      // 4. Ritual Decay
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
      // 5. Freeze Pressure
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
      // 6. Total Quorum Failure
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
    }
  }

  // Resolve a specific drill, calculating reaction latency
  resolveDrill(id: string, actionsTaken: string) {
    const current = this.stateSubject.value;
    if (current.activeDrill !== id) return;

    const reactionTime = current.drillStartTime 
      ? parseFloat(((Date.now() - current.drillStartTime) / 1000).toFixed(1)) 
      : 2.5;

    const drills = current.drills.map((d: SociotechnicalDrill) => 
      d.id === id ? { ...d, status: 'PASSED' as const, lastRun: `Passed (${reactionTime}s)` } : d
    );

    // Create a mitigation ledger entry
    const seq = this.evidenceSubject.value.length ? this.evidenceSubject.value[0].sequenceId + 1 : 1010;
    const resolutionEntry = this.generateEntry(
      seq, 
      'VERIFIED', 
      `MITIGATION SUCCESSFUL: Drill ${id} resolved. Action: ${actionsTaken}. Reaction Time: ${reactionTime}s.`, 
      'POLICY'
    );

    const updatedEvidence = [resolutionEntry, ...this.evidenceSubject.value];

    // Clear incidents related to the drill
    const incidents = current.activeIncidents.filter(inc => !inc.id.includes(id) && !inc.id.includes('INC-TOTAL-FAIL'));

    // Revert governance epochs back to healthy if IFD-003 was active
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

    // If telemetry was eroded, restore complete history
    if (current.telemetryEroded) {
      this.evidenceSubject.next([resolutionEntry, ...this.rawEvidenceBackup]);
    } else {
      this.evidenceSubject.next(updatedEvidence);
    }
  }

  // Handle proposal actions for Freeze Pressure
  resolveProposal(proposalId: string, action: 'REJECT' | 'PRUNE' | 'APPROVE', justification: string) {
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

    // If all proposals are pruned or rejected, we successfully pass the Freeze Pressure drill!
    if (allResolved) {
      const rejectsAndPrunes = proposals.every(p => p.status === 'REJECTED' || p.status === 'PRUNED');
      if (rejectsAndPrunes) {
        this.resolveDrill('FREEZE_PRESSURE', 'Defended capability expansion. Rejected automatic agents.');
      } else {
        // Operator approved something bad! Trigger a trust failure instead of resolving!
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

  // Simulate Longitudinal Aging
  simulateAging(days: number) {
    const current = this.stateSubject.value;
    const epochIncrease = Math.round(days / 6.4);
    const newEpoch = current.epoch + epochIncrease;
    const latencyIncrease = parseFloat((days * 0.02).toFixed(1));
    const newLatency = parseFloat((current.decisionLatency + latencyIncrease).toFixed(1));
    const habituationIncrease = Math.round(days * 0.25);
    const newHabitRisk = Math.min(95, current.habituationRisk + habituationIncrease);

    // Expand the ledger: insert a set of randomized historical entries
    let updatedEvidence = [...this.evidenceSubject.value];
    let startSeq = updatedEvidence.length ? updatedEvidence[0].sequenceId + 1 : 1010;
    
    const types: Array<'GOVERNANCE' | 'REPLAY' | 'IDENTITY' | 'TELEMETRY' | 'POLICY'> = ['GOVERNANCE', 'REPLAY', 'IDENTITY', 'POLICY', 'TELEMETRY'];
    const mockEvents = [
      'Stewardship Observation audit completed.',
      'Authority public key rotated.',
      'Tenant isolation context verified.',
      'Clock synchronization drift check: ok.',
      'Merkle root anchor anchored to ledger.'
    ];

    for (let i = 0; i < Math.round(days / 10); i++) {
      const type = types[i % types.length];
      const payload = `[Simulation +${(i+1)*10}d] Epoch ${current.epoch + Math.floor(i/2)}: ${mockEvents[i % mockEvents.length]}`;
      const entry = this.generateEntry(startSeq++, 'VERIFIED', payload, type);
      updatedEvidence = [entry, ...updatedEvidence];
    }

    // Append to history list
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

    // Modify primary history entry
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

    // Save backing
    this.rawEvidenceBackup = [...updatedEvidence];
  }

  // Global reset state
  resetState() {
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
}

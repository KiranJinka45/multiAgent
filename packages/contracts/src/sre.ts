export interface SREObserver {
  id: string;
  provider: string;
  weight: number;
  state: string;
  isCorrect: boolean;
  lastSeen?: string;
  reliabilityScore: number; // 0.0 - 1.0 (Time-series based)
  lastReliabilityUpdate: number; // Timestamp for decay calculations
  uptime: number; // Percentage
  actionPreference?: 'NO_ACTION' | 'ALERT' | 'ACT';
  group?: string; // NEW: For A/B group assignment in certification
}

export interface SREDiversity {
  providers: number;
  required: number;
  groups: string[];
  satisfied: boolean;
}

export interface SREDecomposition {
  quorum: number;
  diversity: number;
  stability: number;
}

export interface SREPerception {
  consensus: number;
  diversity: SREDiversity;
  weightedConfidence: number;
  decomposition: SREDecomposition;
  explainability: {
    rationale: string;
    impacts: { factor: string, score: number, delta: number }[];
  };
  expectedVariance: number; // Normal noise band
  anomalyHypothesis: {
    detected: boolean;
    zScore: number;
    confidence: number;
    type?: 'NOISE' | 'GRAY_FAILURE' | 'HARD_FAILURE' | 'STATISTICAL_OUTLIER' | 'NONE';
    precision?: number;
    recall?: number;
    f1?: number;
    support?: number;
  };
  brierScore: number; // Calibration Accuracy (lower is better)
  calibrationBuffer: number; // Safety uplift for threshold
  signalQuality: number; // 1.0 = Perfect, 0.0 = High Disorder
  signalIntegrityState: 'NOMINAL' | 'DEGRADED' | 'CRITICAL';
  causalCertainty: number; // Correlation between signal failure and anomaly
  wassersteinDistance: number; // p-distance for drift detection
  tuningVelocity: number; // Speed of threshold adaptation
  velocityDecay: number; // Rate of change of velocity (stability signal)
  convergenceState?: 'INITIALIZING' | 'CONVERGING' | 'OSCILLATING' | 'FORMALLY_STABLE';
  tuningHistory?: number[];
  wassersteinHistory?: number[];
}

export interface SRETrust {
  score: number;
  breakdown: {
    confidence: number;
    calibration: number;
    stability: number;
    consensus: number;
    dataQuality: number;
  };
}

export interface SREGovernance {
  mode: 'STABLE' | 'HEALING' | 'HALTED' | 'CHAOS_TEST' | 'AWAITING_APPROVAL' | 'SAFE_MODE';
  reason: string;
  reasonType: 'NO_QUORUM' | 'NO_DIVERSITY' | 'UNSTABLE_QUORUM' | 'LOW_CONFIDENCE' | 'POST_ACTION_DIVERGENCE' | 'SIGNAL_INTEGRITY_FAILURE' | 'NONE';
  holdTimeMs: number;
  expectedTTAC: number;
  slidingP95TTAC: number; // Dynamic p95 window
  reasoningDecomposition: {
    quorumContribution: number;
    diversityFactor: number;
    safetyBuffer: number;
    causalTrigger: string | null;
  };
  approvalRequired?: boolean;
  approvalRequestId?: string;
}

export interface SREEvent {
  time: string;
  type: string;
  desc: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface SREUpdate {
  sequenceId: number; // Monotonic counter
  timestamp: number; // Unix ms
  intent: string;
  perception?: SREPerception | any;
  governance?: SREGovernance | any;
  observers?: SREObserver[] | any[];
  lastAction?: any;
  events?: SREEvent[] | any[];
  trust?: SRETrust | any;
  topology?: {
    nodes: any[];
    edges: any[];
  };
  validation?: any;
  elite?: any;
  audit?: any;
  drift?: {
    dataDrift: number;
    conceptDrift: number;
    policyDrift: number;
    overallScore: number;
    status: 'NOMINAL' | 'DRIFTING' | 'CRITICAL';
  };
  learning?: {
    activeVersion: string;
    shadowVersion: string | null;
    isAdapting: boolean;
  };
  business?: {
    revenuePerMinute: number;
    activeUsers: number;
    impact: {
      revenueLossPerMin: number;
      projectedMonthlyLoss: number;
      riskLevel: string;
    };
    proposals: any[];
  };
  governanceAudit?: {
    avgBrier: number;
    avgRegret: number;
    avgRoiAccuracy: number;
    status: string;
    intervention: string;
  };
}

export interface SRETuningParams {
  expectedTTAC: number;
  confidenceThreshold: number;
  trustDecayRate: number;
  minDiversity: number;
}

export type RiskLevel = 'SAFE' | 'LOW_RISK' | 'SENSITIVE' | 'HIGH_RISK' | 'CRITICAL' | 'BLOCKED';

export interface ClassificationResult {
  riskLevel: RiskLevel;
  allowed: boolean;
  reasons: string[];
  riskScore: number;
}

export function classifyRisk(inputs: {
  deterministicBlocked: boolean;
  blockedReasons: string[];
  toolMaxRisk: string;
  toolReasons: string[];
  semanticScore: number; // 0 to 100
  semanticReasons: string[];
}): ClassificationResult {
  const reasons: string[] = [];
  let allowed = true;
  let riskLevel: RiskLevel = 'SAFE';

  // 1. Tool Risk Evaluation
  let toolRiskScore = 0;
  if (inputs.toolMaxRisk === 'privileged') {
    riskLevel = 'BLOCKED';
    allowed = false;
    reasons.push('Blocked due to privileged tool invocation requirement.');
  } else if (inputs.toolMaxRisk === 'irreversible' || inputs.toolMaxRisk === 'infrastructure_mutation') {
    toolRiskScore = 85;
    reasons.push(...inputs.toolReasons);
  } else if (inputs.toolMaxRisk === 'financial_operation' || inputs.toolMaxRisk === 'filesystem_write') {
    toolRiskScore = 65;
    reasons.push(...inputs.toolReasons);
  } else if (inputs.toolMaxRisk === 'external_network') {
    toolRiskScore = 40;
    reasons.push(...inputs.toolReasons);
  } else if (inputs.toolMaxRisk === 'read_only') {
    toolRiskScore = 15;
    reasons.push(...inputs.toolReasons);
  }

  // 2. Deterministic Injection Evaluation
  if (inputs.deterministicBlocked) {
    riskLevel = 'BLOCKED';
    allowed = false;
    reasons.push(...inputs.blockedReasons);
  }

  // 3. Combined Risk Score
  // Combine tool risk score and semantic score (probabilistic)
  // Weighted: Deterministic blocks trump all. If not blocked, score is max of tool risk and semantic score.
  let combinedScore = Math.max(toolRiskScore, inputs.semanticScore);
  
  if (riskLevel === 'BLOCKED') {
    combinedScore = 100;
  }

  // 4. Map score to risk level if not already BLOCKED
  if (riskLevel !== 'BLOCKED') {
    if (combinedScore >= 90) {
      riskLevel = 'CRITICAL';
      allowed = false;
      reasons.push('Request exhibits CRITICAL risk parameters.');
    } else if (combinedScore >= 70) {
      riskLevel = 'HIGH_RISK';
      allowed = false;
      reasons.push('Request exhibits HIGH_RISK parameters.');
    } else if (combinedScore >= 45) {
      riskLevel = 'SENSITIVE';
      allowed = true;
    } else if (combinedScore >= 20) {
      riskLevel = 'LOW_RISK';
      allowed = true;
    } else {
      riskLevel = 'SAFE';
      allowed = true;
    }
  }

  // Append any semantic inspection reasons
  if (inputs.semanticReasons.length > 0) {
    reasons.push(...inputs.semanticReasons);
  }

  return {
    riskLevel,
    allowed,
    reasons: Array.from(new Set(reasons)),
    riskScore: combinedScore
  };
}

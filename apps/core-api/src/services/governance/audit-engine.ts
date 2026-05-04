import { logger } from '@packages/observability';
import { calculateRoiError } from '@packages/business';
import { createHash } from 'crypto';
import { db } from '@packages/db';


export interface AuditRecord {
  id: string;
  timestamp: number;
  decisionId: string;
  predictedRoi: number; // In currency
  actualRoi: number;    // In currency
  confidence: number;
  brierScore: number;
  regret: number;
  roiAccuracy: number;  // 0..1 (1 - error)
  previousHash: string;
  hash: string;
}

export class GovernanceAuditEngine {
  private history: AuditRecord[] = [];
  private lastHash: string = 'GENESIS';

  /**
   * Independently verifies a completed decision by comparing predicted vs observed ROI.
   */
  public verify(decisionId: string, predicted: number, actual: number, confidence: number): AuditRecord {
    const brier = Math.pow(confidence - (actual > 0 ? 1 : 0), 2);
    const regret = Math.max(0, predicted - actual);
    
    // Rigorous ROI Error calculation using the business package
    const roiError = calculateRoiError(predicted, actual);
    const roiAccuracy = Math.max(0, 1 - roiError);

    logger.info({ 
        decisionId, 
        predicted, 
        actual, 
        roiError, 
        roiAccuracy 
    }, '[GOVERNANCE-AUDIT] ROI Verification Details');

    const record: Partial<AuditRecord> = {
      id: `gov-${Date.now()}`,
      timestamp: Date.now(),
      decisionId,
      predictedRoi: predicted,
      actualRoi: actual,
      confidence,
      brierScore: brier,
      regret,
      roiAccuracy,
      previousHash: this.lastHash
    };

    record.hash = this.calculateHash(record);
    this.lastHash = record.hash!;
    
    const finalRecord = record as AuditRecord;
    this.history.push(finalRecord);
    
    logger.info({ decisionId, brier, regret, roiAccuracy }, '[GOVERNANCE-AUDIT] Decision verified and signed');
    return finalRecord;
  }

  private calculateHash(r: Partial<AuditRecord>): string {
    return createHash('sha256')
      .update(`${r.decisionId}${r.predictedRoi}${r.actualRoi}${r.confidence}${r.previousHash}`)
      .digest('hex');
  }

  public getStats() {
    if (this.history.length === 0) {
      return { 
        avgBrier: 0, 
        avgRegret: 0, 
        avgRoiAccuracy: 1.0, // Default to perfect if no data yet
        count: 0 
      };
    }
    
    const count = this.history.length;
    return {
      avgBrier: this.history.reduce((a, b) => a + b.brierScore, 0) / count,
      avgRegret: this.history.reduce((a, b) => a + b.regret, 0) / count,
      avgRoiAccuracy: this.history.reduce((a, b) => a + b.roiAccuracy, 0) / count,
      count
    };
  }

  public getHistory() {
    return this.history;
  }

  public async reset() {
    this.history = [];
    this.lastHash = 'GENESIS';
    try {
        await db.auditLog.deleteMany({});
        logger.info('[AUDIT-ENGINE] Persistent audit logs cleared');
    } catch (e) {
        logger.error({ err: e }, '[AUDIT-ENGINE] Failed to clear persistent logs');
    }
  }
}

export const governanceAudit = new GovernanceAuditEngine();

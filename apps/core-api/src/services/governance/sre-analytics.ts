import { redis } from '@packages/utils';
import { logger } from '@packages/observability';
import { lossPerMinute, BizInputs } from '@packages/business';

export interface SreAnalyticsEvent {
  ts: number;
  type: 'RCA' | 'ACTION' | 'HITL' | 'TRUST' | 'SYSTEM' | 'ROI';
  payload: any;
}

export class SreAnalyticsService {
  private static KEY_PREFIX = 'sre:analytics:';
  private static EVENT_LOG = 'sre:analytics:events';
  private static onEventListener: ((event: SreAnalyticsEvent) => void) | null = null;

  public static setOnEventListener(listener: (event: SreAnalyticsEvent) => void) {
    this.onEventListener = listener;
  }

  public static async recordEvent(event: Omit<SreAnalyticsEvent, 'ts'>) {
    const payload = {
      ...event,
      ts: Date.now()
    };

    // Store in a rolling stream for the dashboard
    await redis.lpush(this.EVENT_LOG, JSON.stringify(payload));
    await redis.ltrim(this.EVENT_LOG, 0, 1000); // Keep last 1000 events

    if (this.onEventListener) {
      this.onEventListener(payload);
    }

    // Perform aggregations for time-series metrics
    await this.aggregate(payload);
  }

  private static async aggregate(event: SreAnalyticsEvent) {
    const hourKey = new Date(event.ts).toISOString().slice(0, 13); // YYYY-MM-DDTHH
    
    switch (event.type) {
      case 'ACTION':
        await redis.hincrby(`${this.KEY_PREFIX}actions:${hourKey}`, 'total', 1);
        if (event.payload.success) {
          await redis.hincrby(`${this.KEY_PREFIX}actions:${hourKey}`, 'success', 1);
        }
        if (event.payload.regret) {
          await redis.hset(`${this.KEY_PREFIX}regret:${hourKey}`, event.ts.toString(), event.payload.regret);
        }
        break;
      
      case 'HITL':
        await redis.hincrby(`${this.KEY_PREFIX}hitl:${hourKey}`, event.payload.status, 1);
        if (event.payload.ttdMs) {
          await redis.lpush(`${this.KEY_PREFIX}ttd:${hourKey}`, event.payload.ttdMs.toString());
        }
        break;

      case 'TRUST':
        await redis.hset(`${this.KEY_PREFIX}trust:${hourKey}`, event.ts.toString(), event.payload.trust.toString());
        if (event.payload.brierScore !== undefined) {
          await redis.hset(`${this.KEY_PREFIX}brier:${hourKey}`, event.ts.toString(), event.payload.brierScore.toString());
        }
        break;

      case 'ROI':
        await redis.hincrby(`${this.KEY_PREFIX}roi:${hourKey}`, 'count', 1);
        await redis.hset(`${this.KEY_PREFIX}accuracy:${hourKey}`, event.ts.toString(), event.payload.accuracy.toString());
        break;
    }
  }

  /**
   * Calculates the empirical evidence for the 7-day soak window.
   */
  public static async getCertificationEvidence(windowHours: number = 168) {
    const endTs = Date.now();
    const startTs = endTs - (windowHours * 3600 * 1000);
    
    const events = await this.getEventsInRange(startTs, endTs);
    const actions = events.filter(e => e.type === 'ACTION');
    const hitls = events.filter(e => e.type === 'HITL');
    const trusts = events.filter(e => e.type === 'TRUST');

    const totalDecisions = actions.length + hitls.length;
    const autonomousDecisions = actions.filter(a => a.payload.mode === 'AUTONOMOUS').length;
    const successRate = actions.filter(a => a.payload.success).length / (actions.length || 1);
    
    const stdDev = (arr: number[], mean: number) => {
      if (arr.length <= 1) return 0;
      const variance = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (arr.length - 1);
      return Math.sqrt(variance);
    };

    // Financial Impact Estimation (Revenue-Backed)

    let totalSavings = 0;
    let totalActionCost = 0;
    let totalRegret = 0;
    const regrets: number[] = [];
    const treatmentSavings: number[] = [];
    const controlSavings: number[] = [];



    for (const action of actions) {
      const bizBefore = action.payload.bizBefore;
      const bizAfter = action.payload.bizAfter;
      const cost = action.payload.cost || 0;

      if (action.payload.success && bizBefore && bizAfter) {
        const lossBefore = lossPerMinute(bizBefore);
        const lossAfter = lossPerMinute(bizAfter);
        const savingsPerMin = lossBefore - lossAfter;
        
        if (savingsPerMin > 0) {
          const MTTR_REDUCTION_MINS = 15;
          const realizedSavings = savingsPerMin * MTTR_REDUCTION_MINS;
          totalSavings += realizedSavings;
          
          if (action.payload.scope === 'CANARY') {
            controlSavings.push(realizedSavings);
          } else {
            treatmentSavings.push(realizedSavings);
          }
        } else {
          // Negative ROI: This is a Regret event
          const regretVal = Math.abs(savingsPerMin) * 5 + cost;
          totalRegret += regretVal;
          regrets.push(regretVal);
        }
      } else if (bizBefore) {
        // Failed Action: Regret = Cost + Realized Loss
        const regretVal = lossPerMinute(bizBefore) * 5 + cost;
        totalRegret += regretVal;
        regrets.push(regretVal);
      }
      totalActionCost += cost;
    }


    const netSavings = totalSavings - totalActionCost - totalRegret;

    const avgBrier = trusts.reduce((acc, t) => acc + (t.payload.brierScore || 0), 0) / (trusts.length || 1);
    const brierVariance = stdDev(trusts.map(t => t.payload.brierScore || 0), avgBrier);
    const avgRegret = totalRegret / (actions.length || 1);

    // Calculate Trend: Split into first half and second half
    const midpoint = startTs + (windowHours * 1800 * 1000);
    
    const brierFirstHalf = trusts.filter(t => t.ts < midpoint).reduce((acc, t) => acc + (t.payload.brierScore || 0), 0) / (trusts.filter(t => t.ts < midpoint).length || 1);
    const brierSecondHalf = trusts.filter(t => t.ts >= midpoint).reduce((acc, t) => acc + (t.payload.brierScore || 0), 0) / (trusts.filter(t => t.ts >= midpoint).length || 1);
    
    const brierTrendSlope = brierSecondHalf - brierFirstHalf;
    const brierTrend = brierTrendSlope <= 0.01 ? 'STABLE' : 'DRIFTING';


    const hitlRateFirstHalf = hitls.filter(h => h.ts < midpoint).length / (totalDecisions / 2 || 1);
    const hitlRateSecondHalf = hitls.filter(h => h.ts >= midpoint).length / (totalDecisions / 2 || 1);

    // Risk Bounds: P95 Regret
    const sortedRegrets = regrets.sort((a, b) => a - b);
    const p95Regret = sortedRegrets.length > 0 ? sortedRegrets[Math.floor(sortedRegrets.length * 0.95)] : 0;
    const regretRatio = p95Regret / (totalSavings || 1);
    
    // Causal Proof
    const meanT = treatmentSavings.length > 0 ? treatmentSavings.reduce((a, b) => a + b, 0) / treatmentSavings.length : 0;
    const meanC = controlSavings.length > 0 ? controlSavings.reduce((a, b) => a + b, 0) / controlSavings.length : 0;
    const uplift = meanT - meanC;

    // Statistical Significance (Welch's T-Test Approximation)
    const stdT = stdDev(treatmentSavings, meanT);
    const stdC = stdDev(controlSavings, meanC);
    const se = Math.sqrt((Math.pow(stdT, 2) / (treatmentSavings.length || 1)) + (Math.pow(stdC, 2) / (controlSavings.length || 1)));
    const zScore = se === 0 ? 0 : uplift / se;
    const pValue = 1 - (0.5 * (1 + Math.tanh(zScore / Math.sqrt(2)))); // Erf approx
    const ci95 = [uplift - 1.96 * se, uplift + 1.96 * se];

    return {
      totalDecisions,
      autonomousDecisions,
      autonomyRatio: autonomousDecisions / (totalDecisions || 1),
      successRate,
      avgBrier,
      brierVariance,
      brierTrend,
      brierTrendSlope,
      driftEvents: brierTrend === 'DRIFTING' ? 1 : 0,
      avgRegret,
      p95Regret,
      regretRatio,
      totalSavings,
      totalRegret,
      totalActionCost,
      netSavings,
      causalProof: {
        uplift,
        meanTreatment: meanT,
        meanControl: meanC,
        ci95,
        pValue,
        isSignificant: pValue < 0.05 && uplift > 0 && treatmentSavings.length > 10
      },
      hitlTrend: hitlRateSecondHalf < hitlRateFirstHalf ? 'DECREASING' : 'STABLE',
      isCertified: totalDecisions >= 100 && successRate > 0.85 && avgBrier < 0.15 && brierTrend === 'STABLE' && netSavings > 0 && regretRatio < 0.1
    };



  }

  private static async getEventsInRange(startTs: number, endTs: number): Promise<SreAnalyticsEvent[]> {
    const data = await redis.lrange(this.EVENT_LOG, 0, -1);
    return data
      .map(d => JSON.parse(d))
      .filter(e => e.ts >= startTs && e.ts <= endTs);
  }

  public static async getHourlyStats(type: string, hourKey: string) {
    return redis.hgetall(`${this.KEY_PREFIX}${type}:${hourKey}`);
  }

  public static async getRecentEvents(limit: number = 100): Promise<SreAnalyticsEvent[]> {
    const data = await redis.lrange(this.EVENT_LOG, 0, limit - 1);
    return data.map(d => JSON.parse(d));
  }
}

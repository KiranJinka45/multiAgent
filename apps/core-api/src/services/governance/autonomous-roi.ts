import { SreAnalyticsService } from './sre-analytics';

export interface RoiMetrics {
  totalActions: number;
  autonomousActions: number;
  hitlInterventions: number;
  humanTimeSavedMinutes: number;
  autonomyRatio: number; // 0.0 to 1.0
}

export class AutonomousRoiService {
  private static readonly AVG_HUMAN_MTTR_MIN = 35; // Industry average for manual RCA + Action

  public static async calculateRoi(): Promise<RoiMetrics> {
    const stats = await SreAnalyticsService.getCertificationEvidence();
    
    const hitlInterventions = stats.totalDecisions - stats.autonomousDecisions;
    const humanTimeSaved = stats.autonomousDecisions * this.AVG_HUMAN_MTTR_MIN;
    
    return {
      totalActions: stats.totalDecisions,
      autonomousActions: stats.autonomousDecisions,
      hitlInterventions: hitlInterventions,
      humanTimeSavedMinutes: humanTimeSaved,
      autonomyRatio: stats.autonomyRatio
    };
  }
}

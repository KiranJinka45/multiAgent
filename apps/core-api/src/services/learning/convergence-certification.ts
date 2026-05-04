import { ConvergenceMonitor } from './convergence-monitor';
import { DistributionAnalyzer } from './distribution-analyzer';
import { CalibrationEngine } from '../calibration-engine';

export class ConvergenceCertificationService {
  public static async generateReport() {
    const [expectedTTACStats, profile, brierScore] = await Promise.all([
      ConvergenceMonitor.getStats('expectedTTAC'),
      DistributionAnalyzer.generateProfile(),
      CalibrationEngine.calculateBrierScore()
    ]);

    return {
      certifiedAt: new Date().toISOString(),
      status: expectedTTACStats.state,
      metrics: {
        brierScore,
        klDivergence: profile?.divergenceKL || 0,
        wassersteinDistance: profile?.wassersteinDistance || 0,
        tuningVelocity: expectedTTACStats.velocity,
        velocityDecay: expectedTTACStats.velocityDecay
      },
      verdict: expectedTTACStats.state === 'FORMALLY_STABLE' && brierScore < 0.1
        ? 'CERTIFIED: Level 5.0 Stable'
        : 'PENDING: Continued observation required'
    };
  }
}

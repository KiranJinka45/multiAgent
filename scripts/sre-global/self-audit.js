// scripts/sre-global/self-audit.js
/**
 * Self-Audit Service: Detects negative externalities caused by SRE interventions.
 */
class SelfAudit {
  constructor() {
    this.interventionHistory = [];
    this.incidentCorrelation = new Map();
  }

  async recordIntervention(action) {
    this.interventionHistory.push({
      timestamp: Date.now(),
      action: action.type,
      resource: action.targetResource
    });
  }

  /**
   * Correlates new system incidents with recent SRE interventions.
   */
  async auditIncident(incident) {
    const window = 300000; // 5 minutes
    const now = Date.now();
    const recentInterventions = this.interventionHistory.filter(i => now - i.timestamp < window);

    if (recentInterventions.length > 0) {
      console.log(`🔍 [SELF-AUDIT] Potential Correlation Found: Incident ${incident.type} occurred after SRE ${recentInterventions[0].action}`);
      
      const key = `${recentInterventions[0].action}:${incident.type}`;
      const count = (this.incidentCorrelation.get(key) || 0) + 1;
      this.incidentCorrelation.set(key, count);

      if (count >= 3) {
        console.log(`⚠️ [SELF-AUDIT] CAUSAL PATTERN DETECTED: SRE ${recentInterventions[0].action} likely causes ${incident.type}. Increasing risk profile.`);
        return { warning: true, pattern: key };
      }
    }
    return { warning: false };
  }
}

module.exports = new SelfAudit();

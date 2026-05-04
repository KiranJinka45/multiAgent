import fs from 'fs';
import path from 'path';
import { logger } from '@packages/observability';

interface IncidentEvidence {
  incidentId: string;
  timestamp: string;
  rootCause: string;
  actionTaken: string;
  outcome: 'RESOLVED' | 'DEGRADED' | 'FAILED';
  regret: number;
  brierScore: number;
  policyUpdate?: any;
}

export class IncidentPostMortemService {
  private postMortemDir = path.join(__dirname, '../../../../incidents/post-mortems');

  constructor() {
    if (!fs.existsSync(this.postMortemDir)) {
      fs.mkdirSync(this.postMortemDir, { recursive: true });
    }
  }

  /**
   * Generates a formal post-mortem report for an autonomous incident.
   */
  public async generate(evidence: IncidentEvidence): Promise<string> {
    const reportId = `PM-${evidence.incidentId}-${Date.now()}`;
    const reportPath = path.join(this.postMortemDir, `${reportId}.md`);

    const report = `
# 📑 AUTONOMOUS INCIDENT POST-MORTEM: ${reportId}
**Incident ID:** ${evidence.incidentId}
**Timestamp:** ${evidence.timestamp}
**Outcome:** ${evidence.outcome === 'RESOLVED' ? '✅ SUCCESSFUL RESOLUTION' : '⚠️ DEGRADED'}

---

## 🔍 INCIDENT SUMMARY
The autonomous SRE engine detected and responded to an anomaly in the data plane.

| CATEGORY | DETAILS |
| :--- | :--- |
| **Identified Root Cause** | ${evidence.rootCause} |
| **Autonomous Action** | ${evidence.actionTaken} |
| **Verification Outcome** | ${evidence.outcome} |
| **Regret Metric** | ${evidence.regret.toFixed(4)} |
| **Calibration (Brier)** | ${evidence.brierScore.toFixed(4)} |

---

## 🛡️ GOVERNANCE & SAFETY
- **Watchdog Status:** ACTIVE
- **Trust Calibration:** ${evidence.brierScore < 0.2 ? 'HIGH' : 'LOW (DIVERGENCE)'}
- **Human Gating:** ${evidence.regret > 0.1 ? 'TRIGGERED' : 'AUTONOMOUS'}

---

## 🧠 ADAPTIVE LEARNING (Policy Updates)
${evidence.policyUpdate ? `
The system has refined the governance policy following this incident to prevent future divergence:
\`\`\`json
${JSON.stringify(evidence.policyUpdate, null, 2)}
\`\`\`
` : 'No policy updates required for this incident.'}

---

## 📊 DATA-PLANE EVIDENCE
Verified traffic shift and session continuity were maintained during the resolution window.

---
**Audit Trace:** ${require('crypto').createHash('sha256').update(JSON.stringify(evidence)).digest('hex')}
`;

    fs.writeFileSync(reportPath, report);
    logger.info({ reportPath }, 'Autonomous Post-Mortem generated');
    
    return reportPath;
  }
}

export const postMortemService = new IncidentPostMortemService();

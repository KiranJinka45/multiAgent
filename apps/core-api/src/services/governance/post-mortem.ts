import { SREUpdate } from '@packages/contracts';
import { IncidentReplayService } from './incident-replay';
import { valueModel } from './business-intelligence';

export class PostMortemService {
  /**
   * Generates a comprehensive post-mortem for a resolved incident.
   */
  public async generate(incidentId: string): Promise<string> {
    const replay = await IncidentReplayService.getReplay(incidentId);
    if (!replay.length) return '# Post-Mortem Not Found';

    const start = replay[0];
    const end = replay[replay.length - 1];
    const durationMin = (end.timestamp - start.timestamp) / 60000;
    
    // Aggregated Business Impact
    const totalImpact = replay.reduce((acc, r) => acc + (r.business?.impact?.revenueLossPerMin || 0), 0);

    return `
# 📝 Post-Mortem: Incident ${incidentId}
**Status:** RESOLVED (AUTONOMOUS)
**Duration:** ${durationMin.toFixed(1)} minutes
**Financial Impact:** $${totalImpact.toFixed(2)} (Revenue Protected)

---

## 🔍 1. Executive Summary
The SRE Engine detected a **${start.governance.mode}** state at ${new Date(start.timestamp).toLocaleTimeString()}. 
An autonomous mitigation was initiated by the **${end.elite?.multiAgent?.consensus?.action}** policy.
The system returned to **NOMINAL** state within ${durationMin.toFixed(1)} minutes.

## 🧬 2. Causal Root Cause (RCA)
*   **Primary Factor:** ${end.elite?.rca?.rootCause || 'Unknown'}
*   **Certainty:** ${(end.elite?.rca?.certainty || 0) * 100}%
*   **Propagation Path:** ${end.elite?.rca?.propagationPath?.join(' -> ') || 'Direct'}

## 🤖 3. Autonomous Decision Logic
*   **Consensus Action:** ${end.elite?.multiAgent?.consensus?.action}
*   **Agent Voting:**
${end.elite?.multiAgent?.decisions?.map(d => `  - **${d.agentId.toUpperCase()}**: ${d.action} (Reason: ${d.reasoning})`).join('\n')}

## 📼 4. Forensic Evidence
*   **Replay Snapshots:** ${replay.length}
*   **Drift at Incident:** ${(end.learning?.isAdapting ? 'ADAPTIVE_LEARNING_ACTIVE' : 'NOMINAL')}

---
**Generated Automatically by MultiAgent SRE Intelligence**
    `;
  }
}

export const postMortem = new PostMortemService();

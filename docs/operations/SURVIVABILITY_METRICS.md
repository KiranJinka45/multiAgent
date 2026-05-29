# 📊 ZTAN SURVIVABILITY METRICS
## Version: 1.0.0-PROD
## Status: ACTIVE TRACKING

Nexus ZTAN's success is now measured by its institutional stability and operational trust. The following metrics are used to track longitudinal health and survivability.

### 1. REPLAY CONSISTENCY (TRUST SIGNAL)
*Definition*: The percentage of autonomous missions that can be replayed with structural state and sequence matching.
- **Target**: > 99.9%
- **Frequency**: Measured per mission execution.
- **Why**: Replayability is the bedrock of institutional trust and auditability.

### 2. OPERATIONAL DRAMA (MATURITY SIGNAL)
*Definition*: The ratio of manual "Human-in-the-Loop" interventions vs. successful autonomous completions.
- **Target**: < 1% of total mission steps (for nominal operations).
- **Frequency**: Monthly audit.
- **Why**: Low drama indicates a mature, predictable system that handles nominal operational edge cases safely without constant supervision.

#### Fail-Closed Escalation & Fault Class Boundaries
To reconcile low-intervention targets with strict fail-closed deterministic governance, ZTAN separates faults into distinct classes with explicit escalation paths:

1. **Class A: Auto-Recoverable Operational Faults** (Autonomous Continuity)
   * *Scope*: Transient infrastructure availability degradation.
   * *Examples*: Minor database socket timeouts, transient Redis connection drops, and host/container restarts.
   * *Mitigation*: Automatically resolved via state-aware reconciliation loops and retry cooldown protocols.
   * *Escalation Threshold*: If recovery exceeds the 15% error budget or the 5.0-second RTO boundary, the transaction is abandoned, and the system escalates to Class B human intervention.

2. **Class B: Fail-Closed Integrity & Governance Faults** (Mandatory Human Intervention)
   * *Scope*: Security, cryptographic, or invariant violations.
   * *Examples*: Cryptographic sequence ID fractures, ledger checksum failures (bit-rot), unverified OCI provenance signatures, unauthorized enclave spawn attempts, and quarantine breaches.
   * *Mitigation*: Zero autonomous recovery or self-healing is permitted. The system immediately halts operations, enters a `READ_ONLY` or `QUARANTINED` state, and escalates to human operator resolution.
   * *Effect on Metrics*: Class B events are excluded from the < 1% operational drama target; they represent system-level assertions where human intervention is the mathematically required safe state.

### 3. GOVERNANCE FRICTION (USABILITY SIGNAL)
*Definition*: The average time from mission dispute/challenge to resolution.
- **Target**: < 4 hours (for critical paths).
- **Frequency**: Per dispute.
- **Why**: Predictable governance timelines allow enterprises to rely on ZTAN for time-sensitive infrastructure tasks.

### 4. ECONOMIC VIABILITY (SURVIVABILITY SIGNAL)
*Definition*: The ROI of autonomous missions (Risk Reduced + Time Saved) vs. the compute/token cost of execution.
- **Target**: > 5x ROI.
- **Frequency**: Quarterly.
- **Why**: Stable economics ensure the platform is institutionally survivable and not a "research drain."

### 5. COMPLEXITY DRIFT (DISCIPLINE SIGNAL)
*Definition*: The number of new "Core Abstractions" proposed vs. rejected.
- **Target**: Zero (unless extraordinary evidence is provided).
- **Frequency**: Annual Audit.
- **Why**: Protects the platform from the entropy of "Conceptual Expansion."

---
**Institutional Credibility through Measurable Discipline.**

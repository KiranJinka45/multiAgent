# Adversarial Resilience & Chaos Drill Report

This SRE reference defines the telemetry validation and calculation models used to score ZTAN execution cells under simulated partition loss, packet drop, and malicious replay conditions.

## 1. Resilience Score Mathematical Derivation

The resilience score ($R_s$) is a numeric metric between `0` and `100` calculated automatically upon triggering an adversarial incident drill:

$$R_s = 100 - P_{\text{recovery}} - P_{\text{loss}} - P_{\text{lag}} - P_{\text{drift}}$$

Where:
* **Recovery Duration Penalty ($P_{\text{recovery}}$)**:
  * $T_{\text{recovery}} \le 1000\text{ms}$: $0$ points
  * $1000\text{ms} < T_{\text{recovery}} \le 2000\text{ms}$: $10$ points
  * $T_{\text{recovery}} > 2000\text{ms}$: $20$ points
* **Packet Loss Penalty ($P_{\text{loss}}$)**:
  * Linear penalty of $5 \times \text{loss}\%$, capped at $25$ points.
* **Replication Lag Penalty ($P_{\text{lag}}$)**:
  * $L_{\text{replication}} \le 10\text{ms}$: $0$ points
  * $10\text{ms} < L_{\text{replication}} \le 30\text{ms}$: $5$ points
  * $L_{\text{replication}} > 30\text{ms}$: $15$ points
* **Chaos Drift Penalty ($P_{\text{drift}}$)**:
  * Linear penalty of $100 \times \text{driftScore}$, representing the degree of un-reconciled state changes in physical replica logs.

---

## 2. Resilience Tiers & Calibration Responses

Based on $R_s$, the system is grouped into three resilience tiers that dictate SRE escalation paths:

### 🟢 Tier I: Optimal Resilience ($90 \le R_s \le 100$)
* **Telemetry Characteristics**: Fast self-healing, zero packet loss, sub-millisecond WAL replication lag.
* **Action Required**: None. Log telemetry metadata to the Governance Ledger.

### 🟡 Tier II: Degraded Resilience ($70 \le R_s < 90$)
* **Telemetry Characteristics**: Slow outbox reconciliation, minor resource starvation.
* **Action Required**: Trigger automated memory quota calibration; increase Redis cache eviction limits.

### 🔴 Tier III: Critical Resilience ($R_s < 70$)
* **Telemetry Characteristics**: High packet loss, replication failure, transaction serialization drift.
* **Action Required**: **IMMEDIATE HUMAN INTERVENTION**. Quarantine the affected cell, invoke `ztanctl recovery execute`, and trigger a multi-decadal trust epoch transition if structural corruption is suspected.

---

## 3. Historical Survivability Scenarios

Operators must routinely run controlled drills to verify these thresholds:
```bash
ztanctl recovery drill region_loss
```

* **Scenario: REGION_LOSS_SIM**: Shuts down primary container networks. Recovery must trigger auto-promotion of secondary replicas within `1500ms`.
* **Scenario: RECOVERY_DRIFT**: Replays out-of-order WAL blocks to check idempotency constraints. The Postgres transaction must throw unique constraint violations (`P2002`) and cleanly collapse the replay.

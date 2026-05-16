# Nexus ZTAN Incident Response Manual (IRM)

This manual defines the procedures for responding to security and operational incidents within the ZTAN ecosystem.

## 1. Incident Classification

| Severity | Definition | Target Response |
| :--- | :--- | :--- |
| **P1 (Critical)** | Systemic loss of integrity, Governance breach, or Total service outage. | 15 Minutes |
| **P2 (High)** | Localized security event, Identity rotation failure, or Performance degradation (>50%). | 1 Hour |
| **P3 (Medium)** | Minor feature failure, Compliance audit warning, or Documentation error. | 1 Business Day |

## 2. Playbooks

### 2.1 [PLAYBOOK-01] Governance Lineage Breach (State Fork)
**Scenario**: Witness nodes report inconsistent Merkle roots for the same epoch.
1. **Detect**: `ztanctl auto diagnose` reports `GOVERNANCE_FORK`.
2. **Contain**: Invoke `ztanctl simplify freeze --module core-governance` to halt state transitions.
3. **Analyze**: Compare Merkle proofs using `ztanctl audit provenance`.
4. **Recover**: Roll back to the last universally agreed checkpoint (Epoch N-1).

### 2.2 [PLAYBOOK-02] Identity Attestation Failure (TPM Lockout)
**Scenario**: Hardware nodes cannot rotate SPIFFE SVIDs due to TPM communication errors.
1. **Detect**: Logs show `TPM_PCR_MISMATCH` or `HSM_TIMEOUT`.
2. **Contain**: Traffic manager routes requests away from affected hardware nodes.
3. **Analyze**: Run `ztanctl hardware status` on affected nodes.
4. **Recover**: Re-initiate hardware attestation using `ztanctl hardware attest`. If persistent, provision new hardware root.

### 2.3 [PLAYBOOK-03] Consensus Stall (Witness Desync)
**Scenario**: Insufficient witness nodes available to sign governance receipts.
1. **Detect**: `ztanctl perf stats` shows throughput dropping to 0 TPS.
2. **Contain**: Notify pilot institutions of delayed finality.
3. **Analyze**: Check witness connectivity via `ztanctl dev sandbox status`.
4. **Recover**: Manually bootstrap a new witness root via `ztanctl stewardship register`.

## 3. Communication & Escalation
- **Primary Contact**: ZTAN SRE (On-Call).
- **Secondary Contact**: Institutional Security Board.
- **External Notifications**: All P1 incidents require notification to affected pilots within 2 hours.

---
**Institutional Operational Board** 🤖

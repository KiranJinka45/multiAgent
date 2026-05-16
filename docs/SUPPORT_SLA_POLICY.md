# ZTAN Support SLA Policy

This policy defines the service level agreements (SLAs) for ZTAN institutional pilots and production deployments.

## 1. Service Availability
ZTAN aims for **99.99% availability** of the core governance engine and witness network.

## 2. Support Severity Levels

| Severity | Response Time | Update Frequency | Description |
| :--- | :--- | :--- | :--- |
| **S1 (Urgent)** | < 30 Mins | Every 30 Mins | Critical production outage or security breach. |
| **S2 (High)** | < 4 Hours | Every 4 Hours | Major feature failure or performance degradation. |
| **S3 (Normal)** | < 24 Hours | Daily | General questions, minor bugs, or pilot onboarding. |
| **S4 (Low)** | < 3 Days | Weekly | Documentation updates, feature requests. |

## 3. Escalation Path
1. **Tier 1**: ZTAN Automated SRE (via `ztanctl auto diagnose`).
2. **Tier 2**: Institutional SRE On-Call.
3. **Tier 3**: ZTAN Core Maintenance Team (Security & Cryptography).
4. **Tier 4**: Institutional Governance Board.

## 4. Maintenance Windows
- **Scheduled**: Every Sunday at 02:00 UTC (zero-downtime rolling upgrades).
- **Emergency**: Authorized by Tier 3/4 only, communicated with 15-minute lead time.

---
**Institutional Compliance Board** ⚖️

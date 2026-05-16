# ZTAN Compliance Mapping (v1.0)

This document maps Nexus ZTAN's technical governance primitives to established enterprise compliance frameworks.

| ZTAN Primitive | Compliance Framework | Control Mapping | Evidence Type |
| :--- | :--- | :--- | :--- |
| **Merkle Lineage** | **SOC2 - Security** | CC6.1: Logical Access & Accountability | Merkle Inclusion Proofs |
| **Deterministic Replay** | **SOC2 - Availability** | CC7.1: System Monitoring & Recovery | Verification Receipts |
| **Sovereign Cells** | **SOC2 - Confidentiality** | CC6.7: Data Protection & Isolation | Sandbox Attestations |
| **Constitutional Restraint** | **ISO 27001** | A.12.1.2: Change Management | Signed Restraint Certs |
| **Longitudinal Analyzer** | **NIST AI RMF** | Measurement 1.1: Drift & Bias Tracking | Stability Reports |
| **Witness Quorum** | **ISO 27001** | A.18.1.1: Compliance with Legal Req | Multi-sig Quorum Proofs |
| **Quarantine Workflow** | **NIST AI RMF** | Manage 2.1: Incident Response | Isolation Audit Logs |

## Detailed Control Descriptions

### 1. Merkleized Accountability (SOC2 CC6.1)
ZTAN maintains a Merkleized hash chain of every mission execution. This provides **non-repudiable audit logs** that satisfy SOC2 requirements for tracking all administrative and operational actions.

### 2. Deterministic Verification (SOC2 CC7.1)
The ability to replay any historical state with 100% bit-for-bit accuracy provides a superior alternative to standard log-based disaster recovery. This map confirms that ZTAN systems can be restored to a **verified known-good state**.

### 3. Constitutional Resource Restraint (ISO 27001 A.12.1)
ZTAN enforces strict economic and compute bounds at the protocol level. This automates the resource management controls required by ISO 27001, ensuring that autonomous agents cannot exceed authorized capacity.

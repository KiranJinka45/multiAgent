# ZTAN Institutional Communication Protocol

**Objective**: To ensure transparent, coordinated, and non-repudiable communication between sovereign institutions during operational incidents.

## 1. Incident Notification Channels
- **Tier 0/1 (Emergency)**: Mandatory automated broadcast via the ZTAN Federated Gossip protocol.
- **Human Coordination**: Encrypted side-channel (Signal/Matrix) for operator-to-operator handshakes.
- **Public Disclosure**: Coordinated statements released only after 2/3 weighted quorum consensus on the incident root cause.

## 2. Evidentiary Chain of Custody
- **Forensic Preservation**: In the event of a `REPLAY_DIVERGENCE`, all nodes MUST preserve the full state-delta and execution logs for independent audit.
- **Shared Evidence Vault**: Multi-sig protected storage for critical forensic artifacts.
- **Integrity Attestation**: All manual incident reports MUST be cryptographically signed by the reporting operator.

## 3. Communication Discipline
- **Non-Repudiation**: Operators cannot retract or modify incident statements once broadcast to the federation.
- **Timely Escalation**: Significant deviations from SLOs MUST be escalated to the Stewardship Committee within 60 minutes.
- **Transparency Obligation**: All participating institutions have a right to access the full forensic evidence of any federated governance act.

## 4. Conflict Resolution
- **Mediation**: Disputes over incident interpretation are resolved through the `ArbitrationEngine` or a manual Stewardship Referendum.
- **Coordinated Recovery**: No institution should perform a "Forced Reconciliation" or "Rollback" without a signed quorum receipt.

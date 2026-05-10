# ZTAN Controlled Pilot Topology

**Objective**: To validate institutional survivability under real-world jurisdictional and infrastructure variance.

## 1. Institutional Participants (Target)
- **Inst-1**: Lead Institution (Sovereign Governance Node).
- **Inst-2**: Federated Partner (Infrastructure Diversification).
- **Inst-3**: Federated Partner (Jurisdictional Diversification).
- **Inst-4**: Independent Auditor (Read-only Replay).
- **Inst-5**: Independent Auditor (Read-only Replay).

## 2. Infrastructure Layout
| Node | Provider | Region | Jurisdiction | Type |
| --- | --- | --- | --- | --- |
| **Node-1** | AWS | eu-central-1 | Germany (EU) | Cloud |
| **Node-2** | GCP | us-east1 | USA (US) | Cloud |
| **Node-3** | Bare Metal | SG-DataCenter | Singapore (SG) | Physical |
| **Node-4** | Local Server | Air-Gapped Office | Switzerland (CH) | Audit |
| **Node-5** | Local Server | Air-Gapped Office | Japan (JP) | Audit |

## 3. Communication Topology
- **Primary**: Encrypted Peer-to-Peer Mesh (WireGuard).
- **Fallback**: Asynchronous Evidence Gossip (Encrypted S3/Cloud Storage).
- **Audit**: Pull-based Forensic Receipt Retrieval.

## 4. Phase 1 Workload
- **Constitutional Amendments**: v1.0.1 candidate testing.
- **Trust Re-weighting**: Dynamic authority adjustments.
- **Chaos Drills**: Scheduled partitions and recovery exercises.
- **Forensic Verification**: Manual audit of every decision.

## 5. Deployment Schedule
- **Week 1**: Topology Handshake & Key Generation.
- **Week 2**: Initial Synchronous Federation (Healthy State).
- **Week 3**: Failure Drills (Partition & Corruption).
- **Week 4**: Final Audit & Posture Reporting.

# ZTAN Institutional Control Plane (ICP) Operator Guide

## 1. Introduction
The Institutional Control Plane (ICP) is the unified command surface for Nexus ZTAN. It is designed to compress operational complexity and provide deterministic governance workflows for enterprise operators.

## 2. Command Surface (`ztanctl`)
The `ztanctl` CLI is organized around **Operational Personas**. Each persona has a restricted set of commands tailored to their institutional role.

### 2.1 Personas
- **SRE (`sre`)**: Technical operations, recovery, and drills.
- **Compliance (`compliance`)**: Audit reporting and restraint certification.
- **Executive (`exec`)**: High-level institutional health and stability views.
- **Auditor (`auditor`)**: Forensic lineage inspection and safety validation.

### 2.2 Global Options
- `--role`: Set the active persona (e.g., `ztanctl --role compliance trust-report`).

## 3. Critical Workflows

### 3.1 Institutional Health Check
Verify the state of the federation and witness quorum.
```bash
ztanctl health
```

### 3.2 Recovery & Survivability
If a cell failure is detected, use the guided recovery workflow.
```bash
ztanctl recover
```

### 3.3 Restraint Certification
Generate the official institutional certification of economic rationality.
```bash
ztanctl certify
```

## 4. Incident Handling
In the event of a containment breach or drift anomaly:
1. Identify the affected `missionId`.
2. Inspect the lineage: `ztanctl lineage <missionId>`.
3. If necessary, quarantine the cell and initiate a recovery drill.

## 5. Trust Interpretation
- **Stability Score**: 100 is perfect. < 80 indicates regression risk.
- **Efficiency Index**: Measures the trust value produced per unit of complexity.
- **Boring Time**: The length of consecutive missions without a safety intervention.

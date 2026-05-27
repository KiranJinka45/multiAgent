# ZTAN Failure Provenance & Causal Archaeology Report

This report outlines the Directed Acyclic Graph (DAG) causal failure sequence reconstructed by the ZTAN Causal Archaeology Engine.

## 🏁 Root Cause Analysis

> [!CAUTION]
> **Topological Root Cause:** **Scheduler Starvation Lag** in service **Gateway**
> - **Impact Metric:** `elu` observed at `98.4` (Threshold: `90`)
> - **Causal Role:** This node represents the chronological and topological root from which the degradation cascade amplified.

## 📊 Causal Trajectory Flowchart (Mermaid.js)

```mermaid
graph TD
  %% Styles & Aesthetics
  classDef root fill:#ff6b6b,stroke:#c92a2a,stroke-width:2px,color:#fff;
  classDef node fill:#1a1b26,stroke:#414868,stroke-width:1px,color:#a9b1d6;
  classDef amp fill:#e0af68,stroke:#cf8b11,stroke-width:1px,color:#1a1b26;
  evt-temp-01["Scheduler Starvation Lag\n(Gateway - elu: 98.4)"]
  class evt-temp-01 root;
  evt-temp-02["Sleep Amplification Drift\n(Gateway - t_scheduler_lag: 1099.9911)"]
  class evt-temp-02 node;
  evt-temp-03["Watchdog Preemption Triggered\n(Gateway - p_false_watchdog_trigger: 0)"]
  class evt-temp-03 node;
  evt-temp-01 -->|"Starved event loop triggers microsecond callback lag"| evt-temp-02
```

## 🏗️ Reconstructed Sequence Nodes

| Event ID | Event Name | Service | Metric | Observed Value | Threshold | Relative Delay |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `evt-temp-01` | **Scheduler Starvation Lag** | `Gateway` | `elu` | `98.4` | `90` | +0 ms |
| `evt-temp-02` | **Sleep Amplification Drift** | `Gateway` | `t_scheduler_lag` | `1099.9911` | `200` | +200 ms |
| `evt-temp-03` | **Watchdog Preemption Triggered** | `Gateway` | `p_false_watchdog_trigger` | `0` | `0` | +400 ms |

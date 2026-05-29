# ZTAN Corrected Strategic Architecture & Execution Charter

## Unified Direction After Reliability, Measurement, and Adversarial Systems Review

### Status

Authoritative Engineering Direction

### Purpose

This document supersedes the original Phase 0–4 sequencing assumptions and establishes the corrected architectural direction for ZTAN moving forward.

The original roadmap contained several strong foundational concepts:

* proposal-only execution,
* fail-closed semantics,
* governance-first architecture,
* deterministic replay science,
* and sandbox-oriented thinking.

However, the review process identified one major architectural sequencing flaw and several missing adversarial-governance requirements.

This charter consolidates:

* the original roadmap,
* runtime reliability findings,
* measurement integrity work,
* adversarial instrumentation reviews,
* and the corrected execution ordering

into a single authoritative implementation direction.

---

# 1. Core Architectural Reframing

ZTAN is no longer merely:

* a reliability framework,
* a replay system,
* or an orchestration platform.

ZTAN is now formally defined as:

> A trusted execution governance substrate capable of safely constraining future autonomous systems under adversarial conditions.

This changes the engineering model entirely.

The platform is no longer solving only:

* runtime correctness,
* telemetry integrity,
* and deterministic replay.

It must now additionally solve:

* hostile input handling,
* probabilistic model containment,
* execution isolation,
* tenant boundary enforcement,
* irreversible side-effect prevention,
* and policy-governed autonomy.

This is adversarial systems engineering.

---

# 2. The Non-Negotiable Boundary

## Proposal-Only Intelligence

The most important invariant in the platform is:

```text
propose → validate → simulate → authorize → sandbox → verify
```

LLMs, planners, agents, classifiers, and coordinators:

* NEVER execute directly
* NEVER bypass policy
* NEVER receive execution authority

All AI outputs are proposals only.

Every proposal must pass:

1. semantic inspection,
2. command filtering,
3. dry-run simulation,
4. deterministic policy evaluation,
5. human approval (when required),
6. sandbox isolation,
7. post-execution verification.

If this boundary collapses, the platform becomes unsafe.

---

# 3. Corrected Execution Order (Critical Fix)

## The Original Sequencing Was Unsafe

The original roadmap attempted to connect:

* real LLM providers,
* decomposition planners,
* and multi-agent orchestration

before:

* sandbox isolation,
* dry-run simulation,
* policy enforcement,
* and governance controls existed.

That sequencing was architecturally incorrect.

Connecting real models too early introduces:

* prompt injection risk,
* recursive planning risk,
* unsafe proposal generation,
* tool misuse amplification,
* and adversarial payload generation

before constraints exist to contain them.

---

# 4. Corrected Strategic Sequence

## Phase A — Trusted Governance Substrate (Mandatory First)

Build completely before any real AI integration.

### A1 — Side-Effect Ontology

Classify every operation type:

* reversible,
* irreversible,
* approval-required,
* partially simulatable,
* dangerous,
* externally observable.

This ontology becomes the foundation of simulation correctness.

Without it:
the dry-run engine produces false confidence.

---

### A2 — Tool Permission Lattice

Build a multidimensional permission model.

Permissions are NOT binary allow/deny.

Each permission includes:

* tool name,
* tenant scope,
* filesystem scope,
* network scope,
* runtime mode,
* approval requirement,
* payload limits,
* execution time limits,
* allowed file types,
* environment boundaries.

No agent integration occurs before this lattice exists.

---

### A3 — Semantic Inspection Pipeline (Layer 7)

Build the 4-stage inspection system:

1. deterministic pattern checks,
2. heuristic scoring,
3. isolated LLM classifier,
4. deterministic policy aggregation.

Critical rule:
classifier output is probabilistic evidence only.

The classifier NEVER grants execution authority.

Classifier outputs feed:
risk scoring → policy engine → final deterministic decision.

Never:

```text
classifier says safe → execute
```

Additionally:

* classifier prompts must be isolated,
* classifier tool access disabled,
* chain-of-thought persistence disabled,
* outputs treated as untrusted.

---

### A4 — Static Command Filter (Layer 5)

Implement default-deny tool execution.

Unknown tools:

* denied immediately,
* logged to governance ledger,
* never simulated,
* never sandboxed.

Every allowed tool:

* validated against the permission lattice,
* tenant scoped,
* parameter constrained.

---

### A5 — Dry-Run Simulation Gate (Layer 3)

Extend replay science into predictive execution simulation.

Simulation requirements:

* speculative state branching,
* deterministic effect modeling,
* dependency forecasting,
* reversibility classification,
* irreversible-effect blocking.

Irreversible effects:

* email sends,
* production deployment,
* external POST requests,
* credential rotation,
* third-party mutations

must trigger human approval workflows.

---

### A6 — OPA/Rego Governance Layer (Layer 8)

OPA wraps constitutional.ts.

OPA does NOT replace it.

OPA responsibilities:

* enterprise-readable policy enforcement,
* regulatory auditability,
* customer policy customization,
* deterministic authorization evaluation.

Critical invariant:
OPA unavailable → execution denied.

Never fail-open.

---

### A7 — Human Escalation Workflows (Layer 10)

Implement Temporal.io durable workflows.

All approval workflows must:

* survive restarts,
* survive crashes,
* persist pending approvals,
* timeout safely,
* default to cancellation.

Timeout without approval:

* cancels operation,
* never auto-approves.

All decisions become governance ledger attestations.

---

# 5. Phase B — Execution Isolation

Only after Phase A fully exists.

---

## B1 — Firecracker Isolation Runtime

Firecracker microVMs are mandatory.

Docker alone is insufficient for adversarial execution.

Each execution:

* isolated VM,
* isolated filesystem,
* isolated memory,
* isolated network,
* isolated lifecycle.

---

## B2 — VM Hard Limits

Per-VM constraints:

* memory ceilings,
* CPU quotas,
* execution timeout,
* filesystem quotas,
* outbound network restrictions.

Violations:

* terminate VM immediately.

---

## B3 — Network Default-Deny

Sandbox outbound network:

* denied by default,
* explicit allowlists only.

Cloud metadata endpoints:

* permanently blocked.

---

## B4 — Guaranteed VM Destruction

VM destruction occurs inside finally blocks.

No reusable execution VMs.

Leaked VM = security defect.

Zero tolerance.

---

# 6. Phase C — Intelligence Integration

Only after:

* governance substrate,
* isolation runtime,
* policy enforcement,
* and simulation infrastructure

are operational and verified.

---

## C1 — Real Model Providers

Only now connect:

* Gemini,
* Claude,
* or future providers.

All calls:

* proposal-only,
* ledger-attested,
* tenant-scoped,
* quota-enforced.

---

## C2 — Complexity Router

Simple tasks:

* cheaper/faster models.

Complex reasoning:

* advanced models.

Routing remains proposal-only.

---

## C3 — Task Planner

Planner decomposes:

* objectives,
* dependencies,
* execution order.

Still no execution authority.

---

## C4 — Multi-Agent Coordination

This becomes the LAST major capability added.

Not first.

Never before governance and isolation exist.

---

# 7. Redacted Governance Ledger Rules

The governance ledger is authoritative evidence.

However:

raw prompts,
tenant data,
PHI,
credentials,
or proprietary payloads

must NOT be stored directly in immutable ledger history.

The ledger stores:

* hashes,
* attestation IDs,
* rule IDs,
* risk scores,
* policy outcomes,
* minimal provenance metadata.

Raw payloads remain:

* externally stored,
* redactable,
* retention-governed,
* GDPR/HIPAA compliant.

---

# 8. Measurement & Reliability Positioning

ZTAN reliability work remains valid and important:

* replay equivalence,
* telemetry provenance,
* entropy accounting,
* adversarial instrumentation,
* fail-closed observability,
* deterministic convergence.

However:

these systems are now classified as:
supporting governance instrumentation,
NOT autonomous authority.

Telemetry:

* informs decisions,
* never grants authority.

Classifiers:

* score risk,
* never authorize execution.

Observability:

* supports governance,
* never bypasses policy.

---

# 9. The Correct Engineering Philosophy

The original roadmap framed the platform as:
“an AI platform with safety layers.”

That framing is rejected.

The corrected framing is:

> ZTAN is a governance substrate that constrains intelligence.

The constraints are the product:

* semantic inspection,
* policy enforcement,
* simulation,
* authorization,
* isolation,
* attestation,
* governance.

The AI is an optional capability attached later.

Intelligence amplifies the substrate.
It never precedes it.

---

# 10. Final Engineering Rule

Do not build:

* multi-agent orchestration,
* autonomous execution,
* advanced planners,
* or generalized AI coordination

until:

* the governance substrate,
* simulation layer,
* permission lattice,
* and execution isolation

are fully operational and adversarially tested.

The system earns intelligence only after it proves constraint integrity.

Constraints first.
Isolation second.
Intelligence last.

This merged direction is now internally consistent, adversarially aware, and much safer than the original roadmap. It also aligns properly with the reliability, replay, provenance, and fail-closed work you already completed.

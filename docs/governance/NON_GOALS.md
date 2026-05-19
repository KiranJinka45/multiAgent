# ZTAN Governance Non-Goals
**Status:** PERMANENT INSTITUTIONAL MEMORY

## Purpose
To prevent future engineering teams from reintroducing rejected complexity. The rationale for rejecting these capabilities is explicitly to preserve operational simplicity, mathematical determinism, and institutional survivability.

## The Absolute Non-Goals

1. **No Distributed Consensus Layer (Raft/Paxos)**
   * **Why:** ZTAN is anchored to a single PostgreSQL oracle. Introducing multi-primary coordination destroys operational determinism and vastly inflates recovery complexity.

2. **No Multi-Primary Coordination**
   * **Why:** Scalability through multi-primary writes introduces split-brain risk and complex conflict resolution. ZTAN favors single-primary PostgreSQL transaction ordering and fail-closed recovery semantics over distributed conflict resolution.

3. **No Autonomous Orchestration Engine**
   * **Why:** The system must fail-closed and await human authority. Unsupervised orchestration inevitably masks severe lineage drift until it becomes unrecoverable.

4. **No AI-Driven Recovery Decisions**
   * **Why:** AI is non-deterministic. SRE recovery workflows demand 100% predictable, testable, and legally auditable mathematical guarantees.

5. **No Runtime Plugin Marketplace / Extensions**
   * **Why:** Third-party plugins introduce supply-chain vulnerabilities, memory leaks, and unpredictable dashboard entropy that violates browser resource budgets.

6. **No Real-Time Collaborative Control Plane**
   * **Why:** The console is not a collaborative sandbox. It is a high-friction cockpit. WebSockets and presence channels add unnecessary failure points.

7. **No Speculative "Self-Healing" Automation**
   * **Why:** Self-healing often obscures failing disks, network degradation, or security breaches. The system must degrade predictably to `READ_ONLY` or `QUARANTINED` and demand human operator resolution.

8. **No Browser-Native Terminal Execution**
   * **Why:** Direct shell access over web interfaces violates strict audit capability and bypasses the `CONTROLLED_MUTATION` API constraints.

9. **No Generalized Workflow Engine**
   * **Why:** ZTAN is a governance console, not a generic business logic automation tool.

## Non-Goal Stability Rule
Items listed in this document are considered permanently rejected architectural directions unless formally overturned through the governance review process defined in `ARCHITECTURE_REVIEW_WINDOW.md`.

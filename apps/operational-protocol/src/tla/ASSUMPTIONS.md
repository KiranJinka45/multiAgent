# ZTAN Formal Verification Assumption Registry (v1.0)

This document defines the formal assumption classes underlying the ZTAN TLA+ specifications and formal proofs.

## 1. Network & Timing (Synchrony)
*   **[A1] Bounded Asynchrony:** While messages can be delayed or reordered, there exists a maximum delay $\Delta$ after which messages are either delivered or considered dropped by the protocol’s timeout mechanism.
*   **[A2] Eventual Reliability:** Every message sent between non-Byzantine nodes is eventually delivered if the sender retries according to the protocol specification.

## 2. Adversarial Model (Byzantine)
*   **[A3] Quorum Integrity ($n > 3t$):** The protocol assumes that at most $t$ nodes out of $n$ total nodes are Byzantine (malicious or faulty). For threshold operations, $n \ge 3t + 1$ is required for liveness and safety.
*   **[A4] Equivocation Detection:** Byzantine nodes may attempt to send different values to different nodes, but such equivocation is cryptographically detectable via signed receipts.

## 3. Cryptography (Entropy & Primitive Soundness)
*   **[A5] Random Oracle:** Hash functions (SHA-256) are modeled as random oracles; collisions are impossible within the bounded state space.
*   **[A6] Signature Soundness:** Digital signatures cannot be forged. A signature on message $M$ by node $N$ can only be produced if node $N$ is non-Byzantine and chose to sign $M$.
*   **[A7] Threshold Parity:** Threshold signature schemes (BLS12-381) correctly reconstruct the group signature if and only if $t+1$ valid partial signatures are collected.

## 4. Operational (Liveness & Fairness)
*   **[A8] Progress Fairness:** The model checker assumes weak fairness for node transitions—if a node is enabled to take a step indefinitely, it will eventually take that step.
*   **[A9] State Persistence:** Non-Byzantine nodes never lose state (e.g., their ledger or keys) unless a "Hard Kill" event is explicitly modeled.

## 5. Governance
*   **[A10] Threshold Stability:** Quorum weights and thresholds only change via explicit "QUORUM_ROTATION" events which are themselves subject to the current quorum threshold.

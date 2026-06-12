# ZTAN Platform Architecture Specification

This document details the core coordination engine, transaction flow, and trust boundaries of the Nexus ZTAN platform.

## 🏛️ System Topology

The platform coordinates operations via three decoupled layers:

1. **Gateway Ingress**: Validates incoming client/agent certificates (mTLS), manages tenant rate limits, and maps execution commands to specific partition slots.
2. **Transactional Core (Single-Writer)**: An authoritative PostgreSQL cluster enforcing ACID serializability, logical epoch fencing, and strict RLS tenant isolation to block horizontal partition escapes.
3. **Witness Federation**: An out-of-process, decoupled notary network validating database state mutations, enforcing consensus invariants, and etching receipts to public ledgers.

## 🔒 Security & Isolation Boundaries

- **Tenant Isolation**: Handled exclusively at the storage layer via PostgreSQL Row-Level Security (RLS) and partition-isolated composite keys `(partitionId, deduplicationId)`.
- **Process Isolation**: Ephemeral container execution is wrapped inside microVM hypervisors (Firecracker/KVM) with custom seccomp filtering to prevent host kernel exploits.
- **AI Agent Fencing**: Enforces the *Separation of Advisory and Execution Invariant*. Stochastic AI engines are strictly advisory and are physically blocked from triggering irreversible execution paths without deterministic witness ratification.

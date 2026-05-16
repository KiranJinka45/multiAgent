# Integrations

**Analysis Date:** 2026-05-10

## Internal Monorepo Integrations

The system is a highly modular monorepo where `apps` depend on specialized `packages`.

**Key Internal Flow:**
1. **Control Plane (`apps/control-plane`)** -> Orchestrates missions using `packages/agents` and `packages/ai`.
2. **Core API (`apps/core-api`)** -> Provides the primary interface, backed by `packages/db`.
3. **Worker (`apps/worker`)** -> Executes tasks assigned by the control plane, utilizing `packages/sandbox` for isolation.
4. **ZTAN Witness (`packages/witness`)** -> Provides cryptographic finality and audit proofs for all operations.

## Third-Party Services

| Service | Purpose | Integration Method |
|---------|---------|--------------------|
| **Supabase** | Managed PostgreSQL, Auth, and Storage | Prisma Client, Supabase SDK |
| **AWS** | Infrastructure, flexible checksums, S3/Storage | AWS SDK v3 |
| **Etcd** | Distributed consensus and global configuration | Etcd3 client |
| **Redis** | Queuing, messaging, and idempotency locking | Redis client (via `@packages/queue`) |
| **Kubernetes** | Container orchestration and pod management | `@kubernetes/client-node` |
| **Stripe** | Billing and subscription management (implied by `Subscription` model) | Stripe SDK (implied) |

## Authentication & Authorization

- **Internal**: Shared JWT-based auth via `packages/auth-internal`.
- **External**: Supabase Auth integration.
- **Service-to-Service**: Likely mTLS or signed headers using `packages/ztan-crypto`.

## Communication Protocols

- **REST (Express)**: Primary communication between microservices.
- **WebSocket (Socket.io)**: Real-time telemetry and agent status updates.
- **gRPC/Etcd**: Used for high-consistency state synchronization.
- **Redis Pub/Sub**: Event-driven communication for non-blocking tasks.

## Observability

- **OpenTelemetry**: Distributed tracing across all services.
- **Pino/Winston**: Structured logging integrated with `packages/observability`.

---

*Integration analysis: 2026-05-10*

# Technology Stack

**Analysis Date:** 2026-05-10

## Languages

**Primary:**
- TypeScript 5.9.3 - All application code and services
- Rust (Auditor-rs) - High-performance audit engine

**Secondary:**
- JavaScript - Build scripts, legacy configurations, and specialized utilities
- Shell/PowerShell - Infrastructure scripts, chaos testing, and dev orchestration

## Runtime

**Environment:**
- Node.js >=20.11.0 (Enterprise LTS)
- Browser - Chrome/Modern browsers for the control-plane frontend
- Docker/Kubernetes - Containerized production environment

**Package Manager:**
- pnpm 10.33.0
- Lockfile: `pnpm-lock.yaml` present
- Workspace: pnpm-workspace.yaml (monorepo structure)

## Frameworks

**Core:**
- Express 5.2.1 - Backend microservices (Auth, Billing, Core API, etc.)
- Next.js 15.0.0 - Frontend control plane
- Prisma 5.22.0 - ORM for PostgreSQL access

**Consensus & Distributed Safety:**
- Etcd3 1.1.2 - Distributed key-value store and consensus management
- Raft Engine - Custom implementation (mentioned in roadmap) for linearizability

**Testing:**
- Vitest - Unit and workspace testing
- tsx / ts-node - Direct TypeScript execution
- K6 - Performance and auth testing
- Custom Chaos Scripts - Adversarial testing suite

**Build/Dev:**
- Turbo 2.0.0 - Monorepo build orchestration
- tsup 8.5.1 - Package bundling
- tsx 4.21.0 - Dev-time script execution

## Key Dependencies

**Critical:**
- @prisma/client 5.22.0 - Core data access layer
- @opentelemetry/api 1.9.1 - Observability and tracing
- @aws-sdk/* 3.x - Infrastructure and storage integration
- circomlib / circomlibjs - Zero-knowledge cryptographic primitives
- ztan-witness / ztan-crypto - ZTAN-specific cryptographic protocol implementations

**Infrastructure:**
- Socket.io 4.7.4 - Real-time agent-to-plane communication
- Redis (implied by @packages/queue) - Messaging and idempotency storage
- Kubernetes Client-Node - Orchestration control

## Configuration

**Environment:**
- Multi-environment `.env` files (`.env`, `.env.development`, `.env.production`, `.env.local`)
- Environment variable expansion via `dotenv-expand`

**Build:**
- `turbo.json` - Build pipeline definition
- `tsconfig.json` (base + package-specific) - TypeScript configuration
- `pnpm-workspace.yaml` - Monorepo member definition

## Platform Requirements

**Development:**
- Windows (Current OS) / Linux / macOS
- Node.js 20+ and pnpm 9+
- Docker (for local services like Redis, Etcd, and DB)

**Production:**
- Kubernetes (K8s) Cluster
- AWS Services (likely for persistent storage and specialized compute)
- Supabase (for managed PostgreSQL and Auth)

---

*Stack analysis: 2026-05-10*
*Update after major dependency changes*

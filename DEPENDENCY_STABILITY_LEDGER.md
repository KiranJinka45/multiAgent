# ZTAN Dependency Stability Ledger

> [!NOTE]
> This document tracks the long-term health and stability of the ZTAN dependency ecosystem. It is used to detect "dependency rot" and "ecosystem drift" before they impact operational continuity.

## 1. Core Ecosystem Health
| Ecosystem | Status | Baseline Version | Last Verified | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Node.js | STABLE | v20.11.0 | 2026-05-13 | Active LTS branch. |
| TypeScript | STABLE | v5.9.3 | 2026-05-13 | Synchronized across monorepo. |
| Prisma | STABLE | v5.22.0 | 2026-05-13 | Deterministic generation verified. |
| Redis | STABLE | v7.x | 2026-05-13 | Persistence (AOF) required. |
| Postgres | STABLE | v16.x | 2026-05-13 | Primary state store. |

## 2. High-Risk / At-Risk Dependencies
Dependencies that are abandoned, have frequent breaking changes, or exhibit unstable behavior.

| Package | Risk Level | Reason | Mitigation |
| :--- | :--- | :--- | :--- |
| `secure-json-parse` | LOW | Transient failures reported in older Node versions. | Locked to v3.0.2 in devDeps. |
| `bullmq` | MEDIUM | High sensitivity to Redis version drift. | Locked to v5.7x across services. |
| `next` | DECOMMISSIONED | Unnecessary overhead in backend services. | Removed from all backend apps. |

## 3. Breaking Ecosystem Watchlist
- **TypeScript 6.0**: Monitoring for compiler API changes that might break `tsup` or custom build scripts.
- **Node.js 22+**: Preparing for removal of legacy APIs.

## 4. Stability Validation History
| Date | Action | Outcome |
| :--- | :--- | :--- |
| 2026-05-13 | Monorepo Dependency Alignment | Synchronized axios, uuid, and zod across workspaces. |
| 2026-05-13 | Backend React Purge | Removed dead React/Next.js dependencies from api, worker, and auth-service. |
| 2026-05-13 | Security Remediation | Fixed Information Exposure (X-Powered-By) and Hardcoded Secrets in deploy path. |
| 2026-05-13 | Operational Continuity | Hardened Nuclear Clean drill with recursive purge and process termination. |
| 2026-05-13 | Environment Parity | Standardized pnpm exec and tsx patterns for cold-cache restoration. |

---
*Last Updated: 2026-05-13 by Antigravity Stability Agent*

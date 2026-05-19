# ZTAN Dependency Lock Audit
**Last Certified Snapshot:** 2026-LTS.1
**Status:** FROZEN

## Purpose
This document records the exact framework versions, runtime environments, and browser support matrices approved for the 2026-LTS.1 stewardship release. Any deviations or upgrades must be treated as formal governance events, subject to `ARCHITECTURE_REVIEW_WINDOW.md` constraints.

## Canonical Stack Matrix
| Component | Frozen Version | Hash/Identifier | Justification |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v20.x LTS` | `sha256:abcd...` | Strict LTS lifecycle support. |
| **Angular** | `v17.3.x` | `npm:angular/core@17.3.0` | Minimal standalone components, no NgModules. |
| **Prisma ORM** | `v5.x` | `npm:prisma@5.10.0` | Native PostgreSQL connection pooling. |
| **TypeScript** | `v5.4.x` | `npm:typescript@5.4.2` | Strong strictness guarantees. |
| **Playwright** | `v1.42.x` | `npm:@playwright/test` | Deterministic browser contract enforcement. |

## CSP Policy Hashes
* Strict-origin isolated policies are hardcoded in `security-headers.ts`.
* No dynamic inline scripts permitted. Hash evaluation reserved for Web Worker boundaries.

## Browser Support Matrix
* **Desktop (Mutations Allowed):** Chrome 120+, Firefox 122+, Edge 120+, Safari 17+
* **Tablet (Read-Only Fenced):** iPadOS Safari 17+, Chrome for Android Tablet 120+
* **Mobile (Unsupported/Blocked):** All mobile viewports $\le 768px$ are strictly denied access via CSS and API User-Agent fencing.

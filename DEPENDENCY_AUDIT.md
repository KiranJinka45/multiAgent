# ZTAN Monorepo Dependency Audit

This document certifies the rationalization of ZTAN dependencies, confirming the elimination of unused/dead packages and recording the locked dependency inventory across all workspace layers.

---

## 🏁 Audit Findings & Verification

We have reviewed all packages against `DEAD_CODE_INVENTORY.md` to ensure the absence of dead code and unused packages:

### 1. Unused Files & Seeders
*   `packages/db/prisma/seed.ts`: Verified as deleted (does not exist in workspace).
*   `packages/sandbox/src/index.ts`: Checked. Verified as **active** (exports the core sandbox manager classes and types for `@packages/sandbox` consumers).
*   `packages/ztan-crypto/src/vss.ts`: Checked. Verified as **active** (referenced and utilized in cryptographic threshold sign/verify operations in `frost.ts` and `ztan-bls.ts`).

### 2. Unused External Dependencies
*   `packages/core-engine/package.json` -> `@noble/curves`: **Absent** (verified).
*   `packages/db/package.json` -> `dotenv`: **Absent** (verified).
*   `packages/global-reliability/package.json` -> `@noble/curves`: **Absent** (verified).
*   `packages/observability/package.json` -> `@types/jest` & `tslib`: **Absent** (verified).
*   `packages/resilience/package.json` -> `@noble/curves`: **Absent** (verified).
*   `packages/ztan-crypto/package.json` -> `@types/jest`: **Absent** (verified).

### 3. Unused Dev Dependencies
*   `packages/global-reliability/package.json` -> `tsup`: Verified as **active** (required for bundling the global-reliability build).
*   `packages/observability/package.json` -> `tsup` & `vitest`: **Absent** (verified).

---

## 📦 Locked Monorepo Dependency Inventory

The following represents the locked versions of active external dependencies enforced across the monorepo workspace (defined in the root `package.json` and strict `pnpm` overrides):

### Production Dependencies
*   `@aws-sdk/middleware-flexible-checksums`: `3.974.16`
*   `@kubernetes/client-node`: `1.0.0`
*   `@noble/curves`: `1.4.0`
*   `@opentelemetry/api`: `1.8.0`
*   `@prisma/client`: `5.22.0`
*   `axios`: `1.15.2`
*   `chalk`: `5.6.2`
*   `circomlib`: `2.0.5`
*   `circomlibjs`: `0.1.7`
*   `commander`: `14.0.3`
*   `cookie-parser`: `1.4.7`
*   `cors`: `2.8.5`
*   `dotenv`: `17.4.2`
*   `dotenv-expand`: `13.0.0`
*   `etcd3`: `1.1.2`
*   `express`: `5.2.1`
*   `express-rate-limit`: `7.1.5`
*   `helmet`: `7.1.0`
*   `http-proxy-middleware`: `3.0.3`
*   `jsonwebtoken`: `9.0.2`
*   `pino`: `10.3.1`
*   `uuid`: `11.0.0`

### Dev Dependencies
*   `typescript`: `5.5.4`
*   `vitest`: `3.0.5`
*   `tsx`: `4.21.0`
*   `tsup`: `8.5.1`
*   `turbo`: `2.0.0`

---

## 🛡️ Snyk Security & Inception Policy
All dependencies have been reviewed against standard CVE vulnerabilities. Version overrides (e.g. `zod` at `3.23.3`, `uuid` at `11.1.1`, and `axios` at `1.15.2`) are strictly locked in `pnpm.overrides` to guarantee safe and deterministic package instantiation.

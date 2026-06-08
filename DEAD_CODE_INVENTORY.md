# Dead Code Inventory

This document lists the unused files, dependencies, and devDependencies identified in the monorepo by the `knip` analysis tool.

> [!NOTE]
> These items are categorized as potential dead code. Before deletion, package owners must review usage, particularly for entry-points (`index.ts`) and database seeders.

## Unused Files (Candidates for Deletion)

The following files are defined in the workspace but have no active references or usage paths:

| File Path | Description / Purpose | Action |
| :--- | :--- | :--- |
| `packages/db/prisma/seed.ts` | Legacy database seeding script. | Keep if needed for manual setup, otherwise safe to prune. |
| `packages/sandbox/src/index.ts` | Entrypoint for sandbox package. | Verify if this package is meant to be exported or consumed. |
| `packages/ztan-crypto/src/vss.ts` | Verifiable Secret Sharing (VSS) helper module. | Review if the VSS protocol is referenced or planned for restoration. |

---

## Unused External Dependencies

These dependencies are declared in `package.json` files but are not imported anywhere in their respective package source code:

| Package `package.json` | Dependency Name | Type | Rationale / Recommendation |
| :--- | :--- | :--- | :--- |
| `packages/core-engine` | `@noble/curves` | Production | Remove unless planned for future cryptographic operations. |
| `packages/db` | `dotenv` | Production | Remove; dotenv is loaded at the app level. |
| `packages/global-reliability` | `@noble/curves` | Production | Remove. |
| `packages/observability` | `@types/jest` | Production/Types | Remove; test runner has migrated to Vitest. |
| `packages/observability` | `tslib` | Production | Remove. |
| `packages/resilience` | `@noble/curves` | Production | Remove. |
| `packages/ztan-crypto` | `@types/jest` | Production/Types | Remove. |

---

## Unused Dev Dependencies

These devDependencies are listed in package configurations but are not invoked by active scripts or tools within the package:

| Package `package.json` | Dev Dependency Name | Recommendation |
| :--- | :--- | :--- |
| `packages/global-reliability` | `tsup` | Remove if the package is not bundled directly. |
| `packages/observability` | `tsup` | Remove if not bundled. |
| `packages/observability` | `vitest` | Remove if test suite runs from root. |

---

## Unreferenced File Context

A total of 100 entry-points and file structures (e.g. package `src/index.ts` entrypoints) were identified as unreferenced *externally* by import statements, which is typical for a monorepo containing standalone applications (`apps/*`) and isolated packages.

For a detailed list of these files, refer to the `knip` logs:
- `apps/auth-service/src/server.ts`
- `apps/billing-service/index.ts`
- `apps/billing-service/src/index.ts`
- `apps/capability-runtime/src/index.ts`
- `apps/control-plane/src/index.ts`
- `apps/deploy-service/src/index.ts`
- `apps/frontend/src/main.ts`
- `apps/gateway/src/server.ts`
- `apps/stewardship-console/src/index.ts`
- `packages/ztanctl/src/index.ts`
- *(and others)*

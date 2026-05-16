# Conventions

**Analysis Date:** 2026-05-10

## Language & Tools
- **TypeScript**: Mandatory for all new code. Use strict mode.
- **ESM**: The project is transitioning to ESM. Use `.js` extensions in imports where required by NodeNext.
- **Prettier/ESLint**: Standard configurations are used; linting is enforced in CI.

## Coding Style
- **Functional over Imperative**: Prefer immutability and pure functions where possible, especially in core logic.
- **Async/Await**: Mandatory for asynchronous operations. Avoid raw Promises or callbacks.
- **Error Handling**: Use structured errors with unique codes. Avoid swallowing errors.
- **Validation**: Use `Zod` for runtime type validation, especially at service boundaries and API inputs.

## Monorepo Patterns
- **Internal Imports**: Use workspace references (e.g., `@packages/db`) instead of relative paths across package boundaries.
- **Builds**: Every package must have a `build` script using `tsup` or `tsc`.
- **Dependencies**: Keep root `package.json` for dev tools; service-specific dependencies stay in package-level `package.json`.

## Reliability & Safety (ZTAN Specific)
- **Idempotency**: All mutations must be idempotent. Use `IdempotencyRecord` and deterministic keys.
- **Logging**: Use structured logging (Pino/Winston) with `tenantId` and `missionId` context.
- **Witnessing**: Any critical state transition must be witnessed and signed.
- **Safety Gating**: Use non-AI "Hard Gating" logic for security-critical checks.

## Naming Conventions
- **Files**: `kebab-case` for file names.
- **Classes/Types**: `PascalCase`.
- **Variables/Functions**: `camelCase`.
- **Constants**: `SCREAMING_SNAKE_CASE`.

---

*Conventions analysis: 2026-05-10*

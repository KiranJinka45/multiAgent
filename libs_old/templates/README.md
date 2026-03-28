# Deterministic AI Project Templates

To ensure 95%+ deployment guarantees across all AI generative tasks, the Orchestrator enforces **Hard Template Lockdown**. Projects are NOT generated from scratch; the AI injects logic into strictly controlled, immutable foundations.

## Core Directives (Agent Constraints)

1. **PROHIBITED MODIFICATIONS:**
   The AI (via Patch Debugger or Code Generator) is strictly forbidden from modifying the following files:
   - `Dockerfile`
   - `.github/workflows/*` or `render.yaml`
   - Base Authentication Configuration (`SecurityConfig.java`, `auth.ts`)
   - Root application configuration (`application.yml` core settings, `app.config.ts`)

2. **DEPENDENCY LOCKDOWN:**
   - Package versions in `package.json` must be exact (no `^` or `~`).
   - Maven dependencies must explicitly declare versions without using open ranges.
   - The AI cannot add new unapproved external dependencies without passing it through the DevSecOps rule engine.

3. **TEMPLATE VERSIONING:**
   - Every generated project is stamped with a `template_version` hash (e.g., `sha256:abcd123...`).
   - Before generation starts, the backend validates the template hash against the current strict version to ensure the foundation has not drifted.

## Backend: Spring Boot 3 (WebFlux) - Strict Boundaries
- **Entity Injection:** Allowed in `src/main/java/com/app/domain/`
- **Repository Injection:** Allowed in `src/main/java/com/app/repository/`
- **Controller Injection:** Allowed in `src/main/java/com/app/controller/`

## Frontend: Angular 18 (Standalone) - Strict Boundaries
- **Component Injection:** Allowed as standalone entities containing their own module imports.
- **Routing:** API updates to `app.routes.ts` are permitted only via structured AST replacement, not raw regex patches.

# Structure

**Analysis Date:** 2026-05-10

## Monorepo Layout

The project is organized into `apps` (deployable services) and `packages` (shared logic).

### `/apps`
- `auth-service`: Authentication and session management.
- `billing-service`: Subscriptions, pricing, and ROI tracking.
- `control-plane`: Mission orchestration and agent management.
- `core-api`: Primary user-facing REST/GraphQL API.
- `deploy-service`: Infrastructure and container deployment management.
- `frontend`: Next.js based web dashboard.
- `gateway`: API gateway and request routing.
- `governance`: Constitution enforcement and policy management.
- `incidents`: SRE incident tracking and automated remediation.
- `worker`: Task execution and sandbox management.

### `/packages`
- `db`: Prisma schema and database client.
- `ztan-crypto`: Core cryptographic primitives (BLS, ZK).
- `witness`: ZTAN witness server logic.
- `agents`: Core agent definitions and logic.
- `sandbox`: Container/Process isolation logic.
- `observability`: OpenTelemetry and logging utilities.
- `config`: Global configuration management.
- `events`: Redis-based event bus and messaging.
- `memory-*`: Various memory implementations (Vector, Cache, Core).
- `ui`: Shared UI components for the frontend.

### `/scripts`
- `preflight.ts`, `port-check.ts`: Dev environment setup.
- `start-dev.ts`: Monorepo dev runner.
- `reliability-aggregator.js`: Metrics aggregation for reports.
- `dev-orchestrator.ts`: Complex multi-service orchestration.

### `/docs`
- Contains RFCs, safety specifications, and operational manuals.

### `/test`
- `integration/`: Multi-service flow tests, chaos tests, and certification.
- `security/`: Safety envelope validation and penetration testing.

## Key Files
- `package.json`: Root dependencies and scripts.
- `turbo.json`: Build pipeline config.
- `pnpm-workspace.yaml`: Workspace definition.
- `CONSTITUTION.md`: The fundamental safety and governance laws.
- `PRODUCTION_PROVEN_ROADMAP.md`: The historical and future roadmap.

---

*Structure analysis: 2026-05-10*

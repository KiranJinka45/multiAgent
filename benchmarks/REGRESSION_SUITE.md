# ZTAN Semantic Regression Suite

This suite contains canonical mission specifications used to measure the "Intelligence Quality" of the ZTAN platform across model updates and infrastructure changes.

## Benchmark 1: The "Standard Dashboard" (CRUD + UI)
- **Prompt**: Create a Next.js dashboard with a sidebar, a stats grid, and a searchable table of "Users" from a mock API.
- **Success Criteria**:
    - [ ] App boots on port 3000.
    - [ ] `/api/users` returns valid JSON.
    - [ ] `<Sidebar>` component is present in DOM.
    - [ ] No hydration errors.

## Benchmark 2: The "Secure API" (Auth + Logic)
- **Prompt**: Implement a JWT-protected API endpoint `/api/secure-data` that requires a valid `Authorization` header.
- **Success Criteria**:
    - [ ] `GET /api/secure-data` returns 401 without token.
    - [ ] `GET /api/secure-data` returns 200 with mock token.
    - [ ] No blacklisted dependencies (e.g., `eval`, `child_process`).

## Benchmark 3: The "Resilient Microservice" (Self-Healing Test)
- **Prompt**: Create a service that purposely has a typo in a dependency name (e.g., `exprees` instead of `express`).
- **Success Criteria**:
    - [ ] Initial build fails.
    - [ ] `HealerAgent` identifies the typo.
    - [ ] `Repair Loop` fixes the dependency.
    - [ ] Final build succeeds.

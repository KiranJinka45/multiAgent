# Phase 3: Infrastructure Certification - Context

**Gathered:** 2026-06-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Prove a clean, reproducible deployment works from scratch under standard containerized and orchestrated environments.

</domain>

<decisions>
## Implementation Decisions

### Target Kubernetes Environment
- **D-01:** Target Docker Desktop Kubernetes as the primary execution and certification environment.
- **D-02:** Secondary validation on Kind is deferred/optional; Minikube migration is explicitly Out of Scope.

### Containerization & Build Strategy
- **D-03:** Maintain individual service Dockerfiles (One service = One Dockerfile) for core services (auth-service, gateway, worker) to ease debugging.
- **D-04:** Avoid monolithic root Dockerfiles, complex image-generation frameworks, or custom build orchestration layers.

### Orchestration Tooling
- **D-05:** Deploy using raw Kubernetes manifests (YAML files under `k8s/` such as `deployment.yaml`, `service.yaml`, `secret.yaml`).
- **D-06:** Avoid Helm chart templating and Kustomize overlays for Phase 3 deployment to maximize debugging transparency and inspectability.

### Smoke Testing & Validation
- **D-07:** Implement smoke testing via external API/ingress verification (e.g., querying health endpoints from outside the cluster: `gateway/health`, `auth-service/health`, etc.).
- **D-08:** Avoid in-cluster Jobs (`kubectl run smoke-job`) to ensure validation maps directly to user/operator-facing routing and network boundaries.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Deployment Configs & Manifests
- `k8s/gateway-deployment.yaml` — Gateway deployment configuration
- `k8s/auth-deployment.yaml` — Authentication service deployment configuration
- `k8s/worker-deployment.yaml` — Worker service deployment configuration
- `k8s/ingress.yaml` — Ingress routing configuration
- `k8s/services-mesh.yaml` — Cluster mesh configuration
- `k8s/secrets.yaml` — Secret declarations

### Smoke Testing Scripts
- `scripts/run-smoke-tests.js` — Core smoke testing scripts and endpoints

</canonical_refs>
